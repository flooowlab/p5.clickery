// Finds the text keys a game uses and compares them with the strings it defines.
// Used by tools/find-keys.mjs.
//
// Keys are found in room files (every hotspot's name, or its id when it has none) and in scripts
// (`say('key')`, `t('key')`, `name: 'obj.key'`). A key built at run time, such as `item.${id}`,
// cannot be seen, so a string like that may be reported as unused. Calls with `{ literal: true }`
// show text as it is and are skipped.

// Keys the library itself looks up, and item names that a game makes from its `items` option.
export const DEFAULT_IGNORE = ['default.', 'ui.', 'verb.', 'item.'];

const CALL = /\b(?:say|t|translate)\(/g;
const NAME = /\bname\s*:\s*(['"])([A-Za-z][\w-]*\.[\w.-]+)\1/g;
const LITERAL = /(['"`])([A-Za-z][\w.-]*)\1/g;

// The text between the parentheses that open at `start`, and where the first argument ends.
function argumentsOf(text, start) {
  let depth = 1;
  let firstEnd = null;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (--depth === 0) return { first: text.slice(start, firstEnd ?? i), rest: firstEnd === null ? '' : text.slice(firstEnd, i) }; }
    else if (c === ',' && depth === 1 && firstEnd === null) firstEnd = i;
  }
  return null;
}

/** Keys used in script text: `[{ key, line }]`. */
export function keysInScript(text) {
  const found = [];
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  for (const m of text.matchAll(CALL)) {
    const args = argumentsOf(text, m.index + m[0].length);
    if (!args || /literal\s*:\s*true/.test(args.rest)) continue;
    const alone = /^\s*(['"`])[A-Za-z][\w.-]*\1\s*$/.test(args.first);
    // a whole argument can be a word ('hello'); inside an expression, such as a ternary, only dotted keys count
    for (const lit of args.first.matchAll(LITERAL)) {
      if (alone || lit[2].includes('.')) found.push({ key: lit[2], line: lineOf(m.index) });
    }
  }
  for (const m of text.matchAll(NAME)) found.push({ key: m[2], line: lineOf(m.index) });
  return found;
}

/** Keys used by a room: the name of each hotspot, or its id. */
export function keysInRoom(room) {
  return (room.hotspots ?? []).map((h) => ({ key: h.name ?? h.id, line: null, what: `hotspot "${h.id}"` }));
}

/**
 * @param {Object} input
 * @param {Array<{file: string, json: Object}>} [input.rooms]
 * @param {Array<{file: string, text: string}>} [input.scripts]
 * @param {Object<string, Object<string,string>>} [input.languages] Strings by language: `{ en: { key: text } }`.
 * @param {string[]} [input.ignore] Key prefixes to leave out of the "unused" list.
 * @returns {{used: Map<string, string[]>, missing: Object<string,string[]>, unused: Object<string,string[]>, gaps: Array<{key: string, has: string[], lacks: string[]}>}}
 */
export function findKeys({ rooms = [], scripts = [], languages = {}, ignore = DEFAULT_IGNORE }) {
  const used = new Map();
  const add = (key, where) => used.set(key, [...(used.get(key) ?? []), where]);
  for (const { file, json } of rooms) for (const k of keysInRoom(json)) add(k.key, `${file} (${k.what})`);
  for (const { file, text } of scripts) for (const k of keysInScript(text)) add(k.key, `${file}:${k.line}`);

  const names = Object.keys(languages);
  const missing = {};
  const unused = {};
  for (const name of names) {
    const defined = new Set(Object.keys(languages[name]));
    missing[name] = [...used.keys()].filter((k) => !defined.has(k)).sort();
    unused[name] = [...defined].filter((k) => !used.has(k) && !ignore.some((p) => k.startsWith(p))).sort();
  }

  const everyKey = new Set(names.flatMap((n) => Object.keys(languages[n])));
  const gaps = [];
  if (names.length > 1) {
    for (const key of [...everyKey].sort()) {
      const has = names.filter((n) => key in languages[n]);
      if (has.length !== names.length) gaps.push({ key, has, lacks: names.filter((n) => !has.includes(n)) });
    }
  }
  return { used, missing, unused, gaps };
}
