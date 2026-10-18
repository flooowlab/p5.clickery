import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, parseRoom, startPosition, Camera, Fade, SceneManager } from '../src/index.js';

const roomJson = (id, extra = {}) => ({
  id, width: 960, height: 360,
  starts: { default: { x: 100, y: 300 }, east: { x: 900, y: 300 } },
  ...extra,
});

describe('parseRoom', () => {
  it('fills defaults', () => {
    const room = parseRoom(roomJson('hall', { layers: [{ image: 'a.png' }] }));
    assert.deepEqual(room.layers, [{ image: 'a.png', depth: 'bg', parallax: 1 }]);
    assert.equal(room.background, null);
    assert.deepEqual(room.hotspots, []);
  });

  it('rejects bad rooms', () => {
    assert.throws(() => parseRoom(null), TypeError);
    assert.throws(() => parseRoom({ ...roomJson('a'), id: '' }), TypeError);
    assert.throws(() => parseRoom({ ...roomJson('a'), width: 0 }), RangeError);
    assert.throws(() => parseRoom({ ...roomJson('a'), starts: {} }), /start position/);
    assert.throws(() => parseRoom(roomJson('a', { layers: [{ image: 'x', depth: 'mid' }] })), RangeError);
    assert.throws(() => parseRoom(roomJson('a', { layers: [{ image: 'x', parallax: -1 }] })), RangeError);
    assert.throws(() => parseRoom(roomJson('a', { hotspots: [{ id: 'd' }, { id: 'd' }] })), /duplicate/);
    assert.throws(() => parseRoom(roomJson('a', { walkable: [{ id: 'f', points: [[0, 0]] }] })), RangeError);
  });

  it('copies starts so the source cannot change the room', () => {
    const json = roomJson('a');
    const room = parseRoom(json);
    json.starts.default.x = 5;
    assert.equal(startPosition(room).x, 100);
    assert.throws(() => startPosition(room, 'nope'), /no start/);
  });
});

describe('Camera', () => {
  it('clamps to the room and centres on a point', () => {
    const cam = new Camera(640, 360, 960, 360);
    cam.centerOn(0, 0);
    assert.equal(cam.x, 0);
    cam.centerOn(500, 100);
    assert.equal(cam.x, 180);
    cam.centerOn(950, 100);
    assert.equal(cam.x, 320);
    assert.equal(cam.y, 0);
  });

  it('does not scroll when the room fits the view', () => {
    const cam = new Camera(640, 360, 400, 200);
    cam.centerOn(300, 300);
    assert.deepEqual([cam.x, cam.y], [0, 0]);
  });

  it('re-clamps when the room changes', () => {
    const cam = new Camera(640, 360, 960, 360);
    cam.moveTo(320, 0);
    cam.setRoom(700, 360);
    assert.equal(cam.x, 60);
  });

  it('parallax factors scale the layer offset', () => {
    const cam = new Camera(640, 360, 960, 360);
    cam.moveTo(200, 0);
    assert.equal(cam.layerOffset(1).x, -200);
    assert.equal(cam.layerOffset(0.5).x, -100);
    assert.equal(cam.layerOffset(0).x + 0, 0);
  });

  it('converts between world and screen, and follow eases towards the target', () => {
    const cam = new Camera(640, 360, 960, 360);
    cam.moveTo(100, 0);
    assert.deepEqual(cam.worldToScreen(150, 20), { x: 50, y: 20 });
    assert.deepEqual(cam.screenToWorld(50, 20), { x: 150, y: 20 });
    cam.follow(600, 100, 100);
    assert.ok(cam.x > 100 && cam.x < 280);
    for (let i = 0; i < 100; i++) cam.follow(600, 100, 100);
    assert.ok(Math.abs(cam.x - 280) < 0.01);
  });
});

describe('Fade', () => {
  it('moves alpha over time and resolves at the end', async () => {
    const fade = new Fade();
    let done = false;
    const p = fade.out(100).then(() => { done = true; });
    fade.update(50);
    assert.equal(fade.alpha, 0.5);
    assert.ok(fade.active);
    fade.update(60);
    await p;
    assert.equal(fade.alpha, 1);
    assert.ok(done && !fade.active);
  });

  it('zero length or already there is immediate; a new fade settles the old one', async () => {
    const fade = new Fade();
    await fade.in(100);
    await fade.out(0);
    assert.equal(fade.alpha, 1);
    const first = fade.in(100);
    fade.in(100);
    await first;
  });
});

