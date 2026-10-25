import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkRoom } from '../../tools/lib/check-room.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const floor = { id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] };
const room = (changes = {}) => ({
  id: 'yard', width: 640, height: 360,
  starts: { default: { x: 80, y: 300 } },
  walkable: [floor],
  hotspots: [{ id: 'sign', name: 'obj.sign', provider: 'polygon', points: [[300, 170], [380, 170], [380, 250], [300, 250]], walkTo: { x: 340, y: 290 } }],
  ...changes,
});
const messages = (problems, level) => problems.filter((p) => p.level === level).map((p) => p.message);

test('a good room has no problems', () => {
  assert.deepEqual(checkRoom(room()), []);
});

test('a room the game cannot load is an error, with the reason', () => {
  assert.match(messages(checkRoom(room({ starts: {} })), 'error')[0], /at least one start/);
  assert.match(messages(checkRoom(room({ walkable: [{ id: 'f', points: [[0, 0], [1, 1]] }] })), 'error')[0], /3\+ points/);
  assert.match(messages(checkRoom({ id: 'x', width: 0, height: 1, starts: { default: { x: 0, y: 0 } } }), 'error')[0], /width/);
});

test('a start or a walkTo off the floor is a warning', () => {
  const problems = checkRoom(room({
    starts: { default: { x: 80, y: 300 }, high: { x: 80, y: 20 } },
    hotspots: [{ id: 'sign', name: 'obj.sign', provider: 'polygon', points: [[0, 0], [10, 0], [10, 10]], walkTo: { x: 5, y: 5 } }],
  }));
  assert.match(messages(problems, 'warning').join('\n'), /start "high".*not on the floor/);
  assert.match(messages(problems, 'warning').join('\n'), /hotspot "sign": walkTo \(5, 5\) is not on the floor/);
  assert.deepEqual(messages(problems, 'error'), []);
});

test('a walkTo the hero cannot reach is a warning', () => {
  const island = { id: 'island', points: [[500, 20], [600, 20], [600, 100], [500, 100]] };
  const problems = checkRoom(room({
    walkable: [floor, island],
    hotspots: [{ id: 'flag', name: 'obj.flag', provider: 'polygon', points: [[510, 30], [520, 30], [520, 40]], walkTo: { x: 550, y: 60 } }],
  }));
  assert.match(messages(problems, 'warning').join('\n'), /cannot reach its walkTo/);
});

test('hotspots that cannot work are errors', () => {
  const problems = checkRoom(room({
    hotspots: [
      { id: 'a', provider: 'circle' },
      { id: 'b', provider: 'polygon', points: [[0, 0], [1, 1]] },
      { id: 'c', provider: 'svg' },
      { id: 'd', provider: 'colorMask', mask: 'mask.png' },
      { id: 'e', provider: 'polygon', points: [[0, 0], [1, 0], [1, 1]], walkTo: { x: 'left' } },
    ],
  }));
  const errors = messages(problems, 'error').join('\n');
  assert.match(errors, /hotspot "a": provider must be/);
  assert.match(errors, /hotspot "b": a polygon needs 3/);
  assert.match(errors, /hotspot "c": an svg hotspot needs/);
  assert.match(errors, /hotspot "d": a colorMask hotspot needs/);
  assert.match(errors, /hotspot "e": walkTo needs x and y/);
});

test('with strings, a hotspot name that is not defined is a warning (the id stands in for a missing name)', () => {
  const strings = { 'obj.sign': 'Sign' };
  assert.deepEqual(checkRoom(room(), { strings }), []);
  const problems = checkRoom(room({ hotspots: [
    { id: 'door', name: 'obj.door', provider: 'polygon', points: [[0, 0], [1, 0], [1, 1]] },
    { id: 'lamp', provider: 'polygon', points: [[0, 0], [1, 0], [1, 1]] },
  ] }), { strings });
  assert.match(messages(problems, 'warning').join('\n'), /"obj.door" is not in the strings/);
  assert.match(messages(problems, 'warning').join('\n'), /"lamp" is not in the strings/);
});

test('the command exits 0 for good rooms, 1 for errors, and 1 for warnings only with --strict', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-rooms-'));
  const write = (name, json) => { const file = path.join(dir, name); fs.writeFileSync(file, JSON.stringify(json)); return file; };
  const good = write('good.json', room());
  const bad = write('bad.json', room({ starts: {} }));
  const warns = write('warns.json', room({ starts: { default: { x: 5, y: 5 } } }));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'tools', 'check-rooms.mjs'), ...args], { encoding: 'utf8' });

  assert.equal(run(good).status, 0);
  assert.equal(run(bad).status, 1);
  assert.match(run(bad).stdout, /bad\.json: error: .*at least one start/);
  assert.equal(run(warns).status, 0);
  assert.equal(run('--strict', warns).status, 1);
  assert.equal(run().status, 2);
  fs.rmSync(dir, { recursive: true });
});

test('the Lighthouse example rooms are clean', () => {
  const rooms = fs.readdirSync(path.join(root, 'examples/lighthouse/rooms')).map((f) => path.join('examples/lighthouse/rooms', f));
  const out = execFileSync(process.execPath, ['tools/check-rooms.mjs', '--strict', '--strings', 'examples/lighthouse/strings.en.json', ...rooms], { cwd: root, encoding: 'utf8' });
  assert.match(out, /0 errors, 0 warnings/);
});
