import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, spriteFrames } from '../../src/index.js';
import { driveUntilDrawing } from '../../src/game/setup-driver.js';

// A browser's frame callback, stepped by hand.
const frames = () => {
  const queue = [];
  return { request: (fn) => queue.push(fn), step: (now) => { const fn = queue.shift(); fn?.(now); return queue.length > 0; }, queue };
};

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const room = {
  id: 'yard', width: 640, height: 360, color: '#222',
  starts: { default: { x: 40, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
};

test('until p5 starts drawing, the game is stepped and drawn from the frame callback', async () => {
  const game = new Game({ rooms: [room], storage: memory() });
  let drawn = 0;
  game.draw = () => { drawn++; };
  const raf = frames();
  driveUntilDrawing(game, { request: raf.request });

  // what an async setup() does: await a cutscene that needs frames, with p5 not drawing yet
  const setup = (async () => {
    await game.start();
    await game.cutscene(async () => {
      await game.hero.walkTo({ x: 300, y: 300 });
      await game.say('line', { ms: 300, literal: true });
    });
  })();

  let finished = false;
  setup.then(() => { finished = true; });
  for (let now = 0; !finished && now < 20000; now += 50) {
    raf.step(now);
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(finished, true, 'setup() finished although p5 was not drawing');
  assert.ok(drawn > 5, `the game was drawn while it waited (${drawn} frames)`);
  assert.ok(game.hero.x > 250);
});

test('it stops as soon as p5 takes over', () => {
  const game = new Game({ rooms: [room], storage: memory() });
  let updates = 0;
  game.update = () => { updates++; };
  game.draw = () => {};
  const raf = frames();
  driveUntilDrawing(game, { request: raf.request });
  raf.step(0);
  raf.step(16);
  assert.equal(updates, 2);
  game.drawnByP5 = true;
  assert.equal(raf.step(32), false, 'no further frame is requested');
  assert.equal(updates, 2);
});

test('the stop function ends it, and it does nothing without a frame callback', () => {
  const game = new Game({ rooms: [room], storage: memory() });
  game.draw = () => {};
  const raf = frames();
  const stop = driveUntilDrawing(game, { request: raf.request });
  stop();
  assert.equal(raf.step(0), false);
  assert.doesNotThrow(() => driveUntilDrawing(game, { request: null })());
});

test('a game that cannot draw yet warns once and stops, instead of failing every frame', () => {
  const game = new Game({ rooms: [room], storage: memory() });
  game.draw = () => { throw new Error('no canvas'); };
  const raf = frames();
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    driveUntilDrawing(game, { request: raf.request });
    raf.step(0);
  } finally {
    console.warn = warn;
  }
  assert.equal(raf.queue.length, 0);
  assert.match(warnings[0], /no canvas/);
});

test('spriteFrames cuts a sheet into numbered frames, left to right and top to bottom', () => {
  const sheet = { width: 256, height: 192, get: (x, y, w, h) => ({ x, y, w, h }) };
  const frames = spriteFrames(sheet, 64, 64);
  assert.equal(frames.length, 12);
  assert.deepEqual(frames[0], { x: 0, y: 0, w: 64, h: 64 });
  assert.deepEqual(frames[5], { x: 64, y: 64, w: 64, h: 64 });
  assert.deepEqual(frames[11], { x: 192, y: 128, w: 64, h: 64 });
  assert.equal(spriteFrames(sheet, 64, 64, { count: 3 }).length, 3);
  assert.equal(spriteFrames(sheet, 64, 64, { count: 99 }).length, 12);
  assert.equal(spriteFrames({ ...sheet, width: 100 }, 64, 64).length, 3, 'only whole frames count');
  assert.throws(() => spriteFrames(sheet, 0, 64), RangeError);
});
