// A conversation being previewed: runs it with the library's own runners and keeps a transcript.
// The page draws it; tests drive it directly.
import { createMarkdownRunner } from '../../src/dialogue/markdown.js';
import { createTwineRunner } from '../../src/dialogue/twine.js';
import { programFrom } from './analyse.js';

export class PreviewSession {
  #runner;

  /**
   * @param {string} source Markdown, Twee 3 or Twison.
   * @param {Object} [options]
   * @param {Object} [options.vars] Starting values of variables.
   * @param {string} [options.start] Markdown only: the section to begin with.
   * @throws {Error} When the conversation cannot be read.
   */
  constructor(source, { vars = {}, start } = {}) {
    const { format, program } = programFrom(source);
    this.format = format;
    this.program = program;
    this.#runner = format === 'Markdown'
      ? createMarkdownRunner(source, { vars, start })
      : createTwineRunner(source, { vars });
    /** What has been said and chosen so far: `{ type: 'line' | 'choice', speaker, text, tags }`. @type {Array<Object>} */
    this.transcript = [];
    this.#advance();
  }

  /** The options waiting for the player: `{ index, text }`. */
  get options() {
    return this.#runner.choices();
  }

  /** `true` once the conversation has ended. */
  get done() {
    return this.#runner.done;
  }

  /** A copy of the variables as they are now. */
  get vars() {
    return { ...this.#runner.vars };
  }

  /** Picks an option and plays on to the next choice or the end. */
  choose(index) {
    const option = this.options.find((o) => o.index === index);
    if (!option) throw new RangeError(`no choice ${index}`);
    this.transcript.push({ type: 'choice', speaker: null, text: option.text, tags: {} });
    this.#runner.choose(index);
    this.#advance();
  }

  #advance() {
    for (let line = this.#runner.next(); line; line = this.#runner.next()) {
      this.transcript.push({ type: 'line', speaker: line.speaker, text: line.text, tags: line.tags ?? {} });
    }
  }
}
