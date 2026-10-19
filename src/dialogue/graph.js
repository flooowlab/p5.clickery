import { applySet, evalCondition, interpolate } from './common.js';

// Runs a compiled conversation graph. The Markdown and Twine adapters both
// compile to this shape:
//
//   program = { start, sections: Map(name -> { statements, end }) }
//   statement: { type: 'line', cond?, speaker, text, tags }
//            | { type: 'set', name, op, value }
//   end:       { type: 'choices', options: [{ text, target, cond? }] }
//            | { type: 'goto', target }        (target "END" finishes)
//            | null                            (finishes)
export class GraphRunner {
  #section = null;
  #index = 0;
  #options = [];
  #done = false;

  constructor(program, { vars, placeholder }) {
    this.program = program;
    this.vars = vars;
    this.placeholder = placeholder;
    this.#enter(program.start);
  }

  // True once nothing more can happen. Like ink, this is known as soon as the
  // last line has been returned.
  get done() {
    this.#peekEnd();
    return this.#done;
  }

  next() {
    for (let guard = 0; guard < 10_000; guard++) {
      if (this.#done || this.#options.length) return null;
      const { statements, end } = this.#section;
      if (this.#index < statements.length) {
        const s = statements[this.#index++];
        if (s.type === 'set') { applySet(this.vars, s); continue; }
        if (!evalCondition(s.cond, this.vars)) continue;
        return { speaker: s.speaker, text: interpolate(s.text, this.vars, this.placeholder), tags: { ...s.tags } };
      }
      if (end?.type === 'goto') this.#enter(end.target);
      else this.#peekEnd();
      if (!end || end.type === 'choices') return null;
    }
    throw new Error('conversation loops without showing anything');
  }

  // When every statement of the section has run, settle how it ends. This has no
  // side effects, so choices (and done) can be read right after the last line.
  #peekEnd() {
    if (this.#done || this.#options.length || this.#index < this.#section.statements.length) return;
    const { end } = this.#section;
    if (end === null || (end.type === 'goto' && end.target === 'END')) this.#done = true;
    else if (end.type === 'choices') {
      this.#options = end.options.filter((o) => evalCondition(o.cond, this.vars));
      if (!this.#options.length) this.#done = true;
    }
  }

  choices() {
    this.#peekEnd();
    return this.#options.map((o, index) => ({ index, text: interpolate(o.text, this.vars, this.placeholder) }));
  }

  choose(i) {
    const option = this.#options[i];
    if (!option) throw new RangeError(`no choice ${i}`);
    this.#options = [];
    this.#enter(option.target);
  }

  #enter(target) {
    if (target === 'END') { this.#done = true; return; }
    this.#section = this.program.sections.get(target);
    this.#index = 0;
  }
}

// Throws when any goto or choice points at a section that does not exist.
export function checkTargets(program, describe = (n) => `section "${n}"`) {
  const known = (t) => t === 'END' || program.sections.has(t);
  if (!known(program.start)) throw new Error(`start ${describe(program.start)} does not exist`);
  for (const [name, { end }] of program.sections) {
    const targets = end?.type === 'goto' ? [end.target] : end?.type === 'choices' ? end.options.map((o) => o.target) : [];
    for (const t of targets) if (!known(t)) throw new Error(`${describe(name)} leads to missing ${describe(t)}`);
  }
}
