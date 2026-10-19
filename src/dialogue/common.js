// Shared pieces of the dialogue adapters.
//
// DialogueRunner interface (every adapter implements it):
//   next()      -> { speaker, text, tags } for the next line, or null when the
//                  runner is waiting for a choice or has finished
//   choices()   -> [{ index, text }] while waiting for a choice, else []
//   choose(i)   -> picks choice i; call next() again afterwards
//   vars        -> read/write variables (shared with the state store when given)
//   done        -> true once the conversation has ended
// `tags` is an object such as { sfx: 'alarm' }; `speaker` is a string or null.

// "Guard: Halt!" -> { speaker: "Guard", text: "Halt!" }. The colon needs a space
// after it and the speaker is a short name; write a line with no speaker when
// the text itself starts with something like "Note: ".
export function splitSpeaker(line) {
  const m = /^([A-Za-z][\w .'-]{0,29}):\s+(.*)$/s.exec(line);
  return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line };
}

// ["sfx:alarm", "speaker: Guard", "loud"] -> { sfx: "alarm", speaker: "Guard", loud: true }
export function parseTags(list) {
  const tags = {};
  for (const raw of list) {
    const i = raw.indexOf(':');
    if (i === -1) tags[raw.trim()] = true;
    else tags[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
  }
  return tags;
}

// Variables object. With a state store the values live there under "vars.<name>",
// so they are saved with the game; without one a plain object is used.
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