describe('SceneManager', () => {
  const setup = (scripts = {}) => {
    const core = createCore();
    const rooms = {
      hall: roomJson('hall'),
      cellar: roomJson('cellar', { width: 640 }),
    };
    const scene = new SceneManager({
      ...core, scripts, viewWidth: 640, viewHeight: 360, fadeMs: 100,
      loadRoom: async (id) => { if (!rooms[id]) throw new Error(`no room ${id}`); return rooms[id]; },
    });
    // Drive the fade with fake frames until the pending promise settles.
    const run = async (promise) => {
      let settled = false;
      promise.then(() => { settled = true; }, () => { settled = true; });
      for (let i = 0; i < 50 && !settled; i++) {
        await new Promise((r) => setImmediate(r));
        core.events.emit('update', 20);
      }
      return promise;
    };
    return { core, scene, run };
  };

  it('enters the first room without fading out and marks it visited', async () => {
    const { core, scene, run } = setup();
    const seen = [];
    core.events.on('room:enter', (c) => seen.push([c.room.id, c.firstVisit]));
    await run(scene.goTo('hall'));
    assert.equal(scene.room.id, 'hall');
    assert.equal(core.state.get('currentRoom'), 'hall');
    assert.equal(core.state.get('rooms.hall.visited'), true);
    assert.deepEqual(seen, [['hall', true]]);
    assert.equal(scene.fade.alpha, 0);
  });

  it('runs exit then enter hooks, in order, with the start name', async () => {
    const log = [];
    const { scene, run } = setup({
      hall: { onExit: async (c) => log.push(`exit ${c.room.id}`) },
      cellar: { onEnter: async (c) => log.push(`enter ${c.room.id} ${c.start} ${c.firstVisit}`) },
    });
    await run(scene.goTo('hall'));
    await run(scene.goTo('cellar', 'east'));
    assert.deepEqual(log, ['exit hall', 'enter cellar east true']);
    assert.equal(scene.camera.roomWidth, 640);
  });

  it('is black between rooms', async () => {
    const { core, scene } = setup();
    await scene.goTo('hall');
    const alphas = [];
    core.events.on('room:enter', () => alphas.push(scene.fade.alpha));
    const p = scene.goTo('cellar');
    for (let i = 0; i < 20; i++) { await new Promise((r) => setImmediate(r)); core.events.emit('update', 20); }
    await p;
    assert.deepEqual(alphas, [1]);
    assert.equal(scene.fade.alpha, 0);
  });

  it('keeps room state across a room change and reports firstVisit false on return', async () => {
    const { core, scene, run } = setup();
    await run(scene.goTo('hall'));
    core.state.set('rooms.hall.doorOpen', true);
    await run(scene.goTo('cellar'));
    let first;
    core.events.on('room:enter', (c) => { first = c.firstVisit; });
    await run(scene.goTo('hall'));
    assert.equal(core.state.get('rooms.hall.doorOpen'), true);
    assert.equal(core.state.get('currentRoom'), 'hall');
    assert.equal(first, false);
  });

  it('a failed load or unknown start leaves the current room alone', async () => {
    const { scene, run } = setup();
    await run(scene.goTo('hall'));
    await assert.rejects(run(scene.goTo('nowhere')), /no room/);
    await assert.rejects(run(scene.goTo('cellar', 'west')), /no start/);
    assert.equal(scene.room.id, 'hall');
    assert.equal(scene.busy, false);
  });

  it('refuses a second change while one is running', async () => {
    const { scene, run } = setup();
    await run(scene.goTo('hall'));
    const first = scene.goTo('cellar');
    await assert.rejects(scene.goTo('hall'), /already changing/);
    await run(first);
  });

  it('restore re-enters the saved room with no fade', async () => {
    const { core, scene } = setup();
    assert.equal(await scene.restore(), false);
    core.state.set('currentRoom', 'cellar');
    assert.equal(await scene.restore(), true);
    assert.equal(scene.room.id, 'cellar');
    assert.equal(scene.fade.alpha, 0);
  });
});
