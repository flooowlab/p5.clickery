import { splitSpeaker, parseValue, createVars } from './common.js';
import { GraphRunner, checkTargets } from './graph.js';

// Twine support, deliberately small: passages, links and <<set>> variables.
// Anything else (<<if>>, <<print>>, Harlowe/SugarCube macros) is rejected with
// the passage name instead of being silently shown as text.
//
// Twee 3:                          Twison JSON:
//   :: Start                         { "startnode": "1", "passages": [
//   Guard: Halt!                       { "pid": "1", "name": "Start", "text": "Guard: Halt!\n[[Pass->next]]" } ] }
//   [[Pass->next]]
//   :: next [tag]
//   <<set $passed to true>>
//
// Links: [[text->target]], [[target<-text]], [[text|target]], [[target]].
// Each non-empty text line is a line (an optional "Speaker: " prefix is read),
// and the links in a passage become its choices. $name in text shows a variable.

const SPECIAL = new Set(['StoryTitle', 'StoryData', 'StoryInit']);

// Twee 3 text -> { passages: [{ name, tags, text }], start }.
export function parseTwee(source) {
  const passages = [];
  let current = null;
  let data = {};
  for (const raw of source.replaceAll('\r', '').split('\n')) {
    const header = raw.startsWith('::') && /^::\s*([^[{]*?)\s*(?:\[([^\]]*)\])?\s*(?:\{.*\})?\s*$/.exec(raw);
    if (header) {
      current = { name: header[1], tags: (header[2] ?? '').split(/\s+/).filter(Boolean), text: [] };
      passages.push(current);
    } else if (current) current.text.push(raw);
  }
  for (const p of passages) p.text = p.text.join('\n').trim();
  const storyData = passages.find((p) => p.name === 'StoryData');
  if (storyData) {
    try { data = JSON.parse(storyData.text); } catch { throw new Error('StoryData is not valid JSON'); }
  }
  return { passages: passages.filter((p) => !SPECIAL.has(p.name)), start: data.start };
}

// Twison object (or JSON text) -> the same shape as parseTwee.
export function parseTwison(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!Array.isArray(data?.passages)) throw new Error('Twison needs a passages array');
  const passages = data.passages.map((p) => ({ name: p.name, tags: p.tags ?? [], text: String(p.text ?? ''), pid: String(p.pid) }));
  const startPassage = passages.find((p) => p.pid === String(data.startnode));
  return { passages, start: startPassage?.name };
}

function parseLink(inner) {
  let m;
  if ((m = /^(.*)->(.*)$/s.exec(inner))) return { text: m[1].trim(), target: m[2].trim() };
  if ((m = /^(.*?)<-(.*)$/s.exec(inner))) return { text: m[2].trim(), target: m[1].trim() };
  if ((m = /^(.*)\|(.*)$/s.exec(inner))) return { text: m[1].trim(), target: m[2].trim() };
  return { text: inner.trim(), target: inner.trim() };
}

function compilePassage(passage) {
  const statements = [];
  const options = [];
  for (const raw of passage.text.split('\n')) {
    let line = raw.replace(/\[\[(.+?)\]\]/g, (_, inner) => { options.push(parseLink(inner)); return ''; });
    const sets = [];
    line = line.replace(/<<\s*(\w+)\b([^>]*)>>/g, (whole, macro, args) => {
      if (macro.toLowerCase() !== 'set') throw new Error(`passage "${passage.name}": unsupported macro <<${macro}>> (only <<set>> is supported)`);
      const m = /^\s*\$(\w+)\s*(to|=|\+=|-=)\s*(.+?)\s*$/i.exec(args);
      if (!m) throw new Error(`passage "${passage.name}": cannot read ${whole}`);
      sets.push({ type: 'set', name: m[1], op: m[2].toLowerCase() === 'to' ? '=' : m[2], value: parseValue(m[3]) });
      return '';
    });
    line = line.trim();
    if (line) statements.push({ type: 'line', ...splitSpeaker(line), tags: {} });
    statements.push(...sets);
  }
  return { statements, end: options.length ? { type: 'choices', options } : null };
}

export function compileTwine({ passages, start }) {
  const sections = new Map();
  for (const p of passages) {
    if (sections.has(p.name)) throw new Error(`duplicate passage "${p.name}"`);
    sections.set(p.name, compilePassage(p));
  }
  const first = start ?? (sections.has('Start') ? 'Start' : passages[0]?.name);
  if (first === undefined) throw new Error('the story has no passages');
  const program = { start: first, sections };
  checkTargets(program, (n) => `passage "${n}"`);
  return program;
}

// `source` is Twee 3 text or a Twison object / JSON text.
export function createTwineRunner(source, { state = null, vars = {} } = {}) {
  const isTwee = typeof source === 'string' && !source.trimStart().startsWith('{');
  const parsed = isTwee ? parseTwee(source) : parseTwison(source);
  return new GraphRunner(compileTwine(parsed), { vars: createVars(state, vars), placeholder: /\$(\w+)/g });
}
