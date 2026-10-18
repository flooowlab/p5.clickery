// Cutscene mode. Inside run() input is locked (interactor.locked reads `active`)
// and the script is an ordinary async function:
//
//   await cutscenes.run(async (cs) => {
//     await hero.walkTo(door);
//     await hero.say('intro.hello');
//     cs.label('door');            // a place skip(label) can stop fast-forwarding
//     door.open();
//   });
//
// skip() fast-forwards: actors jump to where they were going, lines are not
// shown, waits and fades finish at once, and the script's state changes still
// happen, so a skipped cutscene ends in the same state as a played one.
// skip('label') fast-forwards only as far as cs.label('label'), then plays normally.
//
// Targets are objects with setSkipping(bool) (Scheduler, Fade, Actor) and
// optionally stop(). Events: "cutscene:start", "cutscene:end" { skipped }.
export class Cutscenes {
  active = false;
  skipped = false;
  skippable = true;
  #depth = 0;
  #skipTarget = null;
  #fastForward = false;

  constructor({ events, scheduler, targets = [] }) {
    this.events = events;
    this.scheduler = scheduler;
    this.targets = [...targets];
    if (scheduler && !this.targets.includes(scheduler)) this.targets.push(scheduler);
  }

  add(...targets) {
    for (const t of targets) if (!this.targets.includes(t)) this.targets.push(t);
  }

  get skipping() {
    return this.#fastForward;
  }

  // Nested calls run inline inside the outer cutscene.
  async run(script, { skippable = true } = {}) {
    if (this.#depth > 0) return script(this.#api());
    this.#depth++;
    this.active = true;
    this.skipped = false;
    this.skippable = skippable;
    this.#skipTarget = null;
    for (const t of this.targets) t.stop?.();
    this.events?.emit('cutscene:start');
    try {
      return await script(this.#api());
    } finally {
      this.#depth--;
      this.#setSkipping(false);
      this.active = false;
      this.events?.emit('cutscene:end', { skipped: this.skipped });
    }
  }

  // Returns false when there is nothing to skip.
  skip(toLabel = null) {
    if (!this.active || !this.skippable) return false;
    this.skipped = true;
    this.#skipTarget = toLabel;
    this.#setSkipping(true);
    return true;
  }

  // Marks a point in the script. Fast-forward aimed at this label stops here.
  label(name) {
    if (this.#fastForward && this.#skipTarget === name) {
      this.#skipTarget = null;
      this.#setSkipping(false);
    }
  }

  #setSkipping(on) {
    this.#fastForward = on;
    for (const t of this.targets) t.setSkipping?.(on);
  }

  #api() {
    const self = this;
    return {
      label: (name) => this.label(name),
      wait: (ms) => this.scheduler.wait(ms),
      get skipped() { return self.skipped; },
      skipping: () => this.#fastForward,
    };
  }
}
