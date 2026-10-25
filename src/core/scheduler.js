// Game-time scheduler. Time only advances through update(dt), so timers stop
// while the game is paused and are deterministic in tests.

/**
 * A scheduled call, returned by {@link Scheduler#after} and {@link Scheduler#every}.
 * @example
 * const timer = game.scheduler.every(500, () => console.log('tick'));
 * timer.cancel();
 */
export class Timer {
  constructor(delay, callback, repeat) {
    /** Milliseconds between calls. @type {number} */
    this.delay = delay;
    /** What is called. @type {Function} */
    this.callback = callback;
    /** `true` for a timer made with `every`. @type {boolean} */
    this.repeat = repeat;
    /** Milliseconds of game time left until the next call. @type {number} */
    this.remaining = delay;
    /** `true` once cancelled or, for a one-off, once it has run. @type {boolean} */
    this.cancelled = false;
  }

  /**
   * Stops the timer; it will not be called again.
   */
  cancel() {
    this.cancelled = true;
  }
}

/**
 * Timers and waits that run on *game time*: time only passes when the game is updated, so they
 * stop while the game is paused. A game has one: `game.scheduler`.
 *
 * @example
 * game.scheduler.after(2000, () => game.say('hint'));
 * await game.scheduler.wait(1000); // inside an async function: pause here for a second
 */
export class Scheduler {
  /** `true` during a skipped cutscene, when every wait finishes at once. @type {boolean} */
  skipping = false;
  #timers = [];
  #waits = new Set();

  /**
   * Calls a function once, after some game time.
   * @param {number} ms Milliseconds of game time.
   * @param {Function} callback
   * @returns {Timer}
   */
  after(ms, callback) {
    return this.#add(new Timer(checkMs(ms), callback, false));
  }

  /**
   * Calls a function again and again, until cancelled.
   * @param {number} ms Milliseconds of game time between calls. Above 0.
   * @param {Function} callback
   * @returns {Timer} Call `cancel()` on it to stop.
   */
  every(ms, callback) {
    if (checkMs(ms) === 0) throw new RangeError('every() needs a delay above 0');
    return this.#add(new Timer(ms, callback, true));
  }

  /**
   * Pauses an async function for some game time. While a cutscene is being skipped, waits finish at once.
   * @param {number} ms Milliseconds of game time.
   * @param {AbortSignal} [signal] Rejects the wait early when aborted.
   * @returns {Promise<void>}
   * @example
   * await game.scheduler.wait(1000);
   */
  wait(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      if (this.skipping) return resolve();
      const settle = () => {
        timer.cancel();
        signal?.removeEventListener('abort', onAbort);
        this.#waits.delete(settle);
        resolve();
      };
      const onAbort = () => {
        timer.cancel();
        this.#waits.delete(settle);
        reject(signal.reason);
      };
      const timer = this.after(ms, settle);
      this.#waits.add(settle);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Cutscene fast-forward: turning it on finishes every pending wait.
   * @param {boolean} on
   */
  setSkipping(on) {
    this.skipping = on;
    if (!on) return;
    for (const settle of [...this.#waits]) settle();
  }

  /**
   * Moves game time forward and calls whatever is due. A game does this every frame.
   * @param {number} dt Milliseconds. Not negative.
   */
  update(dt) {
    if (!(dt >= 0)) throw new RangeError(`dt must be a non-negative number, got ${dt}`);
    for (const timer of [...this.#timers]) {
      if (timer.cancelled) continue;
      timer.remaining -= dt;
      while (!timer.cancelled && timer.remaining <= 0) {
        if (timer.repeat) timer.remaining += timer.delay;
        else timer.cancel();
        timer.callback();
      }
    }
    this.#timers = this.#timers.filter((t) => !t.cancelled);
  }

  /**
   * Cancels every timer.
   */
  clear() {
    for (const timer of this.#timers) timer.cancel();
    this.#timers = [];
  }

  /**
   * How many timers are waiting.
   * @type {number}
   */
  get size() {
    return this.#timers.filter((t) => !t.cancelled).length;
  }

  #add(timer) {
    this.#timers.push(timer);
    return timer;
  }
}

function checkMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`delay must be a finite number >= 0, got ${ms}`);
  return ms;
}
