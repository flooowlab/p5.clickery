/**
 * Plays a dialogue runner on screen: lines go to the subtitle bar and choices to the choice menu.
 * While a conversation runs, `active` is `true` and the interactor ignores clicks (they belong to
 * the dialogue). A game has one: `game.dialogue`; {@link Game#talk} calls `play`.
 *
 * Events: `dialogue:start`, `dialogue:line` (the line), `dialogue:tag` with `{ key, value, line }`
 * (a tag such as `sfx`), `dialogue:choose` with `{ index, text }`, and `dialogue:end`.
 *
 * @param {Object} options
 * @param {EventBus} [options.events]
 * @param {SubtitleBar} options.subtitles Shows the lines.
 * @param {ChoiceMenu} options.menu Asks the player.
 */
export class DialogueSession {
  /** `true` while a conversation is playing. @type {boolean} */
  active = false;

  constructor({ events, subtitles, menu }) {
    this.events = events;
    this.subtitles = subtitles;
    this.menu = menu;
  }

  /**
   * Plays a conversation from its first line to its end.
   * @param {DialogueRunner} runner
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal] Cuts the conversation short; `play` then rejects with the signal's reason.
   * @returns {Promise<DialogueRunner>} The runner, so you can read its `vars` afterwards.
   * @throws {Error} When a conversation is already running.
   */
  async play(runner, { signal } = {}) {
    if (this.active) throw new Error('a conversation is already running');
    this.active = true;
    this.events?.emit('dialogue:start');
    try {
      for (;;) {
        const line = runner.next();
        if (line) {
          for (const [key, value] of Object.entries(line.tags ?? {})) this.events?.emit('dialogue:tag', { key, value, line });
          if (line.text) {
            this.events?.emit('dialogue:line', line);
            await this.subtitles.show(line, signal);
          }
          continue;
        }
        const choices = runner.choices();
        if (choices.length === 0) break;
        const index = await this.menu.ask(choices, signal);
        this.events?.emit('dialogue:choose', { index, text: choices.find((c) => c.index === index)?.text });
        runner.choose(index);
      }
    } finally {
      this.subtitles.hide();
      this.menu.close();
      this.active = false;
      this.events?.emit('dialogue:end');
    }
    return runner;
  }
}
