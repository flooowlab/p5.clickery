// Reads the JSDoc comments in src/ (with the jsdoc tool's JSON output) and sorts them into what
// the docs pages show: classes with their members, plain functions, and types.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function loadDoclets(root) {
  const bin = path.join(root, 'node_modules', 'jsdoc', 'jsdoc.js');
  let json;
  try {
    json = execFileSync(process.execPath, [bin, '-X', '-r', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    // jsdoc's stderr names the file, line and tag; the rest of the error is a dump of its output
    throw new Error(`jsdoc failed:\n${String(err.stderr).split('\n').filter((l) => l.startsWith('ERROR')).join('\n') || err.message}`);
  }
  return JSON.parse(json).filter((d) => !d.undocumented && !d.ignore && d.kind !== 'package'
    && d.access !== 'private' && !String(d.name).startsWith('#'));
}

// { classes: [{ doc, members }], functions: [doc], types: [doc], byId: Map(longname -> doc) }
export function organise(doclets) {
  const byId = new Map(doclets.map((d) => [d.longname, d]));
  const classes = doclets.filter((d) => d.kind === 'class').map((doc) => ({
    doc,
    // properties first, then methods; each in the order they are written in the source
    members: doclets.filter((d) => d.memberof === doc.longname && d.kind !== 'class')
      .sort((a, b) => Number(a.kind === 'function') - Number(b.kind === 'function')),
  }));
  const functions = doclets.filter((d) => d.kind === 'function' && !d.memberof);
  const types = doclets.filter((d) => d.kind === 'typedef');
  const constants = doclets.filter((d) => d.kind === 'constant' && !d.memberof);
  return { classes, functions, types, constants, byId };
}

// The docs are grouped by the part of the library an entry lives in (its src/ folder).
const AREAS = [
  ['src', 'Game'], ['game', 'Game'], ['scene', 'Rooms'], ['hit', 'Hotspots'], ['actor', 'Actors'], ['nav', 'Navigation'],
  ['interact', 'Interaction'], ['script', 'Scripts'], ['dialogue', 'Dialogue'], ['ui', 'Screen'], ['audio', 'Audio'],
  ['core', 'Core'], ['debug', 'Debug'],
];
export const AREA_ORDER = [...new Set(AREAS.map(([, label]) => label))];

export function areaOf(doc) {
  const folder = String(doc.meta?.path ?? '').split(/[\\/]/).at(-1);
  return AREAS.find(([dir]) => dir === folder)?.[1] ?? 'Other';
}

// [[area, docs], ...] in the order of AREA_ORDER, leaving out empty areas.
export function byArea(docs, get = (d) => d) {
  const order = [...AREA_ORDER, 'Other'];
  return order.map((area) => [area, docs.filter((d) => areaOf(get(d)) === area)]).filter(([, list]) => list.length);
}

export const typeText = (type) => (type?.names?.length ? type.names.join(' | ') : '');

// How a member is written in code: game.say(key, [options]), createGame([options]), game.debug.
export function signature(doc, owner) {
  const instance = owner ? owner.charAt(0).toLowerCase() + owner.slice(1) : '';
  const prefix = doc.scope === 'instance' ? `${instance}.` : doc.scope === 'static' ? `${owner}.` : '';
  if (doc.kind !== 'function' && doc.kind !== 'class') return `${prefix}${doc.name}`;
  const params = (doc.params ?? []).filter((p) => !p.name.includes('.')).map((p) => (p.optional ? `[${p.name}]` : p.name));
  const name = doc.kind === 'class' ? `new ${doc.name}` : `${prefix}${doc.name}`;
  return `${name}(${params.join(', ')})`;
}

export const anchor = (longname) => longname.replace(/[#.~]/g, '-');
