// Shared pieces of the dialogue adapters.

/**
 * A line of conversation, as a runner returns it.
 *
 * @typedef {Object} DialogueLine
 * @property {string|null} speaker Who says it, or `null` for narration.
 * @property {string} text What is said.
 * @property {Object<string, (string|boolean)>} tags Extra information such as `{ sfx: 'alarm' }`. A tag with no value is `true`.
 */

/**
 * What every dialogue adapter (Markdown, Twine, Ink) implements, so the game can play any of them
 * the same way ({@link Game#talk} does). Run it by hand to build your own dialogue screen:
 * call `next()` until it returns `null`, then either `choices()` to ask the player or stop if `done`.
 *
 * @typedef {Object} DialogueRunner
 * @property {function(): (DialogueLine|null)} next The next line, or `null` when the runner is waiting for a choice or has finished.
 * @property {function(): Array<{index: number, text: string}>} choices The options while waiting for a choice, otherwise an empty list.
 * @property {function(number): void} choose Picks option `index`. Call `next()` again afterwards.
 * @property {Object} vars The conversation's variables. They live in the state store (as `vars.<name>`) when one was given, so they are saved with the game.
 * @property {boolean} done `true` once the conversation has ended.
 */

/**
 * Splits `Speaker: text` into the speaker and the text. The colon needs a space after it, and the
 * speaker is a short name. A line with no speaker comes back with `speaker: null`; write the line
 * without one when the text itself starts with something like `Note: `.
 * @param {string} line
 * @returns {{speaker: string|null, text: string}}
 * @example
 * splitSpeaker('Guard: Halt!'); // { speaker: 'Guard', text: 'Halt!' }
 */
export function splitSpeaker(line) {
  const m = /^([A-Za-z][\w .'-]{0,29}):\s+(.*)$/s.exec(line);
  return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line };
}

/**
 * Turns a list of tags into an object. A tag is `key:value`, or just a word, which becomes `true`.
 * @param {string[]} list
 * @returns {Object<string, (string|boolean)>}
 * @example
 * parseTags(['sfx:alarm', 'speaker: Guard', 'loud']); // { sfx: 'alarm', speaker: 'Guard', loud: true }
 */
export function parseTags(list) {
  const tags = {};
  for (const raw of list) {
    const i = raw.indexOf(':');
    if (i === -1) tags[raw.trim()] = true;
    else tags[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
  }
  return tags;
}

/**
 * Makes the variables object of a conversation. With a state store the values live there under
 * `vars.<name>`, so they are saved with the game; without one a plain object is used.
 * @param {StateStore|null} [state]
 * @param {Object} [initial] Starting values, used for any variable not already set.
 * @returns {Object} An object to read and write variables on.
 */
export function createVars(state = null, initial = {}) {
  if (!state) return { ...initial };
  for (const [k, v] of Object.entries(initial)) if (state.get(`vars.${k}`) === undefined) state.set(`vars.${k}`, v);
  return new Proxy({}, {
    get: (_, k) => (typeof k === 'string' ? state.get(`vars.${k}`) : undefined),
    set: (_, k, v) => { state.set(`vars.${k}`, v); return true; },
    has: (_, k) => state.get(`vars.${String(k)}`) !== undefined,
  });
}

// Literal from script text: true/false, a number, a "quoted" string, or a bare word.
export function parseValue(text) {
  const t = text.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && !Number.isNaN(Number(t))) return Number(t);
  const q = /^(["'])(.*)\1$/s.exec(t);
  return q ? q[2] : t;
}

export function applySet(vars, { name, op, value }) {
  const cur = vars[name];
  if (op === '+=') vars[name] = (cur ?? 0) + value;
  else if (op === '-=') vars[name] = (cur ?? 0) - value;
  else vars[name] = value;
}

const COMPARE = {
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '<': (a, b) => a < b,
  '>': (a, b) => a > b,
  '<=': (a, b) => a <= b,
  '>=': (a, b) => a >= b,
};

// cond: { name, negate, op, value }. No op means "is truthy".
export function evalCondition(cond, vars) {
  if (!cond) return true;
  const v = vars[cond.name];
  const result = cond.op ? Boolean(COMPARE[cond.op](v, cond.value)) : Boolean(v);
  return cond.negate ? !result : result;
}

export function parseCondition(text) {
  const m = /^\s*(!)?\s*(\w+)\s*(?:(==|!=|<=|>=|<|>)\s*(.+?))?\s*$/.exec(text);
  if (!m) throw new Error(`bad condition "{${text}}"`);
  return { negate: Boolean(m[1]), name: m[2], op: m[3] ?? null, value: m[4] === undefined ? undefined : parseValue(m[4]) };
}

// Replaces placeholders that name a defined variable; others are left as written.
export function interpolate(text, vars, pattern) {
  return text.replace(pattern, (whole, name) => (vars[name] === undefined ? whole : String(vars[name])));
}
