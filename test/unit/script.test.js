import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCore, Actor, Navigator, SceneManager, HoverTracker, createHotspots, Inventory, Interactor,
  Cutscenes, Scripts, Fade, Scheduler, firstLook, firstUse, once, hitSkipButton, PointerController,
  InventoryBar, Camera,
} from '../../src/index.js';

const floor = { id: 'floor', points: [[0, 200], [640, 200], [640, 300], [0, 300]] };
const roomJson = (id) => ({
  id, width: 640, height: 360, starts: { default: { x: 40, y: 280 } }, walkable: [floor],
  hotspots: [{ id: 'door', provider: 'polygon', points: [[500, 100], [560, 100], [560, 200], [500, 200]], walkTo: { x: 530, y: 260, dir: 'up' } }],
});

function makeGame() {
  const core = createCore();
  const hero = new Actor({ id: 'hero', x: 40, y: 280, speed: 400, translate: (k) => k });
  const cutscenes = new Cutscenes({ events: core.events, scheduler: core.scheduler });
  const hover = new HoverTracker(core.events);
  const inventory = new Inventory({ state: core.state, events: core.events, items: { key: { name: 'k' } } });
  const interactor = new Interactor({ hero, state: core.state, events: core.events, inventory, hover, cutscenes });
  const errors = [];
  interactor.onError = (e) => errors.push(e);
  const scripts = new Scripts({ interactor });
  const scene = new SceneManager({
    ...core, scripts, viewWidth: 640, viewHeight: 360, fadeMs: 100,
    loadRoom: async (id) => roomJson(id),
  });
  cutscenes.add(hero, scene.fade);
  core.events.on('room:enter', ({ room }) => {
    hover.setHotspots(createHotspots(room));
    hero.navigator = Navigator.fromRoom(room);
    hero.teleport(40, 280);
  });
  const log = [];
  core.events.on('cutscene:start', () => log.push('start'));
  core.events.on('cutscene:end', (e) => log.push(e.skipped ? 'end(skipped)' : 'end'));
  const tick = (dt = 20) => { core.scheduler.update(dt); hero.update(dt); core.events.emit('update', dt); };
  const frame = async () => { await new Promise((r) => setImmediate(r)); tick(); };
  // Run frames until the promise settles; reports how many frames that took.
  const drive = async (promise, limit = 5000) => {
    let done = false;
    promise.then(() => { done = true; }, () => { done = true; });
    let frames = 0;
    for (; frames < limit && !done; frames++) await frame();
    if (!done) throw new Error('never settled');
    return { frames, value: await promise };
  };
  const untilActive = async () => { for (let i = 0; i < 500 && !cutscenes.active; i++) await frame(); };
  return { core, hero, cutscenes, hover, inventory, interactor, scripts, scene, log, tick, frame, drive, untilActive, errors };
}

// The opening: walk in, speak, the door opens, speak again.
const opening = (g) => async (cs) => {
  await g.hero.walkTo({ x: 300, y: 260 });
  await g.hero.say('intro.where');
  cs.label('door');
  g.core.state.set('rooms.hall.doorOpen', true);
  await cs.wait(500);
  await g.hero.say('intro.open');
  g.core.state.set('flags.introDone', true);
};

