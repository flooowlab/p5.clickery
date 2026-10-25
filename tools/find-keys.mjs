// Lists the text keys a game uses and compares them with its strings:
//
//   node tools/find-keys.mjs --strings strings.en.json rooms scripts
//   node tools/find-keys.mjs --strings en.json --strings it.json rooms scripts
//
// Folders are searched for room files (*.json with a "hotspots" list) and scripts (*.js, *.mjs).
// It reports keys that are used but not defined (the [key] you would otherwise find by playing),
// keys that are defined but never used, and, with two or more languages, keys one language lacks.
//
//   --strings file.json   a strings file (key: text); repeat it for each language
//   --ignore prefix       leave keys starting with this out of the "unused" list (repeatable)
//   --strict              unused keys and language gaps fail too, not just missing keys
//
// Exits with 1 when a used key is missing, so it can fail a build.
import fs from 'node:fs';
import path from 'node:path';
import { findKeys, DEFAULT_IGNORE } from './lib/find-keys.mjs';

const args = process.argv.slice(2);
const stringFiles = [];
const paths = [];
const ignore = [...DEFAULT_IGNORE];
let strict = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--strings') stringFiles.push(args[++i]);
  else if (args[i] === '--ignore') ignore.push(args[++i]);
  else if (args[i] === '--strict') strict = true;
  else paths.push(args[i]);
}
if (!paths.length) {
  console.error('usage: node tools/find-keys.mjs [--strings file.json]... [--ignore prefix]... [--strict] folder-or-file ...');
  process.exit(2);
}

const languages = {};
for (const file of stringFiles) {
  const name = path.basename(file, '.json').replace(/^strings[.-]?/, '') || path.basename(file, '.json');
  languages[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
}
const isStringsFile = (file) => stringFiles.some((s) => path.resolve(s) === path.resolve(file));

const rooms = [];
const scripts = [];
function visit(file) {
  if (fs.statSync(file).isDirectory()) {
    for (const name of fs.readdirSync(file)) if (name !== 'node_modules' && !name.startsWith('.')) visit(path.join(file, name));
  } else if (isStringsFile(file)) {
    // the strings are compared against, not scanned
  } else if (/\.json$/.test(file) && !/\.ink\.json$/.test(file)) {
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(json.hotspots)) rooms.push({ file, json });
    } catch { /* not JSON we can read: ignore */ }
  } else if (/\.m?js$/.test(file)) {
    scripts.push({ file, text: fs.readFileSync(file, 'utf8') });
  }
}
paths.forEach(visit);

const { used, missing, unused, gaps } = findKeys({ rooms, scripts, languages, ignore });
const names = Object.keys(languages);
let failed = false;

console.log(`${used.size} text keys used in ${rooms.length} room file${rooms.length === 1 ? '' : 's'} and ${scripts.length} script${scripts.length === 1 ? '' : 's'}`);
if (!names.length) {
  for (const [key, where] of [...used].sort()) console.log(`  ${key}   ${where[0]}${where.length > 1 ? ` (+${where.length - 1})` : ''}`);
  process.exit(0);
}
for (const name of names) {
  for (const key of missing[name]) { console.log(`${name}: missing  ${key}   used at ${used.get(key)[0]}`); failed = true; }
  for (const key of unused[name]) { console.log(`${name}: unused   ${key}`); if (strict) failed = true; }
}
for (const gap of gaps) { console.log(`gap: ${gap.key} is in ${gap.has.join(', ')} but not in ${gap.lacks.join(', ')}`); if (strict) failed = true; }
if (!failed) console.log('all used keys are defined');
process.exit(failed ? 1 : 0);
