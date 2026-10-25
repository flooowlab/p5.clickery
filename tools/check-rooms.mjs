// Checks room JSON files for mistakes (see tools/lib/check-room.mjs):
//
//   node tools/check-rooms.mjs rooms/*.json
//   node tools/check-rooms.mjs --strings strings.json rooms/hall.json rooms/cellar.json
//   node tools/check-rooms.mjs --strict rooms/*.json     (warnings fail too)
//
// Exits with 1 when a room has an error (or, with --strict, a warning), so it can fail a build.
import fs from 'node:fs';
import { checkRoom } from './lib/check-room.mjs';

const args = process.argv.slice(2);
const files = [];
let strings = null;
let strict = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--strings') strings = JSON.parse(fs.readFileSync(args[++i], 'utf8'));
  else if (args[i] === '--strict') strict = true;
  else files.push(args[i]);
}
if (!files.length) {
  console.error('usage: node tools/check-rooms.mjs [--strings strings.json] [--strict] room.json ...');
  process.exit(2);
}

let errors = 0;
let warnings = 0;
for (const file of files) {
  let problems;
  try {
    problems = checkRoom(JSON.parse(fs.readFileSync(file, 'utf8')), { strings });
  } catch (err) {
    problems = [{ level: 'error', message: `cannot read the file: ${err.message}` }];
  }
  for (const { level, message } of problems) {
    console.log(`${file}: ${level}: ${message}`);
    if (level === 'error') errors++;
    else warnings++;
  }
}
console.log(`${files.length} room file${files.length === 1 ? '' : 's'} checked: ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
process.exit(errors || (strict && warnings) ? 1 : 0);
