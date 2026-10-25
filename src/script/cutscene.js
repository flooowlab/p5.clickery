/**
 * Cutscene mode. Inside `run()` the player cannot act (`interactor.locked`), a Skip button
 * appears, and the script is an ordinary async function. A game has one: `game.cutscenes`;
 * {@link Game#cutscene} calls `run`.
 *
 * Skipping fast-forwards: actors jump to where they were going, lines are not shown, waits and
 * fades finish at once, and the script's state changes still happen, so a skipped cutscene ends
 * in the same state as a played one. `skip('label')` fast-forwards only as far as `cs.label('label')`,
 * then plays normally.
 *
 * Targets are objects with `setSkipping(bool)` (the scheduler, the fade, actors) and optionally
 * `stop()`. Events: `cutscene:start` and `cutscene:end` with `{ skipped }`.
 *
 * @example
 * await game.cutscenes.run(async (cs) => {
 *   await game.hero.walkTo({ x: 300, y: 300 });
 *   await game.say('intro.hello');
 *   cs.label('door');           // a place skip('door') can stop fast-forwarding
 *   game.flag('doorOpen', true);
 * });
 *
 * @param {Object} options
 * @param {EventBus} [options.events]
 * @param {Scheduler} [options.scheduler] Added to the targets.
 * @param {Array<Object>} [options.targets] Things that fast-forward when skipped.
 */
export class Cutscenes {
  /** `true` while a cutscene is running. @type {boolean} */
  active = false;
  /** `true` once the running (or last) cutscene was skipped. @type {boolean} */
  skipped = false;
  /** `false` for a cutscene that cannot be skipped. @type {boolean} */
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

  /**
   * Adds things that should fast-forward when a cutscene is skipped, such as another actor.
   * @param {...Object} targets Objects with `setSkipping(bool)`.
   */
  add(...targets) {
    for (const t of targets) if (!this.targets.includes(t)) this.targets.push(t);
  }

  /**
   * `true` while fast-forwarding.
   * @type {boolean}
   */
  get skipping() {
    return this.#fastForward;
  }

  /**
   * Runs a cutscene. A cutscene started inside another one just runs inline.
   * @param {function({label: function(string): void, wait: function(number): Promise<void>, skipped: boolean, skipping: function(): boolean}): Promise<*>} script
   * It receives `cs`: `cs.label(name)` marks a place to skip to, `cs.wait(ms)` waits in game time, and `cs.skipped` tells whether the player skipped.
   * @param {Object} [options]
   * @param {boolean} [options.skippable=true] `false` hides the Skip button.
   * @returns {Promise<*>} The script's result.
   */
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

  /**
   * Skips the running cutscene: the Skip button and Escape call this.
   * @param {string} [toLabel] Skip only as far as `cs.label(toLabel)`, then play normally.
   * @returns {boolean} `false` when there is nothing to skip.
   */
  skip(toLabel = null) {
    if (!this.active || !this.skippable) return false;
    this.skipped = true;
    this.#skipTarget = toLabel;
    this.#setSkipping(true);
    return true;
  }

  /**
   * Marks a point in the script: fast-forward aimed at this label stops here.
   * @param {string} name
   */
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
