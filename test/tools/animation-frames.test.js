import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrameList, sheetGrid, frameRect, checkAnimations, buildSnippet } from '../../tools/animation/frames.js';
import { AnimationState } from '../../src/index.js';

test('a frame list is numbers and ranges, in the order written', () => {
  assert.deepEqual(parseFrameList('0, 2, 4'), [0, 2, 4]);
  assert.deepEqual(parseFrameList('4-7'), [4, 5, 6, 7]);
  assert.deepEqual(parseFrameList('0, 4-6, 9'), [0, 4, 5, 6, 9]);
  assert.deepEqual(parseFrameList('3-1'), [3, 2, 1]);
  assert.deepEqual(parseFrameList('2 - 4'), [2, 3, 4]);
  assert.deepEqual(parseFrameList(''), []);
  assert.throws(() => parseFrameList('1, x'), /"x" is not a frame number/);
  assert.throws(() => parseFrameList('1-'), /not a frame number/);
  assert.throws(() => parseFrameList('-3'), /not a frame number/);
});

test('the grid of a sheet and the rectangle of a frame', () => {
  assert.deepEqual(sheetGrid(256, 192, 64, 64), { columns: 4, rows: 3, count: 12 });
  assert.deepEqual(sheetGrid(100, 100, 64, 64), { columns: 1, rows: 1, count: 1 });
  assert.deepEqual(sheetGrid(256, 192, 0, 64), { columns: 0, rows: 0, count: 0 });
  assert.deepEqual(frameRect(5, 64, 48, 4), { x: 64, y: 48, w: 64, h: 48 });
  assert.deepEqual(frameRect(0, 64, 48, 4), { x: 0, y: 0, w: 64, h: 48 });
});

test('good animations have no warnings', () => {
  const animations = {
    idle: { frames: [0], delay: 200, loop: true },
    walk_right: { frames: [4, 5, 6, 7], delay: 120, loop: true },
    talk: { frames: [8, 9], delay: 150, loop: true },
  };
  assert.deepEqual(checkAnimations(animations, 12), []);
});

test('mistakes are explained', () => {
  const warnings = checkAnimations({
    run_right: { frames: [0], delay: 100, loop: true },
    walk_sideways: { frames: [1], delay: 100, loop: true },
    walk_up: { frames: [], delay: 100, loop: true },
    talk: { frames: [3, 40], delay: 0, loop: true },
  }, 12).join('\n');
  assert.match(warnings, /"run_right": a name starts with idle, walk, talk/);
  assert.match(warnings, /"walk_sideways": "sideways" is not a direction/);
  assert.match(warnings, /"walk_up" has no frames/);
  assert.match(warnings, /"talk" uses frame 40, but the sheet has only 12 \(0 to 11\)/);
  assert.match(warnings, /"talk": the delay must be above 0/);
  assert.match(warnings, /no idle animation/);
  assert.match(checkAnimations({}, 12).join(), /no animations yet/);
});

test('the snippet is code for the hero option, and it is valid JavaScript', () => {
  const code = buildSnippet({
    file: 'art/hero.png', frameWidth: 32, frameHeight: 48, columns: 8, directions: 4,
    animations: {
      idle: { frames: [0], delay: 200, loop: true },
      walk_right: { frames: [4, 5, 6, 7], delay: 120, loop: true },
      wave: { frames: [9, 10], delay: 100, loop: false },
    },
  });
  assert.match(code, /await loadImage\("art\/hero\.png"\)/);
  assert.match(code, /sheet\.get\(\(i % 8\) \* 32, Math\.floor\(i \/ 8\) \* 48, 32, 48\)/);
  assert.match(code, /walk_right: \{ frames: \[4, 5, 6, 7\]\.map\(frame\), delay: 120 \},/);
  assert.match(code, /wave: \{ frames: \[9, 10\]\.map\(frame\), delay: 100, loop: false \},/);
  assert.match(code, /directions: 4,/);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  assert.doesNotThrow(() => new AsyncFunction('loadImage', 'createGame', code));
});

test('the generated animations really play: the library picks them by state and direction', async () => {
  const frames = [4, 5, 6, 7];
  const anim = new AnimationState({ idle: { frames: [0], delay: 200 }, walk_right: { frames, delay: 100 } });
  anim.set('walk');
  anim.face('left'); // there is no walk_left: the right-facing frames are used, flipped
  anim.update(0);
  assert.equal(anim.current.key, 'walk_right');
  assert.equal(anim.flip, true);
  anim.update(250);
  assert.equal(anim.frame, 6);
  anim.set('idle');
  assert.equal(anim.current.key, 'idle');
});