describe('opening sequence in cutscene mode', () => {
  it('plays out: input locked meanwhile, state changed, unlocked after', async () => {
    const g = makeGame();
    g.scripts.add('hall', { onEntered: () => g.cutscenes.run(opening(g)) });
    const done = g.scene.goTo('hall');
    let probe = null;
    const watcher = (async () => {
      await g.untilActive();
      probe = { locked: g.interactor.locked, clicked: await g.interactor.clickGround({ x: 100, y: 250 }) };
    })();
    const { frames } = await g.drive(done);
    await watcher;
    assert.deepEqual(probe, { locked: true, clicked: false }, 'clicks are ignored during the cutscene');
    assert.deepEqual([g.hero.x, g.hero.y], [300, 260]);
    assert.equal(g.core.state.get('rooms.hall.doorOpen'), true);
    assert.equal(g.core.state.get('flags.introDone'), true);
    assert.deepEqual(g.log, ['start', 'end']);
    assert.equal(g.cutscenes.active, false);
    assert.equal(g.interactor.locked, false);
    assert.ok(frames > 150, `played in real time (${frames} frames)`);
  });

  it('skipping ends in the same state, quickly', async () => {
    const g = makeGame();
    g.scripts.add('hall', { onEntered: () => g.cutscenes.run(opening(g)) });
    const done = g.scene.goTo('hall');
    await g.untilActive();
    for (let i = 0; i < 5; i++) await g.frame();
    assert.equal(g.cutscenes.skip(), true);
    const { frames } = await g.drive(done);
    assert.ok(frames < 10, `finished in ${frames} frames`);
    assert.deepEqual([g.hero.x, g.hero.y], [300, 260]);
    assert.equal(g.core.state.get('rooms.hall.doorOpen'), true);
    assert.equal(g.core.state.get('flags.introDone'), true);
    assert.deepEqual(g.log, ['start', 'end(skipped)']);
    assert.equal(g.hero.skipping, false);
    assert.equal(g.core.scheduler.skipping, false);
    assert.equal(g.hero.speech, null);
  });

  it('skip(label) fast-forwards to the label, then plays the rest', async () => {
    const g = makeGame();
    const heard = [];
    const say = g.hero.say.bind(g.hero);
    g.hero.say = (k, o) => { heard.push(k); return say(k, o); };
    const run = g.cutscenes.run(opening(g));
    for (let i = 0; i < 5; i++) await g.frame();
    g.cutscenes.skip('door');
    const { frames } = await g.drive(run);
    assert.equal(g.core.state.get('rooms.hall.doorOpen'), true);
    assert.deepEqual(heard.filter((k) => k !== 'intro.where'), ['intro.open'], 'the part after the label was spoken');
    assert.ok(frames > 25, `waited and spoke after the label (${frames} frames)`);
    assert.equal(g.core.state.get('flags.introDone'), true);
    assert.deepEqual(g.log, ['start', 'end(skipped)']);
  });

  it('skip does nothing outside a cutscene or when not skippable', async () => {
    const g = makeGame();
    assert.equal(g.cutscenes.skip(), false);
    const run = g.cutscenes.run(async () => { await g.core.scheduler.wait(200); }, { skippable: false });
    assert.equal(g.cutscenes.skip(), false);
    await g.drive(run);
    assert.deepEqual(g.log, ['start', 'end']);
  });

  it('cleans up when the script throws; nested runs share one cutscene', async () => {
    const g = makeGame();
    await assert.rejects(g.cutscenes.run(async () => { throw new Error('script bug'); }), /script bug/);
    assert.equal(g.cutscenes.active, false);
    assert.deepEqual(g.log, ['start', 'end']);
    g.log.length = 0;
    await g.cutscenes.run(async () => {
      await g.cutscenes.run(async () => {});
      assert.ok(g.cutscenes.active, 'still active after the nested one');
    });
    assert.deepEqual(g.log, ['start', 'end']);
  });

  it('starting a cutscene stops a walk in progress', async () => {
    const g = makeGame();
    const walk = g.hero.walkTo({ x: 600, y: 280 });
    const run = g.cutscenes.run(async () => {});
    assert.equal(await walk, false);
    await run;
  });
});

describe('fast-forward targets', () => {
  it('scheduler waits resolve at once while skipping, and pending ones settle', async () => {
    const s = new Scheduler();
    const pending = s.wait(10_000);
    s.setSkipping(true);
    await pending;
    await s.wait(10_000);
    assert.equal(s.size, 0);
    s.setSkipping(false);
    let done = false;
    s.wait(50).then(() => { done = true; });
    s.update(50);
    await Promise.resolve();
    assert.ok(done);
  });

  it('fade finishes at the target when skipped; new fades are instant', async () => {
    const f = new Fade();
    const p = f.out(1000);
    f.setSkipping(true);
    await p;
    assert.equal(f.alpha, 1);
    await f.in(1000);
    assert.equal(f.alpha, 0);
  });

  it('actor jumps to the end of a walk and drops lines while skipping', async () => {
    const a = new Actor({ id: 'a', x: 0, y: 0, speed: 10 });
    const walk = a.walkTo({ x: 100, y: 0, dir: 'up' });
    const line = a.say('hello');
    a.setSkipping(true);
    assert.equal(await line, true);
    assert.equal(await walk, true);
    assert.deepEqual([a.x, a.y], [100, 0]);
    assert.equal(await a.walkTo({ x: 5, y: 5 }), true);
    assert.deepEqual([a.x, a.y], [5, 5]);
    assert.equal(a.speech, null);
    assert.equal(await a.say('again'), true);
    assert.equal(a.speech, null);
  });
});

