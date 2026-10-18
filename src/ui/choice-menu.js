// Dialogue choices as a list of rows, bottom-aligned above the inventory bar.
// ask() shows them and resolves with the chosen index. Layout and hit-testing
// are pure screen coordinates; draw() uses p5.
export class ChoiceMenu {
  options = [];
  hovered = null;
  #resolve = null;
  #reject = null;

  constructor({ viewWidth, viewHeight, rowHeight = 26, bottom = 70, margin = 16 }) {
    Object.assign(this, { viewWidth, viewHeight, rowHeight, bottom, margin });
  }

  get open() {
    return this.options.length > 0;
  }

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

  rowRect(i) {
    const top = this.viewHeight - this.bottom - this.options.length * this.rowHeight;
    return { x: this.margin, y: top + i * this.rowHeight, w: this.viewWidth - this.margin * 2, h: this.rowHeight };
  }

  itemAt(x, y) {
    for (let i = 0; i < this.options.length; i++) {
      const r = this.rowRect(i);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
    }
    return null;
  }

  move(x, y) {
    this.hovered = this.itemAt(x, y);
  }

  // Returns true when the press was on a row (and chose it).
  click(x, y) {
    const i = this.itemAt(x, y);
    if (i === null) return false;
    this.pick(i);
    return true;
  }

  // Also for keyboard: key "1" picks index 0.
  pick(i) {
    if (!this.open || i < 0 || i >= this.options.length) return false;
    const resolve = this.#resolve;
    const choice = this.options[i];
    this.#close();
    resolve?.(choice.index ?? i);
    return true;
  }

  // Abandon the question; the pending ask() rejects with `reason` when given.
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
