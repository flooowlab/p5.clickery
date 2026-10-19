import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Navigator, parseRoom, scaleFromStops, sortByBaseline, dist, segmentsCross, closestPointOnSegment,
} from '../../src/index.js';

const box = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

// A floor 400x100 with a table that leaves only a corridor along the top.
const tableRoom = () => parseRoom({
  id: 'r', width: 400, height: 300, starts: { default: { x: 0, y: 0 } },
  walkable: [{ id: 'floor', points: box(0, 200, 400, 300), scale: [[200, 0.5], [300, 1]] }],
  obstacles: [{ id: 'table', points: box(150, 230, 250, 300) }],
});

const pathLength = (from, path) => path.reduce((sum, p, i) => sum + dist(i ? path[i - 1] : from, p), 0);

describe('geometry', () => {
  it('segmentsCross ignores touching and collinear', () => {
    const p = (x, y) => ({ x, y });
    assert.ok(segmentsCross(p(0, 0), p(10, 10), p(0, 10), p(10, 0)));
    assert.ok(!segmentsCross(p(0, 0), p(10, 0), p(10, 0), p(10, 10)));
    assert.ok(!segmentsCross(p(0, 0), p(10, 0), p(5, 0), p(15, 0)));
  });

  it('closestPointOnSegment clamps to the ends', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    assert.deepEqual(closestPointOnSegment({ x: 5, y: 3 }, a, b), { x: 5, y: 0 });
    assert.deepEqual(closestPointOnSegment({ x: -4, y: 3 }, a, b), { x: 0, y: 0 });
    assert.deepEqual(closestPointOnSegment({ x: 4, y: 4 }, a, a), { x: 0, y: 0 });
  });
});

describe('Navigator', () => {
  it('walks straight when the line is clear', () => {
    const nav = Navigator.fromRoom(tableRoom());
    assert.deepEqual(nav.findPath({ x: 20, y: 210 }, { x: 380, y: 210 }), [{ x: 380, y: 210 }]);
  });

  it('goes around an obstacle by the shortest route', () => {
    const nav = Navigator.fromRoom(tableRoom());
    const from = { x: 50, y: 280 };
    const path = nav.findPath(from, { x: 350, y: 280 });
    assert.equal(path.length, 3);
    assert.deepEqual(path.at(-1), { x: 350, y: 280 });
    const length = pathLength(from, path);
    assert.ok(length > 300 && length < 335, `length ${length}`);
    // Every leg of the route is walkable, and no point sits in the table.
    let prev = from;
    for (const p of path) {
      assert.ok(nav.canSee(prev, p), `leg to ${JSON.stringify(p)} is blocked`);
      assert.ok(nav.isWalkable(p.x, p.y));
      prev = p;
    }
  });

  it('snaps a goal inside an obstacle or outside the floor to walkable ground', () => {
    const nav = Navigator.fromRoom(tableRoom());
    const inTable = nav.findPath({ x: 20, y: 280 }, { x: 200, y: 265 }).at(-1);
    assert.ok(nav.isWalkable(inTable.x, inTable.y));
    assert.ok(dist(inTable, { x: 200, y: 265 }) < 40);
    const offFloor = nav.nearestWalkable({ x: 200, y: 100 });
    assert.ok(nav.isWalkable(offFloor.x, offFloor.y));
    assert.ok(offFloor.y >= 200 && offFloor.y < 203);
  });

  it('routes around a concave corner', () => {
    const L = [[0, 0], [100, 0], [100, 100], [300, 100], [300, 200], [0, 200]];
    const nav = new Navigator({ areas: [{ id: 'l', points: L }] });
    const from = { x: 20, y: 20 };
    const path = nav.findPath(from, { x: 280, y: 180 });
    assert.ok(path.length >= 2);
    let prev = from;
    for (const p of path) { assert.ok(nav.canSee(prev, p)); prev = p; }
    assert.ok(pathLength(from, path) < dist(from, { x: 280, y: 180 }) + 40);
  });

  it('returns null between disconnected areas', () => {
    const nav = new Navigator({ areas: [{ id: 'a', points: box(0, 0, 50, 50) }, { id: 'b', points: box(200, 0, 250, 50) }] });
    assert.equal(nav.findPath({ x: 10, y: 10 }, { x: 220, y: 10 }), null);
  });

  it('adjacent areas sharing an edge are one walkable surface', () => {
    const nav = new Navigator({ areas: [{ id: 'a', points: box(0, 0, 100, 100) }, { id: 'b', points: box(100, 0, 200, 100) }] });
    assert.deepEqual(nav.findPath({ x: 10, y: 50 }, { x: 190, y: 50 }), [{ x: 190, y: 50 }]);
  });

  it('needs an area', () => {
    assert.throws(() => new Navigator({ areas: [] }), /at least one/);
  });
});

describe('depth', () => {
  it('interpolates scale between stops and clamps outside', () => {
    const stops = [[200, 0.5], [300, 1]];
    assert.equal(scaleFromStops(stops, 100), 0.5);
    assert.equal(scaleFromStops(stops, 250), 0.75);
    assert.equal(scaleFromStops(stops, 999), 1);
    assert.equal(scaleFromStops(undefined, 250), 1);
  });

  it('navigator scale follows the area under the point, 1 off the map', () => {
    const nav = Navigator.fromRoom(tableRoom());
    assert.equal(nav.scaleAt(10, 250), 0.75);
    assert.equal(nav.scaleAt(10, 50), 1);
  });

  it('sorts back to front by baseline, stable on ties', () => {
    const items = [{ id: 'hero', y: 260 }, { id: 'tree', baseline: 240 }, { id: 'rock', y: 260 }, { id: 'sky', y: 0 }];
    assert.deepEqual(sortByBaseline(items).map((i) => i.id), ['sky', 'tree', 'hero', 'rock']);
  });
});
