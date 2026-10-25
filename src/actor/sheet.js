/**
 * Cuts a sprite sheet into frames. A sprite sheet is one picture holding a grid of equal frames; the
 * frames are numbered left to right, top to bottom. Use the result for an actor's `animations`:
 * `{ walk_right: { frames: [frames[4], frames[5], frames[6], frames[7]], delay: 120 } }`. The
 * animation previewer in the Tools section writes this code for you.
 *
 * @param {Object} sheet A loaded p5 image (anything with `width`, `height` and `get(x, y, w, h)`).
 * @param {number} frameWidth The width of one frame, in pixels.
 * @param {number} frameHeight The height of one frame.
 * @param {Object} [options]
 * @param {number} [options.count] How many frames to cut. Default: all the whole frames that fit.
 * @returns {Array<Object>} The frames, as images.
 * @throws {RangeError} For a frame size that is not above 0.
 * @example
 * const sheet = await loadImage('hero.png');
 * const frames = p5.clickery.spriteFrames(sheet, 64, 64);
 * const game = createGame({
 *   hero: { animations: { idle: { frames: [frames[0]], delay: 200 }, walk_right: { frames: frames.slice(4, 8), delay: 120 } } },
 * });
 */
export function spriteFrames(sheet, frameWidth, frameHeight, { count } = {}) {
  if (!(frameWidth > 0) || !(frameHeight > 0)) throw new RangeError(`spriteFrames needs a frame size above 0, got ${frameWidth} x ${frameHeight}`);
  const columns = Math.floor(sheet.width / frameWidth);
  const rows = Math.floor(sheet.height / frameHeight);
  const total = Math.min(count ?? columns * rows, columns * rows);
  const frames = [];
  for (let i = 0; i < total; i++) {
    frames.push(sheet.get((i % columns) * frameWidth, Math.floor(i / columns) * frameHeight, frameWidth, frameHeight));
  }
  return frames;
}
