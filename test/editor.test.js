import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseRoom, createHotspots, Navigator, Actor, HoverTracker, SceneManager, createCore, pointInPolygon, dist,
} from '../src/index.js';
import { floodSelect, emptyMask, maskCount, maskBounds, unionMask, subtractMask } from '../tools/editor/select.js';
import { traceContours, maskToRegions } from '../tools/editor/contours.js';
import { simplifyLoop, roundLoop, signedArea } from '../tools/editor/simplify.js';
import { EditorModel, createShapesFromMask } from '../tools/editor/model.js';
import { sampleScene, SAMPLE } from '../tools/editor/sample.js';

// '#' is selected. Rows of equal length.
const maskOf = (rows) => ({
  width: rows[0].length, height: rows.length,
  data: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))),
});
const boxPoints = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

describe('magic wand', () => {
  const scene = sampleScene();

  it('selects the connected area of one colour, with the table and lamp left out', () => {
    const sky = floodSelect(scene, 10, 10);
    assert.equal(sky.data[10 * 640 + 10], 1);
    const lamp = SAMPLE.lamp;
    assert.equal(sky.data[lamp.y * 640 + lamp.x], 0, 'the lamp is a different colour');
    assert.equal(sky.data[245 * 640 + 10], 0, 'the floor is a different colour');
    const doorPixels = (SAMPLE.door.x2 - SAMPLE.door.x1) * (SAMPLE.door.y2 - SAMPLE.door.y1);
    assert.equal(maskCount(floodSelect(scene, 590, 150)), doorPixels);
  });

  it('the floor selection has the table as a hole', () => {
    const floor = floodSelect(scene, 10, 300);
    const t = SAMPLE.table;
    const tableArea = (t.x2 - t.x1) * (t.y2 - t.y1);
    assert.equal(maskCount(floor), 640 * (360 - SAMPLE.floorTop) - tableArea);
    assert.equal(floor.data[t.y1 * 640 + t.x1], 0);
  });

  it('contiguous stops at gaps, global does not; tolerance widens the match', () => {
    const image = { width: 5, height: 1, data: Uint8ClampedArray.from([10, 0, 0, 255, 99, 0, 0, 255, 10, 0, 0, 255, 14, 0, 0, 255, 10, 0, 0, 255]) };
    assert.deepEqual([...floodSelect(image, 0, 0, 0).data], [1, 0, 0, 0, 0]);
    assert.deepEqual([...floodSelect(image, 0, 0, 0, { contiguous: false }).data], [1, 0, 1, 0, 1]);
    assert.deepEqual([...floodSelect(image, 2, 0, 4).data], [0, 0, 1, 1, 1]);
  });

  it('a click outside the image selects nothing', () => {
    assert.equal(maskCount(floodSelect(scene, -5, 10)), 0);
    assert.equal(maskCount(floodSelect(scene, 10, 9999)), 0);
  });

  it('combines masks and measures them', () => {
    const a = maskOf(['##..', '....']);
    const b = maskOf(['.##.', '.#..']);
    assert.deepEqual([...unionMask(a, b).data], [1, 1, 1, 0, 0, 1, 0, 0]);
    assert.deepEqual([...subtractMask(a, b).data], [1, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(maskBounds(b), { x: 1, y: 0, width: 2, height: 2 });
    assert.equal(maskBounds(emptyMask(3, 3)), null);
    assert.throws(() => unionMask(a, emptyMask(2, 2)), /same size/);
  });
});

describe('marching squares', () => {
  it('outlines a rectangle as one outer loop, with an area close to its pixel area', () => {
    const loops = traceContours(maskOf(['......', '.####.', '.####.', '.####.', '......']));
    assert.equal(loops.length, 1);
    assert.ok(signedArea(loops[0]) > 0, 'outer loops have positive area');
    assert.ok(Math.abs(signedArea(loops[0]) - 12) <= 0.5);
    assert.ok(Math.abs(signedArea(traceContours(maskOf(['......', '.####.', '.####.', '.####.', '......']), { scale: 1 })[0]) - 12) <= 1, 'scale 1 is coarser');
  });

  it('a rectangle comes out with exact whole-number corners', () => {
    const rows = Array.from({ length: 20 }, (_, y) => (y >= 4 && y < 16 ? '....##########......' : '....................'));
    const [region] = maskToRegions(maskOf(rows));
    assert.deepEqual(region.outer.map(([x, y]) => [Math.round(x), Math.round(y)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[4, 4], [4, 16], [14, 4], [14, 16]]);
  });

  it('a ring gives an outer loop and a hole of the opposite sign, and groups them', () => {
    const ring = maskOf(['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......']);
    const areas = traceContours(ring).map(signedArea).sort((a, b) => a - b);
    assert.ok(areas[0] < 0 && areas[1] > 0);
    const regions = maskToRegions(ring, { minArea: 1 });
    assert.equal(regions.length, 1);
    assert.equal(regions[0].holes.length, 1);
  });

  it('separate blobs are separate regions; pixels touching only at a corner are not joined', () => {
    assert.equal(maskToRegions(maskOf(['##..##', '##..##']), { minArea: 1 }).length, 2);
    assert.equal(traceContours(maskOf(['....', '.#..', '..#.', '....'])).length, 2);
  });

  it('an island inside a hole is its own region, not a hole of anything', () => {
    const m = maskOf([
      '.........', '.#######.', '.#.....#.', '.#.###.#.', '.#.###.#.', '.#.....#.', '.#######.', '.........',
    ]);
    const regions = maskToRegions(m, { minArea: 1 });
    assert.equal(regions.length, 2);
    assert.deepEqual(regions.map((r) => r.holes.length).sort(), [0, 1]);
  });

  it('specks under minArea are ignored; an empty mask has no outlines', () => {
    assert.equal(maskToRegions(maskOf(['....', '.#..', '....']), { minArea: 4 }).length, 0);
    assert.equal(traceContours(emptyMask(4, 4)).length, 0);
  });

  it('every point of a traced outline lies on the boundary of the selection', () => {
    const blob = maskOf(['.......', '.##....', '.####..', '..####.', '...##..', '.......']);
    for (const loop of traceContours(blob)) {
      for (const [x, y] of loop) {
        // a contour point sits halfway between an inside and an outside sample
        const around = [[x - 0.5, y], [x + 0.5, y], [x, y - 0.5], [x, y + 0.5]]
          .map(([sx, sy]) => blob.data[Math.floor(sy) * blob.width + Math.floor(sx)] ?? 0);
        assert.ok(around.includes(1) && around.includes(0), `point ${x},${y}`);
      }
    }
  });
});

describe('simplify', () => {
  it('removes collinear points and staircase noise but keeps corners', () => {
    const loop = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [5, 10], [0, 10], [0, 5]];
    assert.deepEqual(simplifyLoop(loop, 0.5).sort(), [[0, 0], [0, 10], [10, 0], [10, 10]]);
    const noisy = [[0, 0], [5, 0.4], [10, 0], [10, 5.3], [10, 10], [5, 9.7], [0, 10], [-0.3, 5]];
    assert.equal(simplifyLoop(noisy, 1).length, 4);
  });

  it('keeps detail that is further than epsilon from the outline', () => {
    const notch = [[0, 0], [10, 0], [10, 10], [6, 10], [5, 4], [4, 10], [0, 10]];
    assert.ok(simplifyLoop(notch, 1).some(([x, y]) => x === 5 && y === 4));
    assert.ok(!simplifyLoop(notch, 20).some(([x, y]) => x === 5 && y === 4));
  });

  it('never returns fewer than 3 points; copies its input', () => {
    const sliver = [[0, 0], [100, 0], [100, 0.1], [0, 0.1]];
    assert.ok(simplifyLoop(sliver, 5).length >= 3);
    const tri = [[0, 0], [1, 0], [0, 1]];
    const out = simplifyLoop(tri);
    out[0][0] = 99;
    assert.equal(tri[0][0], 0);
  });

  it('handles very long loops without overflowing the stack', () => {
    const big = Array.from({ length: 200_000 }, (_, i) => [Math.cos(i / 31830) * 1000, Math.sin(i / 31830) * 1000]);
    assert.ok(simplifyLoop(big, 2).length < 300);
  });

  it('roundLoop rounds and drops repeats', () => {
    assert.deepEqual(roundLoop([[0.2, 0.1], [0.4, 0.3], [5.6, 0], [5.6, 4.9], [0, 0]]), [[0, 0], [6, 0], [6, 5]]);
  });
});

describe('EditorModel', () => {
  const make = () => new EditorModel({ id: 'hall', width: 640, height: 360 });

  it('adds shapes with automatic ids, rounding and clamping points', () => {
    const m = make();
    const a = m.addShape('hotspot', [[10.4, 10.6], [100, 10], [100, 90]]);
    const b = m.addShape('hotspot', boxPoints(-50, 0, 20, 900));
    assert.deepEqual([a.id, b.id], ['hotspot1', 'hotspot2']);
    assert.deepEqual(a.points[0], [10, 11]);
    assert.deepEqual(b.points, [[0, 0], [20, 0], [20, 360], [0, 360]]);
    assert.equal(m.addShape('walkable', boxPoints(0, 200, 10, 300)).id, 'floor1');
    assert.equal(m.addShape('obstacle', boxPoints(0, 200, 10, 300)).id, 'obstacle1');
  });

  it('validates ids, kinds and point counts', () => {
    const m = make();
    m.addShape('hotspot', boxPoints(0, 0, 10, 10), { id: 'door' });
    assert.throws(() => m.addShape('hotspot', boxPoints(0, 0, 10, 10), { id: 'door' }), /already a hotspot/);
    assert.doesNotThrow(() => m.addShape('walkable', boxPoints(0, 0, 10, 10), { id: 'door' }), 'ids only need to be unique within a kind');
    for (const bad of ['', '9lives', 'has space', 'a.b', 'ünï']) {
      assert.throws(() => m.addShape('hotspot', boxPoints(0, 0, 10, 10), { id: bad }), /not a valid id/);
    }
    assert.throws(() => m.addShape('wall', boxPoints(0, 0, 10, 10)), /unknown shape kind/);
    assert.throws(() => m.addShape('hotspot', [[0, 0], [5, 5]]), /at least 3/);
    assert.throws(() => m.addShape('hotspot', [[0, 0], [0, 0], [0, 0]]), /at least 3/);
  });

  it('updates fields, with validation per kind', () => {
    const m = make();
    const h = m.addShape('hotspot', boxPoints(0, 0, 10, 10), { id: 'door' });
    const f = m.addShape('walkable', boxPoints(0, 200, 640, 360));
    m.updateShape(h.uid, { id: 'gate', name: 'obj.gate', z: 2, walkTo: { x: 5.5, y: 700, dir: 'up' } });
    assert.deepEqual(m.shape(h.uid).walkTo, { x: 6, y: 360, dir: 'up' });
    assert.equal(m.shape(h.uid).id, 'gate');
    m.updateShape(f.uid, { scale: [[200, 0.5], [360, 1]] });
    assert.throws(() => m.updateShape(f.uid, { scale: [[200, 0]] }), /scale/);
    assert.throws(() => m.updateShape(f.uid, { name: 'x' }), /no field "name"/);
    assert.throws(() => m.updateShape(h.uid, { z: 'high' }), /z must be/);
    assert.throws(() => m.updateShape(h.uid, { walkTo: { x: 1, y: 1, dir: 'sideways' } }), /direction/);
    m.addShape('hotspot', boxPoints(0, 0, 10, 10), { id: 'window' });
    assert.throws(() => m.updateShape(h.uid, { id: 'window' }), /already a hotspot/);
    m.updateShape(h.uid, { walkTo: null });
    assert.equal(m.shape(h.uid).walkTo, null);
  });

  it('edits points: move, insert, remove (never below 3), and move a whole shape', () => {
    const m = make();
    const s = m.addShape('obstacle', boxPoints(10, 10, 50, 50));
    m.movePoint(s.uid, 0, 12.4, 13);
    m.insertPoint(s.uid, 1, 30, 5);
    assert.deepEqual(m.shape(s.uid).points.slice(0, 3), [[12, 13], [30, 5], [50, 10]]);
    m.removePoint(s.uid, 1);
    assert.throws(() => { m.removePoint(s.uid, 0); m.removePoint(s.uid, 0); }, /at least 3/);
    const t = m.addShape('obstacle', boxPoints(600, 300, 640, 360));
    m.moveShape(t.uid, 100, 100);
    assert.deepEqual(m.shape(t.uid).points[0], [640, 360], 'clamped to the room');
    assert.throws(() => m.movePoint(s.uid, 99, 0, 0), /no point/);
  });

  it('undo and redo step through changes; a transaction is one step; listeners hear every change', () => {
    const m = make();
    let heard = 0;
    m.onChange(() => heard++);
    const a = m.addShape('hotspot', boxPoints(0, 0, 10, 10));
    m.transaction(() => { m.addShape('hotspot', boxPoints(20, 20, 30, 30)); m.addShape('hotspot', boxPoints(40, 40, 50, 50)); });
    assert.equal(m.shapes.length, 3);
    assert.equal(heard, 2, 'one notification per change, not per edit inside a transaction');
    assert.ok(m.undo());
    assert.equal(m.shapes.length, 1);
    assert.ok(m.undo());
    assert.equal(m.shapes.length, 0);
    assert.equal(m.undo(), false);
    assert.ok(m.redo() && m.redo());
    assert.equal(m.shapes.length, 3);
    assert.equal(m.redo(), false);
    m.undo();
    m.addShape('hotspot', boxPoints(60, 60, 70, 70));
    assert.equal(m.canRedo, false, 'a new edit clears the redo history');
    assert.equal(m.addShape('hotspot', boxPoints(0, 0, 9, 9)).uid > a.uid, true, 'ids keep growing, also after undo');
  });

  it('failed edits leave no undo step', () => {
    const m = make();
    const before = m.canUndo;
    assert.throws(() => m.addShape('hotspot', [[0, 0]]));
    assert.equal(m.canUndo, before);
  });

  it('starts: set, clamp, remove; direction and name are checked', () => {
    const m = make();
    m.setStart('default', 20.4, 999, 'right');
    assert.deepEqual(m.starts.default, { x: 20, y: 360, dir: 'right' });
    assert.throws(() => m.setStart('bad name', 1, 1), /not a valid id/);
    assert.throws(() => m.setStart('x', 1, 1, 'north'), /direction/);
    m.removeStart('default');
    assert.throws(() => m.removeStart('default'), /no start/);
  });

  it('reports problems', () => {
    const m = make();
    assert.ok(m.problems().some((p) => p.level === 'error' && /start/.test(p.message)));
    m.setStart('default', 5, 5);
    assert.ok(m.problems().some((p) => p.level === 'warning' && /No walkable area/.test(p.message)));
    m.addShape('walkable', boxPoints(0, 200, 640, 360));
    assert.ok(m.problems().some((p) => /Start "default" is not on walkable ground/.test(p.message)));
    m.setStart('default', 100, 300);
    const h = m.addShape('hotspot', boxPoints(0, 0, 50, 50), { id: 'door', walkTo: { x: 10, y: 10 } });
    assert.ok(m.problems().some((p) => /Hotspot "door".*walk-to/.test(p.message)));
    m.updateShape(h.uid, { walkTo: { x: 10, y: 250 } });
    assert.deepEqual(m.problems(), []);
    m.addShape('obstacle', boxPoints(90, 290, 110, 310));
    assert.equal(m.problems().length, 1, 'the start is now inside an obstacle');
    m.addShape('hotspot', [[0, 0], [10, 0], [20, 0]], { id: 'flat' });
    assert.ok(m.problems().some((p) => p.level === 'error' && /"flat" has no area/.test(p.message)));
  });

  it('exports depth scale stops sorted by y, whatever order they were entered in', () => {
    const m = make();
    const f = m.addShape('walkable', boxPoints(0, 200, 640, 360), { scale: [[360, 1], [200, 0.5]] });
    assert.deepEqual(m.shape(f.uid).scale, [[360, 1], [200, 0.5]], 'the editor keeps the entered order');
    assert.deepEqual(m.toRoomJSON().walkable[0].scale, [[200, 0.5], [360, 1]]);
  });

  it('exports the runtime format and imports it back; foreign hotspots pass through untouched', () => {
    const m = make();
    m.setRoom({ music: 'theme' });
    m.setStart('default', 50, 300, 'right');
    m.addShape('walkable', boxPoints(0, 250, 640, 360), { scale: [[250, 0.6], [360, 1]] });
    m.addShape('obstacle', boxPoints(300, 280, 380, 330), { id: 'table' });
    m.addShape('hotspot', boxPoints(560, 110, 620, 240), { id: 'door', z: 1, walkTo: { x: 590, y: 270, dir: 'up' } });
    m.addShape('hotspot', boxPoints(10, 10, 50, 50), { id: 'sign', name: 'obj.signpost' });
    const json = m.toRoomJSON();
    assert.equal(json.color, '#000000');
    assert.equal(json.hotspots[0].name, 'obj.door', 'a missing name becomes obj.<id>');
    assert.equal(json.hotspots[1].name, 'obj.signpost');
    assert.deepEqual(m.stringsTemplate(), { 'obj.door': 'door', 'obj.signpost': 'sign' });

    json.hotspots.push({ id: 'lamp', name: 'obj.lamp', provider: 'colorMask', mask: 'm.png', color: '#00ff00' });
    const again = EditorModel.fromRoomJSON(json);
    assert.deepEqual(again.toRoomJSON(), json);
    assert.equal(again.shapesOf('hotspot').length, 2);
    again.addShape('hotspot', boxPoints(1, 1, 9, 9));
    assert.equal(again.toRoomJSON().hotspots.at(-1).id, 'lamp', 'passthrough hotspots stay at the end');
    assert.doesNotThrow(() => parseRoom(m.toRoomJSON()));
  });

  it('a background image replaces the flat colour in the export', () => {
    const m = new EditorModel({ id: 'a', width: 100, height: 100, background: 'a.png' });
    m.setStart('default', 1, 1);
    const json = m.toRoomJSON();
    assert.equal(json.background, 'a.png');
    assert.equal('color' in json, false);
  });
});

describe('a room drawn in the editor loads in the runtime with no hand edits', () => {
  // The workflow of the editor, on the sample picture: wand the floor (the table
  // becomes an obstacle by itself), wand the door and the lamp as hotspots, add a
  // start and a polygon-drawn hotspot, then export.
  const drawRoom = () => {
    const scene = sampleScene();
    const model = new EditorModel({ id: 'sample', width: scene.width, height: scene.height, background: 'sample-room.png' });
    createShapesFromMask(model, floodSelect(scene, 10, 300), 'walkable');
    const [door] = createShapesFromMask(model, floodSelect(scene, 590, 150), 'hotspot');
    const [lamp] = createShapesFromMask(model, floodSelect(scene, 200, 150), 'hotspot');
    model.updateShape(door.uid, { id: 'door', walkTo: { x: 590, y: 270, dir: 'up' } });
    model.updateShape(lamp.uid, { id: 'lamp' });
    model.addShape('hotspot', boxPoints(20, 180, 90, 240), { id: 'sign' });
    model.updateShape(model.shapesOf('walkable')[0].uid, { scale: [[240, 0.6], [360, 1]] });
    model.setStart('default', 60, 330, 'right');
    return { model, json: model.toRoomJSON() };
  };

  it('the wand turns the picture into a floor, an obstacle and two hotspots', () => {
    const { model } = drawRoom();
    assert.deepEqual(model.shapes.map((s) => s.kind), ['walkable', 'obstacle', 'hotspot', 'hotspot', 'hotspot']);
    assert.deepEqual(model.problems(), []);
  });

  it('parseRoom accepts the export as it is', () => {
    const { json } = drawRoom();
    const room = parseRoom(json);
    assert.equal(room.hotspots.length, 3);
    assert.equal(room.obstacles.length, 1);
    assert.equal(room.walkable[0].scale.length, 2);
  });

  it('hotspots hit where the picture shows them', () => {
    const { json } = drawRoom();
    const hotspots = createHotspots(parseRoom(json));
    const byId = Object.fromEntries(hotspots.map((h) => [h.id, h]));
    const d = SAMPLE.door;
    assert.ok(byId.door.hit(590, 150));
    assert.ok(byId.door.hit(d.x1 + 3, d.y1 + 3) && byId.door.hit(d.x2 - 3, d.y2 - 3), 'near the corners');
    assert.ok(!byId.door.hit(d.x1 - 5, 150) && !byId.door.hit(590, d.y2 + 5));
    assert.ok(byId.lamp.hit(200, 150) && byId.lamp.hit(200 + 27, 150));
    assert.ok(!byId.lamp.hit(200 + 36, 150));
    assert.ok(byId.sign.hit(50, 200));
    // every pixel of the door and lamp is hit, within a pixel or two of the edge
    let wrong = 0;
    for (let y = 100; y < 250; y += 3) for (let x = 550; x < 630; x += 3) {
      const inside = x >= d.x1 && x < d.x2 && y >= d.y1 && y < d.y2;
      const nearEdge = Math.min(Math.abs(x - d.x1), Math.abs(x - d.x2), Math.abs(y - d.y1), Math.abs(y - d.y2)) <= 2;
      if (!nearEdge && byId.door.hit(x + 0.5, y + 0.5) !== inside) wrong++;
    }
    assert.equal(wrong, 0);
  });

  it('the hero walks around the table that the wand found, and gets smaller towards the back', async () => {
    const { json } = drawRoom();
    const room = parseRoom(json);
    const nav = Navigator.fromRoom(room);
    assert.equal(nav.isWalkable(340, 300), false, 'inside the table');
    assert.equal(nav.isWalkable(340, 330), true, 'in front of the table');
    assert.equal(nav.isWalkable(340, 100), false, 'the sky');
    const from = { x: 100, y: 295 };
    const to = { x: 600, y: 295 };
    const path = nav.findPath(from, to);
    assert.ok(path.length >= 2, 'a straight line would cross the table');
    let prev = from;
    for (const p of path) { assert.ok(nav.canSee(prev, p)); prev = p; }
    const length = path.reduce((sum, p, i) => sum + dist(i ? path[i - 1] : from, p), 0);
    assert.ok(length < dist(from, to) + 60, `a sensible detour (${length})`);
    assert.ok(nav.scaleAt(300, 250) < nav.scaleAt(300, 350));

    const hero = new Actor({ id: 'hero', x: from.x, y: from.y, navigator: nav, speed: 400 });
    const walk = hero.walkTo(to);
    for (let i = 0; i < 300 && hero.walking; i++) hero.update(20);
    assert.equal(await walk, true);
    assert.deepEqual([Math.round(hero.x), Math.round(hero.y)], [600, 295]);
  });

  it('works through the scene manager and hover tracker like any hand-written room', async () => {
    const { json } = drawRoom();
    const core = createCore();
    const scene = new SceneManager({ ...core, viewWidth: 640, viewHeight: 360, fadeMs: 0, loadRoom: async () => json });
    const hover = new HoverTracker(core.events);
    core.events.on('room:enter', ({ room }) => hover.setHotspots(createHotspots(room)));
    await scene.goTo('sample');
    assert.equal(scene.room.background, 'sample-room.png');
    assert.equal(hover.update(590, 150).id, 'door');
    assert.equal(hover.update(200, 150).id, 'lamp');
    assert.equal(hover.update(400, 20), null);
    assert.ok(pointInPolygon(scene.room.walkable[0].points, 60, 330));
  });
});

describe('the room the editor really exported', () => {
  // tools/editor/sample-room.json is the file the editor's Export button produced for the
  // sample picture (wand for the floor, door and lamp; polygon tool for the sign), untouched.
  const json = JSON.parse(fs.readFileSync(new URL('../tools/editor/sample-room.json', import.meta.url), 'utf8'));

  it('loads in the runtime as it is', () => {
    const room = parseRoom(json);
    assert.deepEqual(room.hotspots.map((h) => h.id), ['door', 'lamp', 'sign']);
    assert.deepEqual(room.walkable[0].points, [[0, 240], [640, 240], [640, 360], [0, 360]], 'the floor outline is exact');
    assert.deepEqual(room.obstacles[0].points.map((p) => p.join()).sort(), ['300,270', '300,320', '380,270', '380,320'], 'so is the table');
    assert.deepEqual(room.walkable[0].scale, [[240, 0.6], [360, 1]]);
    assert.equal(room.background, 'sample-room.png');
  });

  it('opens in the editor again without losing anything', () => {
    assert.deepEqual(EditorModel.fromRoomJSON(json).toRoomJSON(), json);
    assert.deepEqual(EditorModel.fromRoomJSON(json).problems(), []);
  });

  it('plays: hover, walls and walking behave as drawn', () => {
    const room = parseRoom(json);
    const nav = Navigator.fromRoom(room);
    const byId = Object.fromEntries(createHotspots(room).map((h) => [h.id, h]));
    assert.ok(byId.door.hit(590, 150) && byId.lamp.hit(200, 150) && byId.sign.hit(50, 210));
    assert.equal(nav.isWalkable(340, 295), false, 'the table blocks');
    const start = room.starts.default;
    const path = nav.findPath(start, { x: 600, y: 300 });
    assert.ok(path.length > 1, 'it has to go around the table');
  });
});
