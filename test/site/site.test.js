// The website's promises: every lesson runs, lessons only use documented API, and the list of
// exports without a JSDoc comment can only get shorter (test/site/undocumented.txt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as clickery from '../../src/index.js';
import { loadDoclets, organise } from '../../tools/site/jsdoc.mjs';
import { loadLessons, checkLessons } from '../../tools/site/lessons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const model = organise(loadDoclets(root));
const lessons = loadLessons(path.join(root, 'site', 'learn'));

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

// Runs a lesson's sketch without p5: setup() on a headless Game, stepping game time until it finishes.
async function runSetup(code) {
  const games = [];
  const createGame = (options) => {
    const game = new clickery.Game({ storage: memoryStorage(), ...options });
    game.draw = () => {};
    games.push(game);
    return game;
  };
  const { setup } = new Function('createGame', `${code}\n;return { setup: typeof setup === 'function' ? setup : null };`)(createGame);
  assert.ok(setup, 'the sketch defines setup()');
  let finished = false;
  const running = Promise.resolve(setup()).finally(() => { finished = true; });
  const started = Date.now();
  while (!finished) {
    for (const game of games) game.update(100);
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(Date.now() - started < 5000, 'setup() did not finish within 5 seconds');
  }
  await running;
}

test('lessons only cover names that exist in the JSDoc, and every page has a sketch', () => {
  assert.deepEqual(checkLessons(lessons, model.byId), []);
});

const gameMembers = new Set(model.classes.find((c) => c.doc.name === 'Game').members.map((m) => m.name));

for (const lesson of lessons) {
  lesson.pages.forEach((page, i) => {
    test(`lesson ${lesson.slug} page ${i} "${page.title}" runs`, async () => {
      await runSetup(page.code);
    });
    test(`lesson ${lesson.slug} page ${i} "${page.title}" only uses documented game members`, () => {
      const used = new Set([...page.code.matchAll(/\bgame\.(\w+)/g)].map((m) => m[1]));
      assert.deepEqual([...used].filter((name) => !gameMembers.has(name)), []);
    });
  });
}

test('every export is documented, or on the shrinking list of exports still to document', () => {
  const file = path.join(root, 'test', 'site', 'undocumented.txt');
  const listed = new Set(fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
  const undocumented = Object.keys(clickery).filter((name) => !model.byId.has(name));
  const newlyMissing = undocumented.filter((name) => !listed.has(name));
  const nowDocumented = [...listed].filter((name) => !undocumented.includes(name));
  assert.deepEqual(newlyMissing, [], 'these exports have no JSDoc comment: document them (src/ uses /** */)');
  assert.deepEqual(nowDocumented, [], 'these are documented now: delete them from test/site/undocumented.txt');
});
