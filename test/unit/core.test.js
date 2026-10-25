import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EventBus, Scheduler, GameLoop, StateStore, createCore, I18n, Settings, bindTextSettings, SubtitleBar, Actor,
  serialize, deserialize, saveToSlot, loadFromSlot, deleteSlot, SAVE_VERSION,
} from '../../src/index.js';

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
};

describe('EventBus', () => {
  it('calls handlers with arguments, in order', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('x', (a) => seen.push(['a', a]));
    bus.on('x', (a) => seen.push(['b', a]));
    bus.emit('x', 1);
    assert.deepEqual(seen, [['a', 1], ['b', 1]]);
  });

  it('off and the returned unsubscribe remove handlers', () => {
    const bus = new EventBus();
    let n = 0;
    const h = () => n++;
    bus.on('x', h);
    bus.off('x', h);
    const unsub = bus.on('x', h);
    unsub();
    bus.emit('x');
    assert.equal(n, 0);
  });

  it('once fires a single time', () => {
    const bus = new EventBus();
    let n = 0;
    bus.once('x', () => n++);
    bus.emit('x');
    bus.emit('x');
    assert.equal(n, 1);
  });

  it('a throwing handler does not block the others', () => {
    const bus = new EventBus();
    let ran = false;
    bus.on('x', () => { throw new Error('boom'); });
    bus.on('x', () => { ran = true; });
    assert.throws(() => bus.emit('x'), /boom/);
    assert.ok(ran);
  });

  it('emit with no handlers is a no-op and rejects non-functions', () => {
    const bus = new EventBus();
    bus.emit('nothing');
    assert.throws(() => bus.on('x', 'nope'), TypeError);
  });
});

describe('Scheduler', () => {
  it('after fires once when enough time has passed', () => {
    const s = new Scheduler();
    let n = 0;
    s.after(100, () => n++);
    s.update(99);
    assert.equal(n, 0);
    s.update(1);
    s.update(500);
    assert.equal(n, 1);
    assert.equal(s.size, 0);
  });

  it('every repeats and catches up on large steps', () => {
    const s = new Scheduler();
    let n = 0;
    const t = s.every(10, () => n++);
    s.update(35);
    assert.equal(n, 3);
    t.cancel();
    s.update(100);
    assert.equal(n, 3);
  });

  it('wait resolves after game time passes', async () => {
    const s = new Scheduler();
    let done = false;
    const p = s.wait(50).then(() => { done = true; });
    s.update(49);
    await Promise.resolve();
    assert.equal(done, false);
    s.update(1);
    await p;
    assert.equal(done, true);
  });

  it('wait rejects on abort and drops its timer', async () => {
    const s = new Scheduler();
    const ctl = new AbortController();
    const p = s.wait(1000, ctl.signal);
    ctl.abort(new Error('skipped'));
    await assert.rejects(p, /skipped/);
    s.update(0);
    assert.equal(s.size, 0);
    await assert.rejects(s.wait(5, ctl.signal), /skipped/);
  });

  it('callbacks may schedule or cancel other timers', () => {
    const s = new Scheduler();
    const log = [];
    let b;
    s.after(10, () => { log.push('a'); b.cancel(); s.after(5, () => log.push('c')); });
    b = s.after(10, () => log.push('b'));
    s.update(10);
    s.update(5);
    assert.deepEqual(log, ['a', 'c']);
  });

  it('rejects bad delays and dt', () => {
    const s = new Scheduler();
    assert.throws(() => s.after(-1, () => {}), RangeError);
    assert.throws(() => s.after(NaN, () => {}), RangeError);
    assert.throws(() => s.every(0, () => {}), RangeError);
    assert.throws(() => s.update(-1), RangeError);
  });
});

describe('GameLoop', () => {
  it('computes dt, clamps it, and drives scheduler and update event', () => {
    const { loop, events, scheduler } = createCore({ maxDt: 50 });
    const dts = [];
    events.on('update', (dt) => dts.push(dt));
    let fired = false;
    scheduler.after(30, () => { fired = true; });
    assert.equal(loop.tick(1000), 0);
    assert.equal(loop.tick(1020), 20);
    assert.equal(fired, false);
    assert.equal(loop.tick(5000), 50);
    assert.ok(fired);
    assert.deepEqual(dts, [0, 20, 50]);
  });

  it('does not advance time while paused and does not jump on resume', () => {
    const { loop, scheduler } = createCore();
    let fired = false;
    scheduler.after(10, () => { fired = true; });
    loop.tick(0);
    loop.pause();
    assert.equal(loop.tick(5000), 0);
    assert.equal(fired, false);
    loop.resume();
    assert.equal(loop.tick(5016), 16);
    assert.ok(fired);
  });

  it('start and stop use the injected frame functions', () => {
    let pending = null;
    const cancelled = [];
    const loop = new GameLoop({
      scheduler: new Scheduler(),
      request: (fn) => { pending = fn; return 7; },
      cancel: (id) => cancelled.push(id),
    });
    loop.start();
    assert.ok(loop.running);
    loop.start();
    pending(0);
    pending(16);
    loop.stop();
    assert.deepEqual(cancelled, [7]);
    assert.equal(loop.running, false);
  });
});

