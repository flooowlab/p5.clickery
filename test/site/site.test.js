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
import { loadTools, checkTools } from '../../tools/site/tools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const model = organise(loadDoclets(root));
const lessons = loadLessons(path.join(root, 'site', 'learn'));

test('every tool has a title, a summary and a status, and the pages it opens exist', () => {
  const tools = loadTools(path.join(root, 'site', 'tools'));
  assert.deepEqual(checkTools(tools), []);
  assert.ok(tools.some((t) => t.status === 'available'));
  for (const t of tools.filter((x) => x.open)) {
    const target = t.open.split('?')[0];
    const lesson = target.match(/^learn\/(.+)\.html$/);
    const found = lesson ? lessons.some((l) => l.slug === lesson[1]) : fs.existsSync(path.join(root, target));
    assert.ok(found, `tools/${t.file} opens "${t.open}", which does not exist`);
  }
});

test('everything the published examples and the editor load from src, dist or node_modules is copied into the site', () => {
  const build = fs.readFileSync(path.join(root, 'tools', 'build-site.mjs'), 'utf8');
  const copied = [...build.matchAll(/copy\('([^']+)'/g)].map((m) => m[1]);
  const nodeModules = [...build.matchAll(/'((?:p5|inkjs)\/[^']+)'/g)].map((m) => `node_modules/${m[1]}`);
  const roots = new Set([...copied, ...nodeModules]);
  const covered = (ref) => [...roots].some((r) => ref === r || ref.startsWith(`${r}/`));

  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(js|mjs|html)$/.test(e.name)) files.push(rel);
    }
  };
  walk('examples');
  for (const dir of ['editor', 'dialogue', 'animation']) walk(`tools/${dir}`);

  const missing = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, ups, ref] of text.matchAll(/['"`]((?:\.\.\/)+)((?:src|dist|node_modules)\/[^'"`?#]*)/g)) {
      const from = path.posix.dirname(file);
      const resolved = path.posix.normalize(`${from}/${ups}${ref}`);
      if (resolved.startsWith('..')) continue;
      if (!covered(resolved)) missing.push(`${file} loads ${resolved}`);
    }
  }
  assert.deepEqual(missing, [], 'copy these into the site in tools/build-site.mjs');
});

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
  // the script tag puts the whole library on p5.clickery
  // plain p5 calls that a setup() may make are stubbed; there is no canvas here
  const stubs = { createCanvas: () => {}, background: () => {}, frameRate: () => {} };
  const { setup } = new Function('createGame', 'p5', ...Object.keys(stubs), `${code}\n;return { setup: typeof setup === 'function' ? setup : null };`)(createGame, { clickery }, ...Object.values(stubs));
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
