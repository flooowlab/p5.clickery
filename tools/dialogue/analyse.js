// What the dialogue previewer knows about a conversation without playing it: which format it is,
// which sections can never be reached, and which variables are set but never read (or the other
// way round). Pure functions, so they run in the page and in tests.
import { parseMarkdown } from '../../src/dialogue/markdown.js';
import { parseTwee, parseTwison, compileTwine } from '../../src/dialogue/twine.js';

/**
 * Works out the format of a conversation and compiles it.
 * @param {string} source Markdown, Twee 3 text (starting with `::`) or Twison JSON.
 * @returns {{format: 'Markdown'|'Twee'|'Twison', program: {start: string, sections: Map<string, Object>}}}
 * @throws {Error} For Ink (compile it with tools/compile-ink.mjs), for an empty conversation, and for anything the format does not allow, with the line or passage.
 */
export function programFrom(source) {
  const text = source.trim();
  if (text === '') throw new Error('the conversation is empty');
  if (/^\{\s*"inkVersion"/.test(text)) throw new Error('this is compiled Ink: play it in the game with game.talk (the previewer plays Markdown and Twine)');
  if (text.startsWith('{')) return { format: 'Twison', program: compileTwine(parseTwison(text)) };
  if (text.startsWith('::')) return { format: 'Twee', program: compileTwine(parseTwee(source)) };
  return { format: 'Markdown', program: parseMarkdown(source) };
}

/**
 * @param {{start: string, sections: Map<string, Object>}} program
 * @returns {{sections: Array<{name: string, reachable: boolean, lines: number, ends: string}>, unreachable: string[], variables: {set: string[], read: string[], readNeverSet: string[], setNeverRead: string[]}}}
 */
export function analyse(program) {
  const reached = new Set();
  const todo = [program.start];
  while (todo.length) {
    const name = todo.pop();
    if (name === 'END' || reached.has(name)) continue;
    reached.add(name);
    const { end } = program.sections.get(name);
    if (end?.type === 'goto') todo.push(end.target);
    if (end?.type === 'choices') for (const option of end.options) todo.push(option.target);
  }

  const set = new Set();
  const read = new Set();
  const sections = [];
  for (const [name, section] of program.sections) {
    let lines = 0;
    for (const s of section.statements) {
      if (s.type === 'set') set.add(s.name);
      else { lines++; if (s.cond) read.add(s.cond.name); }
      if (s.type === 'set' && /^[+-]=$/.test(s.op ?? '')) read.add(s.name); // += reads the old value
    }
    if (section.end?.type === 'choices') for (const o of section.end.options) if (o.cond) read.add(o.cond.name);
    const { end } = section;
    sections.push({
      name,
      reachable: reached.has(name),
      lines,
      ends: end?.type === 'choices' ? `${end.options.length} choice${end.options.length === 1 ? '' : 's'}` : end?.type === 'goto' ? `goes to ${end.target}` : 'finishes',
    });
  }
  const list = (s) => [...s].sort();
  return {
    sections,
    unreachable: sections.filter((s) => !s.reachable).map((s) => s.name),
    variables: {
      set: list(set),
      read: list(read),
      readNeverSet: list([...read].filter((v) => !set.has(v))),
      setNeverRead: list([...set].filter((v) => !read.has(v))),
    },
  };
}
