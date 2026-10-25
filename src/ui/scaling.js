// Letterboxed scaling: the game always has one fixed logical size (say 640x360)
// and is scaled, never stretched, to fit its container. Spare space becomes
// bars on the sides (wide window) or top and bottom (tall window, a phone held
// upright). Pointer positions go through toLogical(), which undoes the scaling.

/**
 * Works out how to fit the game into a container without stretching it: the biggest size with the
 * game's shape, centred, with the spare space as bars. Pure layout, no browser needed.
 * @param {number} containerWidth
 * @param {number} containerHeight
 * @param {number} logicalWidth The game's fixed width.
 * @param {number} logicalHeight The game's fixed height.
 * @param {Object} [options]
 * @param {boolean} [options.integer=false] Keep whole-number scales, for pixel art (once the container is big enough for 1x).
 * @param {number} [options.maxScale=Infinity] The biggest scale allowed.
 * @returns {{scale: number, width: number, height: number, offsetX: number, offsetY: number}}
 * @example
 * fitLetterbox(1280, 720, 640, 360); // { scale: 2, width: 1280, height: 720, offsetX: 0, offsetY: 0 }
 */
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

/**
 * Keeps a canvas fitted inside a container as the window changes size: the game has one fixed
 * logical size (say 640 by 360) and is scaled, never stretched. Spare space becomes bars on the
 * sides (a wide window) or at the top and bottom (a tall window, such as a phone held upright).
 * Pointer positions go through `toLogical()`, which undoes the scaling. A game made with
 * {@link createGame} has one (`game.scaler`) unless `fit` is `false`.
 *
 * Give the container a size (for example `width: 100vw; height: 100vh`) and a background colour for the bars.
 *
 * @example
 * const scaler = new LetterboxScaler({ canvas: canvas.elt, container: document.getElementById('game'), width: 640, height: 360 });
 * scaler.start();
 * const { x, y } = scaler.toLogical(event.clientX, event.clientY);
 *
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {HTMLElement} options.container
 * @param {number} options.width The game's logical width.
 * @param {number} options.height The game's logical height.
 * @param {boolean} [options.integer=false] Whole-number scales only, for pixel art.
 * @param {number} [options.maxScale=Infinity]
 * @param {function(Object): void} [options.onResize] Called with the new layout.
 */
export class LetterboxScaler {
  /** The latest layout: `{ scale, width, height, offsetX, offsetY }`. @type {Object|null} */
  layout = null;
  #observer = null;
  #onWindowResize = () => this.update();

  constructor({ canvas, container, width, height, integer = false, maxScale = Infinity, onResize = null }) {
    Object.assign(this, { canvas, container, width, height, integer, maxScale, onResize });
  }

  /**
   * Measures the container, then sizes and positions the canvas.
   * @returns {Object} The layout.
   */
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

  /**
   * Starts watching the window and the container, and fits the canvas now.
   * @returns {LetterboxScaler} Itself.
   */
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

  /**
   * Stops watching.
   */
  stop() {
    globalThis.removeEventListener?.('resize', this.#onWindowResize);
    globalThis.removeEventListener?.('orientationchange', this.#onWindowResize);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  /**
   * Maps a browser pointer position to a logical game position. It works on the bars too: the result is simply outside the game.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x: number, y: number}}
   */
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }

  /**
   * Asks whether a logical point is on the game rather than on a bar.
   * @param {{x: number, y: number}} point
   * @returns {boolean}
   */
  inside({ x, y }) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
