// Game-time scheduler. Time only advances through update(dt), so timers stop
// while the game is paused and are deterministic in tests.
export class Timer {
  constructor(delay, callback, repeat) {
    this.delay = delay;
    this.callback = callback;
    this.repeat = repeat;
    this.remaining = delay;
    this.cancelled = false;
  }

  cancel() {
    this.cancelled = true;
  }
}

export class Scheduler {
  skipping = false;
  #timers = [];
  #waits = new Set();

  // Run callback after `ms` of game time. Returns a Timer.
  after(ms, callback) {
    return this.#add(new Timer(checkMs(ms), callback, false));
  }

  // Run callback every `ms` of game time until cancelled.
  every(ms, callback) {
    if (checkMs(ms) === 0) throw new RangeError('every() needs a delay above 0');
    return this.#add(new Timer(ms, callback, true));
  }

  // Resolves after `ms` of game time. Pass an AbortSignal to reject early (cutscene skip).
  // While `skipping` (a cutscene being skipped) waits resolve at once.
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

  // Cutscene fast-forward: turning it on settles every pending wait().
  setSkipping(on) {
    this.skipping = on;
    if (!on) return;
    for (const settle of [...this.#waits]) settle();
  }

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

  clear() {
    for (const timer of this.#timers) timer.cancel();
    this.#timers = [];
  }

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