describe('helpers', () => {
  const ctxFor = (state, id = 'statue', item = null) => ({ id, state, item });

  it('firstLook runs once and the flag is saved in state', async () => {
    const g = makeGame();
    const ctx = ctxFor(g.core.state);
    const seen = [];
    assert.equal(await firstLook(ctx, () => seen.push('first')), true);
    assert.equal(await firstLook(ctx, () => seen.push('again')), false);
    assert.deepEqual(seen, ['first']);
    assert.equal(g.core.state.get('flags.once.statue.look'), true);
  });

  it('firstUse is per item; once handles dotted keys', async () => {
    const g = makeGame();
    const seen = [];
    await firstUse(ctxFor(g.core.state, 'door', 'key'), () => seen.push('key'));
    await firstUse(ctxFor(g.core.state, 'door', 'key'), () => seen.push('key2'));
    await firstUse(ctxFor(g.core.state, 'door', 'rope'), () => seen.push('rope'));
    assert.deepEqual(seen, ['key', 'rope']);
    assert.equal(await once(ctxFor(g.core.state), 'a.b', () => {}), true);
    assert.equal(await once(ctxFor(g.core.state), 'a.b', () => {}), false);
  });

  it('flag is set before the body runs, so a failing first time does not repeat', async () => {
    const g = makeGame();
    const ctx = ctxFor(g.core.state);
    await assert.rejects(firstLook(ctx, () => { throw new Error('x'); }), /x/);
    assert.equal(await firstLook(ctx, () => {}), false);
  });
});

describe('Scripts registry', () => {
  it('addAll takes handlers or module namespaces; firstLook works inside a handler', async () => {
    const g = makeGame();
    const said = [];
    g.hero.say = async (k) => { said.push(k); };
    g.hero.walkTo = async () => true;
    g.scripts.addAll({
      door: { default: { onLook: async (c) => { if (await firstLook(c, () => c.say('door.first'))) return; await c.say('door.again'); } } },
      key: { onLook: (c) => c.say('key.look') },
    });
    assert.equal(typeof g.scripts.get('door').onLook, 'function');
    assert.equal(typeof g.scripts.get('key').onLook, 'function');
    g.core.state.set('currentRoom', 'hall');
    const [door] = createHotspots({ hotspots: roomJson('hall').hotspots });
    await g.interactor.lookHotspot(door);
    await g.interactor.lookHotspot(door);
    assert.deepEqual(said, ['door.first', 'door.again']);
    assert.deepEqual(g.errors, []);
  });

  it('object onEnter runs while black, onEntered after the fade-in; room hooks come first', async () => {
    const g = makeGame();
    const order = [];
    g.scripts.add('hall', {
      onEnter: () => order.push(`room.onEnter ${g.scene.fade.alpha}`),
      onEntered: () => order.push(`room.onEntered ${g.scene.fade.alpha}`),
    });
    g.scripts.add('door', {
      onEnter: (c) => order.push(`door.onEnter ${c.firstVisit} ${c.hotspot?.id}`),
      onEntered: (c) => order.push(`door.onEntered ${c.room.id}`),
    });
    await g.drive(g.scene.goTo('hall'));
    assert.deepEqual(order, ['room.onEnter 0', 'door.onEnter true door', 'room.onEntered 0', 'door.onEntered hall']);
  });

  it('a plain object or Map still works as the scene scripts', async () => {
    const g = makeGame();
    const seen = [];
    const scene = new SceneManager({
      ...g.core, scripts: new Map([['hall', { onEnter: () => seen.push('map') }]]),
      viewWidth: 640, viewHeight: 360, fadeMs: 0, loadRoom: async (id) => roomJson(id),
    });
    await scene.goTo('hall');
    assert.deepEqual(seen, ['map']);
  });
});

describe('skip button and pointer lock', () => {
  it('hit-tests the button; a locked pointer ignores presses', async () => {
    assert.ok(hitSkipButton(600, 20, 640));
    assert.ok(!hitSkipButton(100, 20, 640));
    const g = makeGame();
    await g.drive(g.scene.goTo('hall'));
    const pointer = new PointerController({
      interactor: g.interactor, hover: g.hover, camera: new Camera(640, 360),
      bar: new InventoryBar({ viewWidth: 640, viewHeight: 360 }), scheduler: g.core.scheduler,
    });
    const run = g.cutscenes.run(async () => { await g.core.scheduler.wait(100); });
    pointer.down({ x: 100, y: 250 });
    pointer.up({ x: 100, y: 250 });
    await g.drive(run);
    assert.equal(g.hero.walking, false);
    assert.deepEqual([g.hero.x, g.hero.y], [40, 280]);
  });
});
