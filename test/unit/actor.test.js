import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Navigator, Actor, AnimationState, I18n, parseRoom, directionFromVector, mirrorDirection, dist,
} from '../../src/index.js';

const box = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

// A floor 400x100 with a table that leaves only a corridor along the top.
const tableRoom = () => parseRoom({
  id: 'r', width: 400, height: 300, starts: { default: { x: 0, y: 0 } },
  walkable: [{ id: 'floor', points: box(0, 200, 400, 300), scale: [[200, 0.5], [300, 1]] }],
  obstacles: [{ id: 'table', points: box(150, 230, 250, 300) }],
});

const pathLength = (from, path) => path.reduce((sum, p, i) => sum + dist(i ? path[i - 1] : from, p), 0);

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
