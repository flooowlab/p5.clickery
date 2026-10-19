// Subtitle bar with a typewriter reveal. show() resolves when the line has been
// read: the text finishes, stays up for a reading time, then moves on. advance()
// (a click or tap) completes the reveal first and moves on with the next press;
// skip() moves on at once. Timing is driven by update(dt).
//
// `speed` multiplies reveal and reading speed (the text speed setting). With
// `enabled` false nothing is drawn but lines still pace and resolve.
export class SubtitleBar {
  enabled = true;
  speed = 1;
  charsPerSecond = 40;
  baseHoldMs = 700;
  holdMsPerChar = 25;
  line = null; // { speaker, text, tags }
  #elapsed = 0;
  #resolve = null;
  #reject = null;

  get active() {
    return this.line !== null;
  }

  get fullyShown() {
    return this.line !== null && this.visibleCount >= this.line.text.length;
  }

  get visibleCount() {
    if (!this.line) return 0;
    return Math.min(this.line.text.length, Math.floor((this.#elapsed * this.charsPerSecond * this.speed) / 1000));
  }

  get visibleText() {
    return this.line ? this.line.text.slice(0, this.visibleCount) : '';
  }

  // Milliseconds of reading time after the text is fully shown.
  get holdMs() {
    return (this.baseHoldMs + this.line.text.length * this.holdMsPerChar) / this.speed;
  }

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

  update(dt) {
    if (!this.line) return;
    this.#elapsed += dt;
    const revealMs = (this.line.text.length * 1000) / (this.charsPerSecond * this.speed);
    if (this.#elapsed >= revealMs + this.holdMs) this.#finish();
  }

  // Click or tap: show the rest of the line, or move on when it is all there.
  advance() {
    if (!this.line) return;
    if (this.fullyShown) this.#finish();
    else this.#elapsed = (this.line.text.length * 1000) / (this.charsPerSecond * this.speed);
  }

  skip() {
    this.#finish();
  }

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

  // Browser only: a box above the inventory bar.
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
