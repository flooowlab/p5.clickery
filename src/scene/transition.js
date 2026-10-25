/**
 * A fade to black and back. `alpha` goes from 0 (clear) to 1 (black), and the renderer draws a
 * black rectangle with it ({@link drawFade}). A game's scene manager uses one for room changes:
 * `game.scene.fade`; its length is the `fadeMs` option. Advance it with `update(dt)`.
 *
 * @example
 * await fade.out(500);   // darken for half a second
 * await fade.in(500);
 */
export class Fade {
  /** How dark it is: `0` is clear, `1` is black. @type {number} */
  alpha = 0;
  /** `true` during a skipped cutscene, when fades finish at once. @type {boolean} */
  skipping = false;
  #from = 0;
  #to = 0;
  #duration = 0;
  #elapsed = 0;
  #resolve = null;

  /**
   * Fades to a darkness. Starting a new fade settles the one before.
   * @param {number} target `0` (clear) to `1` (black).
   * @param {number} ms How long it takes.
   * @returns {Promise<void>} Resolves when the fade ends.
   */
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

  /**
   * Fades to black.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  out(ms) { return this.to(1, ms); }

  /**
   * Fades back to clear.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  in(ms) { return this.to(0, ms); }

  /**
   * Cutscene fast-forward: finishes the current fade at once and makes new ones instant.
   * @param {boolean} on
   */
  setSkipping(on) {
    this.skipping = on;
    if (on && this.#resolve) {
      this.alpha = this.#to;
      this.#settle();
    }
  }

  /**
   * `true` while a fade is under way.
   * @type {boolean}
   */
  get active() {
    return this.#resolve !== null;
  }

  /**
   * Moves the fade forward. The scene manager does this on every `update` event.
   * @param {number} dt Milliseconds.
   */
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
