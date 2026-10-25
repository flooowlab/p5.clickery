import { applySet, evalCondition, interpolate } from './common.js';

/**
 * Runs a compiled conversation graph. It is a {@link DialogueRunner}. The Markdown and Twine
 * adapters both compile to the same shape, which this runs, so you rarely make one yourself:
 *
 * - `program` is `{ start, sections: Map(name -> { statements, end }) }`.
 * - A statement is a line, `{ type: 'line', cond?, speaker, text, tags }`, or a variable change, `{ type: 'set', name, op, value }`.
 * - A section ends with choices, `{ type: 'choices', options: [{ text, target, cond? }] }`, a jump, `{ type: 'goto', target }` (target `'END'` finishes), or `null` (finishes).
 *
 * @param {Object} program The compiled conversation.
 * @param {Object} options
 * @param {Object} options.vars The variables object (see {@link createVars}).
 * @param {RegExp} options.placeholder Matches the variables shown in text; its first group is the name.
 */
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

  /**
   * `true` once nothing more can happen. Like Ink, this is known as soon as the last line has been returned.
   * @type {boolean}
   */
  get done() {
    this.#peekEnd();
    return this.#done;
  }

  /**
   * The next line.
   * @returns {DialogueLine|null} `null` when the runner is waiting for a choice or has finished.
   */
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

  /**
   * The options to choose from.
   * @returns {Array<{index: number, text: string}>} Empty when not waiting for a choice.
   */
  choices() {
    this.#peekEnd();
    return this.#options.map((o, index) => ({ index, text: interpolate(o.text, this.vars, this.placeholder) }));
  }

  /**
   * Picks an option. Call `next()` again afterwards.
   * @param {number} i The `index` of the option.
   * @throws {RangeError} For an index that is not offered.
   */
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
