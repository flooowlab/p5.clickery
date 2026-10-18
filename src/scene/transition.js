// Fade to black and back. `alpha` is 0 (clear) to 1 (black); the renderer draws
// a black rectangle with it. Advance with update(dt) from the game loop.
export class Fade {
  alpha = 0;
  skipping = false;
  #from = 0;
  #to = 0;
  #duration = 0;
  #elapsed = 0;
  #resolve = null;

  // Resolves when the fade ends. Starting a new fade settles the previous one.
  to(target, ms) {
    this.#settle();
    this.#from = this.alpha;
    this.#to = target;
    this.#duration = ms;
    this.#elapsed = 0;
    if (ms <= 0 || this.alpha === target || this.skipping) {
      this.alpha = target;
      return Promise.resolve();
    }
    return new Promise((resolve) => { this.#resolve = resolve; });
  }

  out(ms) { return this.to(1, ms); }

  in(ms) { return this.to(0, ms); }

  // Cutscene fast-forward: finish the current fade at once, and make new ones instant.
  setSkipping(on) {
    this.skipping = on;
    if (on && this.#resolve) {
      this.alpha = this.#to;
      this.#settle();
    }
  }

  get active() {
    return this.#resolve !== null;
  }

  update(dt) {
    if (!this.#resolve) return;
    this.#elapsed += dt;
    const t = Math.min(this.#elapsed / this.#duration, 1);
    this.alpha = this.#from + (this.#to - this.#from) * t;
    if (t >= 1) this.#settle();
  }

  #settle() {
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.();
  }
}