describe('StateStore', () => {
  it('sets and gets nested paths with fallbacks', () => {
    const s = new StateStore();
    s.set('flags.doorOpen', true);
    s.set('rooms.cellar.lit', { on: false });
    assert.equal(s.get('flags.doorOpen'), true);
    assert.deepEqual(s.get('rooms.cellar'), { lit: { on: false } });
    assert.equal(s.get('flags.missing', 'dflt'), 'dflt');
    assert.equal(s.get('flags.doorOpen.deeper', 0), 0);
    assert.equal(s.get('currentRoom'), null);
  });

  it('copies values in and out, so callers cannot mutate state', () => {
    const s = new StateStore();
    const items = ['key'];
    s.set('inventory', items);
    items.push('hammer');
    s.get('inventory').push('rope');
    assert.deepEqual(s.get('inventory'), ['key']);
  });

  it('rejects values JSON cannot hold', () => {
    const s = new StateStore();
    assert.throws(() => s.set('vars.f', () => {}), TypeError);
    assert.throws(() => s.set('vars.u', undefined), TypeError);
    assert.throws(() => s.set('', 1), Error);
  });

  it('watch fires on change with new and old values, not on no-ops', () => {
    const s = new StateStore();
    const calls = [];
    s.watch('flags.a', (n, o, p) => calls.push([n, o, p]));
    s.set('flags.a', 1);
    s.set('flags.a', 1);
    s.set('flags.b', 2);
    s.set('flags.a', 2);
    assert.deepEqual(calls, [[1, undefined, 'flags.a'], [2, 1, 'flags.a']]);
  });

  it('watch on a parent sees child changes; unsubscribe stops it', () => {
    const s = new StateStore();
    let n = 0;
    const off = s.watch('flags', () => n++);
    s.set('flags.a', true);
    off();
    s.set('flags.b', true);
    assert.equal(n, 1);
  });

  it('toJSON/fromJSON round-trip, fill defaults, and notify watchers', () => {
    const a = new StateStore();
    a.set('flags.x', true);
    a.set('inventory', ['key']);
    a.set('currentRoom', 'hall');
    const b = new StateStore();
    let seen;
    b.watch('flags.x', (v) => { seen = v; });
    b.fromJSON(a.toJSON());
    assert.deepEqual(b.toJSON(), a.toJSON());
    assert.equal(seen, true);
    b.fromJSON({ vars: { n: 1 } });
    assert.deepEqual(b.toJSON(), { flags: {}, vars: { n: 1 }, inventory: [], rooms: {}, currentRoom: null });
    assert.throws(() => b.fromJSON(null), TypeError);
    assert.throws(() => b.fromJSON([]), TypeError);
  });
});

describe('save and load', () => {
  const filled = () => {
    const s = new StateStore();
    s.set('flags.doorOpen', true);
    s.set('vars.gold', 12);
    s.set('inventory', ['key', 'rope']);
    s.set('rooms.cellar.lit', true);
    s.set('currentRoom', 'cellar');
    return s;
  };

  it('state round-trips through a storage slot', () => {
    const storage = memoryStorage();
    const original = filled();
    saveToSlot(original, 'slot1', storage);
    const restored = new StateStore();
    assert.equal(loadFromSlot(restored, 'slot1', storage), true);
    assert.deepEqual(restored.toJSON(), original.toJSON());
  });

  it('state round-trips through the file text format', () => {
    const original = filled();
    const restored = new StateStore();
    const save = deserialize(restored, serialize(original, 1234));
    assert.deepEqual(restored.toJSON(), original.toJSON());
    assert.equal(save.savedAt, 1234);
    assert.equal(save.version, SAVE_VERSION);
  });

  it('an empty slot returns false and leaves state alone; delete empties a slot', () => {
    const storage = memoryStorage();
    const s = filled();
    assert.equal(loadFromSlot(s, 'none', storage), false);
    assert.equal(s.get('currentRoom'), 'cellar');
    saveToSlot(s, 'a', storage);
    deleteSlot('a', storage);
    assert.equal(loadFromSlot(s, 'a', storage), false);
  });

  it('bad or newer saves throw without changing state', () => {
    const s = filled();
    const before = s.toJSON();
    assert.throws(() => deserialize(s, 'not json'), /valid JSON/);
    assert.throws(() => deserialize(s, '{"version":1}'), /no state/);
    assert.throws(() => deserialize(s, JSON.stringify({ version: 99, state: {} })), /newer/);
    assert.deepEqual(s.toJSON(), before);
  });
});

