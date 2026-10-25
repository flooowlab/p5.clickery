import { parseTags, splitSpeaker, parseValue, parseCondition, createVars } from './common.js';
import { GraphRunner, checkTargets } from './graph.js';

/**
 * Reads the library's small dialogue format into a conversation program (what {@link GraphRunner} runs).
 *
 * ```text
 * # start                              section (a label); the first one is where it starts
 * Guard: Halt! Who goes there? # sfx:alarm   a line, with optional trailing # tags
 * Narration without a speaker.         a line with no speaker
 * {met} Guard: Back again?             only when the condition holds
 * ~ gold += 5                          set a variable (=, +=, -=)
 * * A friend. -> friend                a choice leading to a section
 * * {gold >= 5} Pay the toll. -> pay   a choice with a condition
 * -> END                               jump to a section, or finish
 * // a comment
 * ```
 *
 * Conditions are `{flag}`, `{!flag}` and `{name == 3}` (also `!=`, `<`, `>`, `<=`, `>=`). `{name}`
 * inside text shows the variable. A section ends with a list of choices, a jump, or just stops, which
 * finishes the conversation.
 *
 * @param {string} source
 * @returns {{start: string, sections: Map<string, Object>}}
 * @throws {Error} Naming the line, for a duplicate section, a bad jump or condition, or a jump to a section that does not exist.
 */
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

/**
 * Makes a {@link DialogueRunner} for a conversation written in the Markdown format (see {@link parseMarkdown}).
 * {@link Game#talk} does this for you.
 * @param {string} source
 * @param {Object} [options]
 * @param {StateStore} [options.state] Keeps the variables in the store (as `vars.<name>`), so they are saved with the game.
 * @param {Object} [options.vars] Starting values for variables.
 * @param {string} [options.start] The section to begin with. Default: the first.
 * @returns {DialogueRunner}
 * @example
 * const runner = createMarkdownRunner('# start\nGuard: Halt!\n* Hello -> hi\n# hi\nGuard: Hi.');
 * runner.next(); // { speaker: 'Guard', text: 'Halt!', tags: {} }
 */
export function createMarkdownRunner(source, { state = null, vars = {}, start } = {}) {
  const program = parseMarkdown(source);
  if (start) {
    if (!program.sections.has(start)) throw new Error(`no section "${start}"`);
    program.start = start;
  }
  return new GraphRunner(program, { vars: createVars(state, vars), placeholder: /\{(\w+)\}/g });
}
