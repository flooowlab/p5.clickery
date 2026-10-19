import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Settings, AudioManager, EventBus, parseRoom, Interactor, Inventory, StateStore,
} from '../../src/index.js';

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

// ---- a stand-in for the browser's AudioContext ----

class FakeParam {
  value = 1;
  calls = [];
  setValueAtTime(v, t) { this.value = v; this.calls.push(['set', v, t]); }
  linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); }
}
class FakeNode {
  connections = [];
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeSource extends FakeNode {
  started = null;
  stopped = null;
  start(t) { this.started = t; }
  stop(t) { this.stopped = t; }
}
class FakeContext {
  currentTime = 0;
  state = 'suspended';
  destination = new FakeNode();
  gains = [];
  sources = [];
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

const makeAudio = (settings = null) => {
  const context = new FakeContext();
  const loaded = [];
  const audio = new AudioManager({ context, settings, loadBuffer: async (url) => { loaded.push(url); return { url }; } });
  audio.register({ calm: 'calm.ogg', tense: 'tense.ogg', click: 'click.wav', alarm: 'alarm.wav' });
  return { audio, context, loaded };
};

describe('AudioManager', () => {
  it('loads each sound once and rejects unknown ids', async () => {
    const { audio, loaded } = makeAudio();
    await audio.loadAll();
    await audio.load('calm');
    assert.deepEqual(loaded.sort(), ['alarm.wav', 'calm.ogg', 'click.wav', 'tense.ogg']);
    await assert.rejects(audio.load('nope'), /unknown sound/);
  });

  it('routes through volume buses driven by the settings', () => {
    const settings = new Settings({ storage: memoryStorage() });
    settings.set('masterVolume', 0.5);
    settings.set('musicVolume', 0.4);
    const { audio, context } = makeAudio(settings);
    assert.equal(audio.master.gain.value, 0.5);
    assert.equal(audio.buses.music.gain.value, 0.4);
    assert.ok(audio.master.connections.includes(context.destination));
    assert.ok(audio.buses.sfx.connections.includes(audio.master));
    settings.set('sfxVolume', 0.1);
    settings.set('voiceVolume', 0);
    assert.equal(audio.buses.sfx.gain.value, 0.1);
    assert.equal(audio.buses.voice.gain.value, 0);
  });

  it('plays a sound effect on the sfx bus, with its own volume, and can stop it', async () => {
    const { audio, context } = makeAudio();
    await audio.loadAll();
    context.currentTime = 2;
    const handle = audio.playSfx('click', { volume: 0.5 });
    const source = context.sources.at(-1);
    assert.equal(source.started, 2);
    assert.equal(source.loop, false);
    const gain = source.connections[0];
    assert.equal(gain.gain.value, 0.5);
    assert.ok(gain.connections.includes(audio.buses.sfx));
    context.currentTime = 3;
    handle.stop();
    assert.equal(source.stopped, 3);
  });

  it('an unloaded sound returns null with one warning, not an exception', () => {
    const { audio } = makeAudio();
    const warn = console.warn;
    const warnings = [];
    console.warn = (m) => warnings.push(m);
    try {
      assert.equal(audio.playSfx('click'), null);
      assert.equal(audio.playSfx('click'), null);
      assert.equal(audio.playMusic('calm'), null);
    } finally { console.warn = warn; }
    assert.equal(warnings.length, 2, 'once per sound id');
  });

  it('an unknown sound id is silent with one warning, so a missing effect never breaks the game', async () => {
    const { audio } = makeAudio();
    await audio.loadAll();
    const warn = console.warn;
    const warnings = [];
    console.warn = (m) => warnings.push(m);
    try {
      assert.equal(audio.playSfx('typo'), null);
      assert.equal(audio.playSfx('typo'), null);
      assert.equal(audio.playMusic('typo'), null);
      const events = new EventBus();
      audio.attach(events, { sfx: { 'inventory:add': 'also-missing' } });
      events.emit('inventory:add', {});
      events.emit('dialogue:tag', { key: 'sfx', value: 'bell' });
    } finally { console.warn = warn; }
    assert.equal(warnings.length, 3, 'one warning per unknown id: typo, also-missing, bell');
    assert.match(warnings[0], /unknown sound "typo"/);
  });

  it('crossfades music: the old track ramps down and stops, the new one ramps up', async () => {
    const { audio, context } = makeAudio();
    await audio.loadAll();
    context.currentTime = 10;
    audio.playMusic('calm', { fadeMs: 2000 });
    const calm = context.sources.at(-1);
    assert.equal(calm.loop, true);
    assert.equal(audio.musicId, 'calm');
    const calmGain = calm.connections[0].gain;
    assert.deepEqual(calmGain.calls, [['set', 0, 10], ['ramp', 1, 12]]);

    context.currentTime = 20;
    audio.playMusic('tense', { fadeMs: 1000 });
    const tense = context.sources.at(-1);
    assert.equal(audio.musicId, 'tense');
    assert.equal(calm.stopped, 21, 'the old one stops when its fade ends');
    assert.deepEqual(calmGain.calls.slice(-3), [['cancel', 20], ['set', calmGain.value, 20], ['ramp', 0, 21]]);
    assert.deepEqual(tense.connections[0].gain.calls, [['set', 0, 20], ['ramp', 1, 21]]);
  });

  it('asking for the track already playing changes nothing; fade 0 is instant', async () => {
    const { audio, context } = makeAudio();
    await audio.loadAll();
    audio.playMusic('calm', { fadeMs: 0 });
    const before = context.sources.length;
    audio.playMusic('calm');
    assert.equal(context.sources.length, before);
    const gain = context.sources.at(-1).connections[0].gain;
    assert.deepEqual(gain.calls, [['set', 1, 0]]);
  });

  it('stopMusic fades out and leaves silence; the next track starts fresh', async () => {
    const { audio, context } = makeAudio();
    await audio.loadAll();
    audio.playMusic('calm', { fadeMs: 0 });
    const calm = context.sources.at(-1);
    context.currentTime = 5;
    audio.stopMusic(500);
    assert.equal(calm.stopped, 5.5);
    assert.equal(audio.musicId, null);
    audio.playMusic('calm', { fadeMs: 0 });
    assert.notEqual(context.sources.at(-1), calm, 'a new source, not the fading one');
  });

  it('unlock resumes a suspended context, once the player interacts', async () => {
    const { audio, context } = makeAudio();
    const listeners = {};
    const target = {
      addEventListener: (t, fn) => { listeners[t] = fn; },
      removeEventListener: (t) => { delete listeners[t]; },
    };
    audio.unlockOnGesture(target);
    assert.equal(context.state, 'suspended');
    listeners.pointerdown();
    await Promise.resolve();
    assert.equal(context.state, 'running');
    assert.deepEqual(Object.keys(listeners), [], 'listeners removed after the first gesture');
  });

  describe('attached to the game', () => {
    it('plays each room\'s music; omitted keeps it, null stops it', async () => {
      const { audio, context } = makeAudio();
      await audio.loadAll();
      const events = new EventBus();
      audio.attach(events, { fadeMs: 0 });
      const enter = (extra) => events.emit('room:enter', { room: parseRoom({ id: 'r', width: 10, height: 10, starts: { default: { x: 0, y: 0 } }, ...extra }) });
      enter({ music: 'calm' });
      assert.equal(audio.musicId, 'calm');
      enter({});
      assert.equal(audio.musicId, 'calm', 'no music field: keep playing');
      enter({ music: 'tense' });
      assert.equal(audio.musicId, 'tense');
      enter({ music: null });
      assert.equal(audio.musicId, null);
      assert.ok(context.sources.length >= 2);
    });

    it('sound effects follow events and dialogue sfx tags', async () => {
      const { audio, context } = makeAudio();
      await audio.loadAll();
      const events = new EventBus();
      const off = audio.attach(events, {
        sfx: {
          'inventory:add': 'click',
          action: (e) => (e.verb === 'look' ? null : { id: 'alarm', volume: 0.3 }),
        },
      });
      const count = () => context.sources.length;
      events.emit('inventory:add', { id: 'key' });
      assert.equal(count(), 1);
      events.emit('action', { verb: 'look' });
      assert.equal(count(), 1, 'the function returned null');
      events.emit('action', { verb: 'interact' });
      assert.equal(count(), 2);
      assert.equal(context.sources.at(-1).connections[0].gain.value, 0.3);
      events.emit('dialogue:tag', { key: 'sfx', value: 'alarm' });
      events.emit('dialogue:tag', { key: 'mood', value: 'grim' });
      assert.equal(count(), 3);
      off();
      events.emit('inventory:add', {});
      assert.equal(count(), 3);
    });
  });

  it('handlers can reach the audio through ctx.audio', () => {
    const { audio } = makeAudio();
    const interactor = new Interactor({
      hero: {}, state: new StateStore(), events: new EventBus(), audio,
      inventory: new Inventory({ state: new StateStore(), events: new EventBus() }),
    });
    assert.equal(interactor.context({ id: 'x' }, 'interact').audio, audio);
  });
});