describe('I18n', () => {
  it('falls back to the default language, then to [key], and fills placeholders', () => {
    const i = new I18n({ en: { hi: 'Hello {name}', bye: 'Bye' }, it: { hi: 'Ciao {name}' } }, 'it');
    assert.equal(i.t('hi', { name: 'Ada' }), 'Ciao Ada');
    assert.equal(i.t('bye'), 'Bye');
    assert.equal(i.t('nope'), '[nope]');
    assert.equal(i.t('hi'), 'Ciao {name}');
    assert.ok(i.has('bye') && !i.has('nope'));
    i.add('it', { nope: 'ora si' });
    assert.equal(i.t('nope'), 'ora si');
  });
});

describe('Settings', () => {
  it('has defaults, clamps numbers and validates types', () => {
    const s = new Settings({ storage: memoryStorage() });
    assert.equal(s.get('subtitles'), true);
    assert.equal(s.set('musicVolume', 5), 1);
    assert.equal(s.set('musicVolume', -1), 0);
    assert.equal(s.set('textSpeed', 100), 4);
    assert.throws(() => s.set('subtitles', 'yes'), TypeError);
    assert.throws(() => s.set('sfxVolume', NaN), TypeError);
    assert.throws(() => s.get('nope'), /unknown setting/);
    assert.throws(() => s.set('nope', 1), /unknown setting/);
  });

  it('tells listeners only about real changes, and they can unsubscribe', () => {
    const s = new Settings({ storage: memoryStorage() });
    const seen = [];
    const off = s.onChange((name, value) => seen.push([name, value]));
    s.set('textSpeed', 2);
    s.set('textSpeed', 2);
    off();
    s.set('textSpeed', 3);
    assert.deepEqual(seen, [['textSpeed', 2]]);
  });

  it('saves on change and loads in a new session, ignoring bad entries', () => {
    const storage = memoryStorage();
    const a = new Settings({ storage });
    a.set('masterVolume', 0.25);
    a.set('subtitles', false);
    const b = new Settings({ storage });
    assert.equal(b.load(), true);
    assert.deepEqual([b.get('masterVolume'), b.get('subtitles')], [0.25, false]);

    const messy = memoryStorage({ 'p5.clickery:settings': JSON.stringify({ musicVolume: 'loud', bogus: 1, sfxVolume: 0.1 }) });
    const c = new Settings({ storage: messy });
    assert.equal(c.load(), true);
    assert.equal(c.get('sfxVolume'), 0.1);
    assert.equal(c.get('musicVolume'), 0.7, 'the invalid value kept its default');
    assert.equal(new Settings({ storage: memoryStorage() }).load(), false);
    assert.equal(new Settings({ storage: memoryStorage({ 'p5.clickery:settings': '{oops' }) }).load(), false);
  });

  it('survives storage that throws, and reset restores defaults', () => {
    const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
    const s = new Settings({ storage: broken });
    s.set('textSpeed', 2);
    assert.equal(s.get('textSpeed'), 2);
    assert.equal(s.load(), false);
    s.reset();
    assert.equal(s.get('textSpeed'), 1);
  });

  it('bindTextSettings drives subtitles and actors now and later', () => {
    const s = new Settings({ storage: memoryStorage() });
    const bar = new SubtitleBar();
    const hero = new Actor({ id: 'hero' });
    s.set('textSpeed', 2);
    const off = bindTextSettings(s, { subtitles: bar, actors: [hero] });
    assert.deepEqual([bar.speed, bar.enabled, hero.textSpeed], [2, true, 2]);
    s.set('subtitles', false);
    s.set('textSpeed', 0.5);
    assert.deepEqual([bar.speed, bar.enabled, hero.textSpeed], [0.5, false, 0.5]);
    off();
    s.set('textSpeed', 3);
    assert.equal(bar.speed, 0.5);
  });
});
