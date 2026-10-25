import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findKeys, keysInScript, keysInRoom } from '../../tools/lib/find-keys.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const keys = (text) => keysInScript(text).map((k) => k.key);

test('finds keys passed to say, t and translate, with the line they are on', () => {
  const found = keysInScript("await ctx.say('door.locked');\n\nconst a = game.i18n.t('door.look', { name: 'x' });\nhero.say(\"door.open\");");
  assert.deepEqual(found, [
    { key: 'door.locked', line: 1 },
    { key: 'door.look', line: 3 },
    { key: 'door.open', line: 4 },
  ]);
});

test('finds keys on both sides of a ternary, and in the first argument only', () => {
  assert.deepEqual(keys("c.say(game.flag('lit') ? 'lamp.glows' : 'lamp.cold')"), ['lamp.glows', 'lamp.cold']);
  assert.deepEqual(keys("c.say('door.locked', { ms: 'slow.maybe' })"), ['door.locked']);
});

test('skips text shown as it is, and words that are not keys', () => {
  assert.deepEqual(keys("hero.say('Hello there, traveller', { literal: true })"), []);
  assert.deepEqual(keys("hero.say('No dots here and spaces', { ms: 500 })"), []);
  assert.deepEqual(keys("hero.say('hello', { literal: true })"), []);
  assert.deepEqual(keys("hero.say('hello')"), ['hello']); // a lone word counts as a key
  assert.deepEqual(keys("x.say(a === 'en' ? 'Hi' : 'Ciao')"), []); // words inside an expression do not
});

test('finds name keys in room objects written as code, only when they look like keys', () => {
  assert.deepEqual(keys("{ id: 'sign', name: 'obj.sign' }, { name: 'Ada' }"), ['obj.sign']);
});

test('a hotspot with no name uses its id as the key', () => {
  assert.deepEqual(keysInRoom({ hotspots: [{ id: 'sign', name: 'obj.sign' }, { id: 'lamp' }] }).map((k) => k.key), ['obj.sign', 'lamp']);
});

test('reports keys that are missing and keys that are never used', () => {
  const result = findKeys({
    rooms: [{ file: 'hall.json', json: { hotspots: [{ id: 'door', name: 'obj.door' }, { id: 'lamp', name: 'obj.lamp' }] } }],
    scripts: [{ file: 'door.js', text: "ctx.say('door.locked');" }],
    languages: { en: { 'obj.door': 'Door', 'door.locked': 'Locked.', 'old.thing': 'Not used', 'default.use': "I can't", 'item.key': 'key' } },
  });
  assert.deepEqual(result.missing.en, ['obj.lamp']);
  assert.deepEqual(result.unused.en, ['old.thing']); // default.* and item.* are left out
  assert.deepEqual(result.used.get('door.locked'), ['door.js:1']);
  assert.deepEqual(result.used.get('obj.door'), ['hall.json (hotspot "door")']);
});

test('with several languages, reports the keys one of them lacks', () => {
  const result = findKeys({
    scripts: [{ file: 'a.js', text: "say('a.one'); say('a.two');" }],
    languages: { en: { 'a.one': 'One', 'a.two': 'Two' }, it: { 'a.one': 'Uno' } },
  });
  assert.deepEqual(result.missing.it, ['a.two']);
  assert.deepEqual(result.gaps, [{ key: 'a.two', has: ['en'], lacks: ['it'] }]);
});

test('the command scans folders, names the languages after the files, and fails on a missing key', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-keys-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.writeFileSync(path.join(dir, 'scripts', 'door.js'), "export const onInteract = (c) => c.say('door.locked');\n");
  fs.writeFileSync(path.join(dir, 'hall.json'), JSON.stringify({ id: 'hall', hotspots: [{ id: 'door', name: 'obj.door' }] }));
  fs.writeFileSync(path.join(dir, 'strings.en.json'), JSON.stringify({ 'obj.door': 'Door' }));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'tools', 'find-keys.mjs'), ...args], { encoding: 'utf8' });

  const bad = run('--strings', path.join(dir, 'strings.en.json'), dir);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /en: missing  door\.locked/);
  assert.match(bad.stdout, /2 text keys used in 1 room file and 1 script/);

  fs.writeFileSync(path.join(dir, 'strings.en.json'), JSON.stringify({ 'obj.door': 'Door', 'door.locked': 'Locked.', 'spare.key': 'x' }));
  const ok = run('--strings', path.join(dir, 'strings.en.json'), dir);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /en: unused   spare\.key/);
  assert.equal(run('--strict', '--strings', path.join(dir, 'strings.en.json'), dir).status, 1);
  assert.equal(run().status, 2);
  fs.rmSync(dir, { recursive: true });
});

test('the Lighthouse example uses only keys it defines', () => {
  const out = spawnSync(process.execPath, ['tools/find-keys.mjs', '--strict', '--strings', 'examples/lighthouse/strings.en.json', 'examples/lighthouse'], { cwd: root, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stdout);
  assert.match(out.stdout, /all used keys are defined/);
});
