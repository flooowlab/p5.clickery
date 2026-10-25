// Reads the JSDoc comments in src/ (with the jsdoc tool's JSON output) and sorts them into what
// the docs pages show: classes with their members, plain functions, and types.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function loadDoclets(root) {
  const bin = path.join(root, 'node_modules', 'jsdoc', 'jsdoc.js');
  const json = execFileSync(process.execPath, [bin, '-X', '-r', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
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
  return { classes, functions, types, byId };
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
