/**
 * The dialogue choices, as a list of rows above the inventory bar. `ask()` shows them and resolves
 * with the index of the one chosen, by click, tap or the number keys 1 to 9. Layout and hit-testing
 * are plain screen coordinates; only `draw()` uses p5. A game has one: `game.menu`.
 *
 * @param {Object} options
 * @param {number} options.viewWidth The screen width.
 * @param {number} options.viewHeight The screen height.
 * @param {number} [options.rowHeight=26]
 * @param {number} [options.bottom=70] How far above the bottom of the screen the list ends.
 * @param {number} [options.margin=16] The space at the sides.
 */
export class ChoiceMenu {
  /** The choices on show: `{ index, text }`. Empty when closed. @type {Array<{index: number, text: string}>} */
  options = [];
  /** The row under the pointer, or `null`. @type {number|null} */
  hovered = null;
  #resolve = null;
  #reject = null;

  constructor({ viewWidth, viewHeight, rowHeight = 26, bottom = 70, margin = 16 }) {
    Object.assign(this, { viewWidth, viewHeight, rowHeight, bottom, margin });
  }

  /**
   * `true` while a question is on show.
   * @type {boolean}
   */
  get open() {
    return this.options.length > 0;
  }

  /**
   * Shows choices and waits for the player.
   * @param {Array<{index: number, text: string}>} choices
   * @param {AbortSignal} [signal] Rejects when aborted.
   * @returns {Promise<number>} The `index` of the choice made.
   */
  ask(choices, signal) {
    this.#close();
    if (signal?.aborted) return Promise.reject(signal.reason);
    this.options = choices;
    return new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
      signal?.addEventListener('abort', () => this.close(signal.reason), { once: true });
    });
  }

  /**
   * The screen rectangle of a row.
   * @param {number} i
   * @returns {{x: number, y: number, w: number, h: number}}
   */
  rowRect(i) {
    const top = this.viewHeight - this.bottom - this.options.length * this.rowHeight;
    return { x: this.margin, y: top + i * this.rowHeight, w: this.viewWidth - this.margin * 2, h: this.rowHeight };
  }

  /**
   * Which row is at a screen position.
   * @param {number} x
   * @param {number} y
   * @returns {number|null}
   */
  itemAt(x, y) {
    for (let i = 0; i < this.options.length; i++) {
      const r = this.rowRect(i);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
    }
    return null;
  }

  /**
   * Moves the pointer, for the row highlight.
   * @param {number} x
   * @param {number} y
   */
  move(x, y) {
    this.hovered = this.itemAt(x, y);
  }

  /**
   * A press at a screen position.
   * @param {number} x
   * @param {number} y
   * @returns {boolean} `true` when it was on a row, and chose it.
   */
  click(x, y) {
    const i = this.itemAt(x, y);
    if (i === null) return false;
    this.pick(i);
    return true;
  }

  /**
   * Chooses a row. The number keys use it: key `1` picks row 0.
   * @param {number} i
   * @returns {boolean} `false` when no question is open or there is no such row.
   */
  pick(i) {
    if (!this.open || i < 0 || i >= this.options.length) return false;
    const resolve = this.#resolve;
    const choice = this.options[i];
    this.#close();
    resolve?.(choice.index ?? i);
    return true;
  }

  /**
   * Abandons the question.
   * @param {*} [reason] When given, the pending `ask()` rejects with it.
   */
  close(reason = null) {
    const reject = this.#reject;
    this.#close();
    if (reason !== null) reject?.(reason);
  }

  #close() {
    this.options = [];
    this.hovered = null;
    this.#resolve = null;
    this.#reject = null;
  }

  /**
   * Draws the rows. Browser only.
   * @param {Object} p The p5 sketch.
   */
  draw(p) {
    if (!this.open) return;
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(15);
    this.options.forEach((o, i) => {
      const r = this.rowRect(i);
      p.noStroke();
      p.fill(0, 0, 0, this.hovered === i ? 230 : 170);
      p.rect(r.x, r.y + 1, r.w, r.h - 2, 4);
      p.fill(this.hovered === i ? p.color(255, 220, 110) : p.color(235));
      p.text(`${i + 1}. ${o.text}`, r.x + 10, r.y + r.h / 2);
    });
  }
}
