import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/index.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

// A 64 x 36 mask for a 640 x 360 room: the left half is green, the rest is transparent.
const mask = () => {
  const data = new Uint8ClampedArray(64 * 36 * 4);
  for (let y = 0; y < 36; y++) for (let x = 0; x < 32; x++) data.set([0, 255, 0, 255], (y * 64 + x) * 4);
  return { data, width: 64, height: 36 };
};

const room = (hotspots) => ({
  id: 'yard', width: 640, height: 360, color: '#222',
  starts: { default: { x: 80, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
  hotspots,
});

test('a colorMask hotspot works in a game once its mask is loaded (the p5 binding loads it in start())', async () => {
  const game = new Game({ rooms: [room([{ id: 'lamp', name: 'obj.lamp', provider: 'colorMask', mask: 'mask.png', color: '#00ff00' }])], storage: memory() });
  game.hotspotFiles.set('yard:mask.png', { pixels: mask() });
  await game.start();
  const lamp = game.hotspot('lamp');
  assert.equal(lamp.hit(100, 100), true, 'inside the green half, scaled from the small mask to the room');
  assert.equal(lamp.hit(500, 100), false);
  assert.equal(game.hover.at(100, 100)?.id, 'lamp');
});

test('a hotspot whose file was not loaded says which one, instead of failing obscurely', async () => {
  const game = new Game({ rooms: [room([{ id: 'lamp', provider: 'colorMask', mask: 'missing.png', color: '#00ff00' }])], storage: memory() });
  await assert.rejects(game.start(), /room "yard": the mask picture "missing\.png" is not loaded/);
  const svg = new Game({ rooms: [room([{ id: 'crate', provider: 'svg', svg: 'room.svg' }])], storage: memory() });
  await assert.rejects(svg.start(), /the svg file "room\.svg" is not loaded/);
});

test('files are kept per room, so two rooms can use the same file name', async () => {
  const other = { ...room([{ id: 'lamp', provider: 'colorMask', mask: 'mask.png', color: '#00ff00' }]), id: 'hall' };
  const game = new Game({ rooms: [room([{ id: 'lamp', provider: 'colorMask', mask: 'mask.png', color: '#00ff00' }]), other], storage: memory() });
  game.hotspotFiles.set('yard:mask.png', { pixels: mask() });
  await game.start();
  assert.equal(game.hotspot('lamp').hit(100, 100), true);
  // the hall has no file of its own (the yard's does not count)
  const hall = new Game({ rooms: [other], storage: memory() });
  hall.hotspotFiles.set('yard:mask.png', { pixels: mask() });
  await assert.rejects(hall.start(), /room "hall"/);
});
