// "Skip" button shown during cutscenes, top right. Pure layout and hit test
// plus a p5 draw; the game calls cutscenes.skip() when hitSkipButton is true.

/**
 * Where the Skip button is, at the top right of the screen.
 * @param {number} viewWidth The screen width.
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function skipButtonRect(viewWidth) {
  return { x: viewWidth - 74, y: 8, w: 66, h: 26 };
}

/**
 * Asks whether a screen point is on the Skip button. A game calls `cutscenes.skip()` when it is.
 * @param {number} x
 * @param {number} y
 * @param {number} viewWidth
 * @returns {boolean}
 */
export function hitSkipButton(x, y, viewWidth) {
  const r = skipButtonRect(viewWidth);
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/**
 * Draws the Skip button. Browser only.
 * @param {Object} p The p5 sketch.
 * @param {number} viewWidth
 */
export function drawSkipButton(p, viewWidth) {
  const r = skipButtonRect(viewWidth);
  p.noStroke();
  p.fill(0, 0, 0, 170);
  p.rect(r.x, r.y, r.w, r.h, 4);
  p.fill(255);
  p.textSize(13);
  p.textAlign(p.CENTER, p.CENTER);
  p.text('Skip »', r.x + r.w / 2, r.y + r.h / 2);
}
