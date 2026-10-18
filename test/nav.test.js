import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Navigator, Actor, AnimationState, I18n, parseRoom, scaleFromStops, sortByBaseline,
  directionFromVector, mirrorDirection, dist, segmentsCross, closestPointOnSegment,
} from '../src/index.js';

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

describe('animation', () => {
  it('maps vectors to 4 and 8 directions', () => {
    assert.equal(directionFromVector(0, -1), 'up');
    assert.equal(directionFromVector(1, -1), 'up_right');
    assert.equal(directionFromVector(-1, 0), 'left');
    assert.equal(directionFromVector(1, 1), 'down_right');
    assert.equal(directionFromVector(0, 1, 4), 'down');
    assert.equal(directionFromVector(3, 1, 4), 'right');
    assert.equal(mirrorDirection('up_left'), 'up_right');
    assert.equal(mirrorDirection('down'), 'down');
  });

  it('falls back to mirrors, diagonal sides, then the plain state', () => {
    const a = new AnimationState({ walk_right: { frames: ['R'] }, walk_down: { frames: ['D'] }, idle: { frames: ['I'] } });
    a.set('walk');
    a.face('right');
    assert.deepEqual([a.frame, a.flip], ['R', false]);
    a.face('left');
    assert.deepEqual([a.frame, a.flip], ['R', true]);
    a.face('down_left');
    assert.deepEqual([a.frame, a.flip], ['R', true]);
    a.face('up');
    a.set('idle');
    assert.deepEqual([a.frame, a.flip], ['I', false]);
    a.set('talk');
    assert.equal(a.frame, null);
  });

  it('advances frames with time, loops, or holds the last frame', () => {
    const a = new AnimationState({
      walk: { frames: [0, 1, 2], delay: 100 },
      talk: { frames: [0, 1], delay: 100, loop: false },
    });
    a.set('walk');
    a.update(0);
    assert.equal(a.frame, 0);
    a.update(250);
    assert.equal(a.frame, 2);
    a.update(100);
    assert.equal(a.frame, 0);
    a.set('talk');
    a.update(1000);
    assert.equal(a.frame, 1);
    assert.ok(a.finished);
  });
});

describe('Actor', () => {
  const make = (extra = {}) => new Actor({ id: 'hero', x: 20, y: 280, navigator: Navigator.fromRoom(tableRoom()), speed: 100, ...extra });
  const run = (actor, ms, step = 20) => { for (let t = 0; t < ms; t += step) actor.update(step); };

  it('walks around the table, resolves true, and ends facing the requested way', async () => {
    const hero = make();
    const arrived = hero.walkTo({ x: 380, y: 280, dir: 'up' });
    assert.equal(hero.mode, 'walk');
    let minY = Infinity;
    for (let i = 0; i < 1000 && hero.walking; i++) {
      hero.update(20);
      minY = Math.min(minY, hero.y);
      assert.ok(hero.navigator.isWalkable(hero.x, hero.y), `off floor at ${hero.x},${hero.y}`);
    }
    assert.equal(await arrived, true);
    assert.deepEqual([hero.x, hero.y], [380, 280]);
    assert.ok(minY < 232, 'went around the top of the table');
    assert.equal(hero.dir, 'up');
    assert.equal(hero.mode, 'idle');
  });

  it('is scaled by depth: slower far away, faster near', () => {
    const far = make({ x: 0, y: 200 });
    far.walkTo({ x: 100, y: 200 });
    run(far, 1000);
    assert.ok(Math.abs(far.x - 50) < 0.5, `far x ${far.x}`);
    const near = make({ x: 0, y: 299 });
    near.walkTo({ x: 100, y: 299 });
    run(near, 1000);
    assert.ok(near.x > 99 && near.x < 100, `near x ${near.x}`);
    assert.equal(far.scale, 0.5);
    assert.ok(near.scale > 0.99);
  });

  it('a new walk resolves the old one false; unreachable resolves false', async () => {
    const hero = make();
    const first = hero.walkTo({ x: 380, y: 280 });
    const second = hero.walkTo({ x: 30, y: 285 });
    assert.equal(await first, false);
    run(hero, 500);
    assert.equal(await second, true);
    const island = new Actor({ id: 'i', x: 10, y: 10, speed: 100, navigator: new Navigator({ areas: [{ id: 'a', points: box(0, 0, 50, 50) }, { id: 'b', points: box(200, 0, 250, 50) }] }) });
    assert.equal(await island.walkTo({ x: 220, y: 10 }), false);
  });

  it('teleport cancels a walk', async () => {
    const hero = make();
    const p = hero.walkTo({ x: 380, y: 280 });
    hero.teleport(5, 250);
    assert.equal(await p, false);
    assert.deepEqual([hero.x, hero.y, hero.mode], [5, 250, 'idle']);
  });

  it('say shows a translated line, times out, and can be skipped or sped up', async () => {
    const i18n = new I18n({ en: { 'door.locked': 'It is locked.' } });
    const hero = make({ translate: (k) => i18n.t(k) });
    const done = hero.say('door.locked');
    assert.equal(hero.speech.text, 'It is locked.');
    assert.equal(hero.mode, 'talk');
    run(hero, 1100);
    assert.ok(hero.speech);
    run(hero, 200);
    assert.equal(await done, true);
    assert.equal(hero.speech, null);
    assert.equal(hero.mode, 'idle');

    const skipped = hero.say('missing.key');
    assert.equal(hero.speech.text, '[missing.key]');
    hero.skipSpeech();
    assert.equal(await skipped, true);

    hero.textSpeed = 4;
    const fast = hero.say('door.locked');
    run(hero, 400);
    assert.equal(await fast, true);
  });

  it('a newer line ends the previous one; update drives the animation state', async () => {
    const hero = make({ animations: { talk: { frames: ['t'] }, idle: { frames: ['i'] }, walk: { frames: ['w'] } } });
    const a = hero.say('one');
    hero.say('two');
    assert.equal(await a, true);
    assert.equal(hero.speech.key, 'two');
    hero.update(0);
    assert.equal(hero.anim.frame, 't');
    hero.stop();
    hero.update(0);
    assert.equal(hero.anim.frame, 'i');
    hero.walkTo({ x: 100, y: 280 });
    hero.update(20);
    assert.equal(hero.anim.frame, 'w');
  });

  it('saves and restores position and facing', () => {
    const hero = make();
    hero.face('left');
    hero.teleport(200, 250);
    const saved = JSON.parse(JSON.stringify(hero.toJSON()));
    const other = make();
    other.fromJSON(saved);
    assert.deepEqual(other.toJSON(), { x: 200, y: 250, dir: 'left' });
  });

  it('works without a navigator (straight line)', async () => {
    const hero = new Actor({ id: 'h', x: 0, y: 0, speed: 100 });
    const p = hero.walkTo({ x: 100, y: 0 });
    run(hero, 1100);
    assert.equal(await p, true);
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
