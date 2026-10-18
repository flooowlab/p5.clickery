import { parseTags, splitSpeaker, parseValue, parseCondition, createVars } from './common.js';
import { GraphRunner, checkTargets } from './graph.js';

// A small dialogue format:
//
//   # start                              section (a label)
//   Guard: Halt! Who goes there? # sfx:alarm   line, optional trailing # tags
//   Narration without a speaker.         line with speaker null
//   {met} Guard: Back again?             only when the condition holds
//   ~ gold += 5                          set a variable (=, +=, -=)
//   * A friend. -> friend                choice leading to a section
//   * {gold >= 5} Pay the toll. -> pay   choice with a condition
//   -> END                               jump (or finish)
//   // comment
//
// Conditions: {flag}, {!flag}, {name == 3}, !=, <, >, <=, >=. {name} inside text
// shows the variable. A section ends with a list of choices, a jump, or just
// stops (which finishes the conversation).
export function parseMarkdown(source) {
  const sections = new Map();
  let current = null;
  let start = null;
  const open = (name, lineNo) => {
    if (sections.has(name)) throw new Error(`line ${lineNo}: duplicate section "${name}"`);
    current = { statements: [], end: null };
    sections.set(name, current);
    start ??= name;
  };

  source.replaceAll('\r', '').split('\n').forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trim();
    if (line === '' || line.startsWith('//')) return;
    const fail = (msg) => { throw new Error(`line ${lineNo}: ${msg}`); };
    const header = /^#\s*([\w-]+)$/.exec(line);
    if (header) { open(header[1], lineNo); return; }
    if (!current) open('start', lineNo);
    const isChoice = line.startsWith('*');
    if (current.end && !(isChoice && current.end.type === 'choices')) fail('nothing can follow choices or a jump in the same section');

    if (line.startsWith('->')) {
      const target = line.slice(2).trim();
      if (!/^[\w-]+$/.test(target)) fail(`bad jump "${line}"`);
      current.end = { type: 'goto', target };
    } else if (isChoice) {
      const m = /^\*\s*(?:\{([^}]*)\}\s*)?(.*?)\s*->\s*([\w-]+)$/.exec(line);
      if (!m) fail(`a choice needs "-> section": "${line}"`);
      let cond;
      try { cond = m[1] === undefined ? undefined : parseCondition(m[1]); } catch (e) { fail(e.message); }
      const option = { text: m[2], target: m[3], cond };
      if (current.end) current.end.options.push(option);
      else current.end = { type: 'choices', options: [option] };
    } else if (line.startsWith('~')) {
      const m = /^~\s*(\w+)\s*(=|\+=|-=)\s*(.+)$/.exec(line);
      if (!m) fail(`bad assignment "${line}"`);
      current.statements.push({ type: 'set', name: m[1], op: m[2], value: parseValue(m[3]) });
    } else {
      let body = line;
      let cond;
      const c = /^\{([^}]*)\}\s+(.*)$/.exec(body);
      if (c) {
        try { cond = parseCondition(c[1]); } catch (e) { fail(e.message); }
        body = c[2];
      }
      const tagged = /^(.*?)\s+#\s*(\S.*)$/.exec(body);
      const tags = tagged ? parseTags(tagged[2].split(/\s+#\s*/)) : {};
      const { speaker, text } = splitSpeaker(tagged ? tagged[1] : body);
      current.statements.push({ type: 'line', cond, speaker, text, tags });
    }
  });

  if (start === null) throw new Error('the conversation is empty');
  const program = { start, sections };
  checkTargets(program);
  return program;
}

// Runner for a Markdown conversation. Pass `state` to keep variables in the store.
export function createMarkdownRunner(source, { state = null, vars = {}, start } = {}) {
  const program = parseMarkdown(source);
  if (start) {
    if (!program.sections.has(start)) throw new Error(`no section "${start}"`);
    program.start = start;
  }
  return new GraphRunner(program, { vars: createVars(state, vars), placeholder: /\{(\w+)\}/g });
}
