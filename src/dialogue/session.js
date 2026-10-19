// Plays any DialogueRunner on screen: lines go to the subtitle bar, choices to
// the choice menu. While a conversation runs `active` is true, and the
// interactor ignores clicks (they belong to the dialogue UI).
//
// Events: "dialogue:start", "dialogue:line" (line), "dialogue:tag" { key, value, line }
// (for sfx and so on), "dialogue:choose" { index, text }, "dialogue:end".
// Pass an AbortSignal to cut a conversation short; play() then rejects with its reason.
export class DialogueSession {
  active = false;

  constructor({ events, subtitles, menu }) {
    this.events = events;
    this.subtitles = subtitles;
    this.menu = menu;
  }

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
