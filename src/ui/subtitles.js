/**
 * The bar that shows lines of conversation, with a typewriter reveal. `show()` resolves when the
 * line has been read: the text finishes, stays up for a reading time, then moves on. A click or tap
 * (`advance()`) completes the reveal first and moves on with the next press; Escape (`skip()`) moves
 * on at once. A game has one: `game.subtitles`; the player's text speed and subtitles settings change it.
 *
 * With `enabled` set to `false` nothing is drawn, but lines still take their time and resolve.
 *
 * @example
 * game.subtitles.charsPerSecond = 60; // reveal faster
 */
export class SubtitleBar {
  /** `false` hides the bar (the player's subtitles setting). Lines still pace and resolve. @type {boolean} */
  enabled = true;
  /** Multiplies reveal and reading speed (the player's text speed setting). @type {number} */
  speed = 1;
  /** How fast the text is revealed. @type {number} */
  charsPerSecond = 40;
  /** Reading time after the text is shown, whatever its length, in milliseconds. @type {number} */
  baseHoldMs = 700;
  /** Extra reading time for each character, in milliseconds. @type {number} */
  holdMsPerChar = 25;
  /** The line on show, or `null`. @type {DialogueLine|null} */
  line = null;
  #elapsed = 0;
  #resolve = null;
  #reject = null;

  /**
   * `true` while a line is on show.
   * @type {boolean}
   */
  get active() {
    return this.line !== null;
  }

  /**
   * `true` once all of the line's text is revealed.
   * @type {boolean}
   */
  get fullyShown() {
    return this.line !== null && this.visibleCount >= this.line.text.length;
  }

  /**
   * How many characters of the line are revealed.
   * @type {number}
   */
  get visibleCount() {
    if (!this.line) return 0;
    return Math.min(this.line.text.length, Math.floor((this.#elapsed * this.charsPerSecond * this.speed) / 1000));
  }

  /**
   * The part of the line revealed so far.
   * @type {string}
   */
  get visibleText() {
    return this.line ? this.line.text.slice(0, this.visibleCount) : '';
  }

  /**
   * Milliseconds of reading time after the text is fully shown.
   * @type {number}
   */
  get holdMs() {
    return (this.baseHoldMs + this.line.text.length * this.holdMsPerChar) / this.speed;
  }

  /**
   * Shows a line.
   * @param {DialogueLine} line
   * @param {AbortSignal} [signal] Rejects when aborted.
   * @returns {Promise<void>} Resolves when the line has been read.
   */
  show(line, signal) {
    this.#finish();
    if (signal?.aborted) return Promise.reject(signal.reason);
    this.line = line;
    this.#elapsed = 0;
    return new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
      signal?.addEventListener('abort', () => this.#abort(signal.reason), { once: true });
    });
  }

  /**
   * Moves the reveal and the reading time forward. A game does this every frame.
   * @param {number} dt Milliseconds.
   */
  update(dt) {
    if (!this.line) return;
    this.#elapsed += dt;
    const revealMs = (this.line.text.length * 1000) / (this.charsPerSecond * this.speed);
    if (this.#elapsed >= revealMs + this.holdMs) this.#finish();
  }

  /**
   * A click or tap: shows the rest of the line, or moves on when it is all there.
   */
  advance() {
    if (!this.line) return;
    if (this.fullyShown) this.#finish();
    else this.#elapsed = (this.line.text.length * 1000) / (this.charsPerSecond * this.speed);
  }

  /**
   * Moves on at once.
   */
  skip() {
    this.#finish();
  }

  /**
   * Takes the line away without resolving it.
   */
  hide() {
    this.#abort(null);
  }

  #finish() {
    const resolve = this.#resolve;
    this.line = null;
    this.#resolve = null;
    this.#reject = null;
    resolve?.();
  }

  #abort(reason) {
    const reject = this.#reject;
    this.line = null;
    this.#resolve = null;
    this.#reject = null;
    if (reason !== null) reject?.(reason);
  }

  /**
   * Draws the bar: a box above the inventory bar. Browser only.
   * @param {Object} p The p5 sketch.
   * @param {Object} [options]
   * @param {number} [options.bottom=70] How far above the bottom of the screen the box ends.
   * @param {number} [options.margin=16] The space at the sides.
   */
  draw(p, { bottom = 70, margin = 16 } = {}) {
    if (!this.enabled || !this.line) return;
    const w = p.width - margin * 2;
    const h = 56;
    const y = p.height - bottom - h;
    p.noStroke();
    p.fill(0, 0, 0, 190);
    p.rect(margin, y, w, h, 6);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(15);
    let top = y + 8;
    if (this.line.speaker) {
      p.fill(255, 214, 120);
      p.text(this.line.speaker, margin + 10, top);
      top += 18;
    }
    p.fill(255);
    p.text(this.visibleText, margin + 10, top, w - 20, h - (top - y) - 4);
  }
}
