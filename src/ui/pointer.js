/**
 * Maps a browser pointer position to logical canvas coordinates, undoing the CSS scaling of the
 * canvas. Add `camera.screenToWorld()` afterwards for room coordinates. Hit-testing works in
 * logical units, so `pixelDensity` does not enter here.
 * @param {number} clientX The event's `clientX`.
 * @param {number} clientY The event's `clientY`.
 * @param {{left: number, top: number, width: number, height: number}} rect The canvas's `getBoundingClientRect()`.
 * @param {number} logicalWidth The game's width.
 * @param {number} logicalHeight The game's height.
 * @returns {{x: number, y: number}}
 */
export function clientToLogical(clientX, clientY, rect, logicalWidth, logicalHeight) {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * logicalWidth,
    y: ((clientY - rect.top) / rect.height) * logicalHeight,
  };
}
