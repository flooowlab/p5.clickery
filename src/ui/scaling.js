// Letterboxed scaling: the game always has one fixed logical size (say 640x360)
// and is scaled, never stretched, to fit its container. Spare space becomes
// bars on the sides (wide window) or top and bottom (tall window, a phone held
// upright). Pointer positions go through toLogical(), which undoes the scaling.

// Pure layout. `integer` keeps whole-number scales for pixel art (once the
// window is big enough for 1x).
export function fitLetterbox(containerWidth, containerHeight, logicalWidth, logicalHeight, { integer = false, maxScale = Infinity } = {}) {
  if (!(containerWidth > 0) || !(containerHeight > 0)) {
    return { scale: 0, width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  let scale = Math.min(containerWidth / logicalWidth, containerHeight / logicalHeight, maxScale);
  if (integer && scale >= 1) scale = Math.floor(scale);
  const width = logicalWidth * scale;
  const height = logicalHeight * scale;
  return { scale, width, height, offsetX: (containerWidth - width) / 2, offsetY: (containerHeight - height) / 2 };
}

// Keeps a canvas fitted inside a container as the window changes size.
//
//   const scaler = new LetterboxScaler({ canvas: canvas.elt, container: document.getElementById('game'), width: 640, height: 360 });
//   scaler.start();
//   const { x, y } = scaler.toLogical(event.clientX, event.clientY);
//
// Give the container a size (for example width: 100vw; height: 100vh) and a
// background colour for the bars.
export class LetterboxScaler {
  layout = null;
  #observer = null;
  #onWindowResize = () => this.update();

  constructor({ canvas, container, width, height, integer = false, maxScale = Infinity, onResize = null }) {
    Object.assign(this, { canvas, container, width, height, integer, maxScale, onResize });
  }

  // Measure, then size and position the canvas.
  update() {
    const layout = fitLetterbox(this.container.clientWidth, this.container.clientHeight, this.width, this.height, this);
    const style = this.canvas.style;
    style.position = 'absolute';
    style.left = `${layout.offsetX}px`;
    style.top = `${layout.offsetY}px`;
    style.width = `${layout.width}px`;
    style.height = `${layout.height}px`;
    this.layout = layout;
    this.onResize?.(layout);
    return layout;
  }

  start() {
    if (this.container.style && !this.container.style.position) this.container.style.position = 'relative';
    globalThis.addEventListener?.('resize', this.#onWindowResize);
    globalThis.addEventListener?.('orientationchange', this.#onWindowResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => this.update());
      this.#observer.observe(this.container);
    }
    this.update();
    return this;
  }

  stop() {
    globalThis.removeEventListener?.('resize', this.#onWindowResize);
    globalThis.removeEventListener?.('orientationchange', this.#onWindowResize);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  // Browser pointer position -> logical canvas position. Works on the bars too
  // (the result is simply outside 0..width / 0..height).
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }

  // True when a logical point is on the game rather than on a bar.
  inside({ x, y }) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
