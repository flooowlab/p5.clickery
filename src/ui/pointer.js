// Maps a browser pointer position to logical canvas coordinates, undoing CSS
// scaling of the canvas. `rect` is canvas.getBoundingClientRect(). Add
// camera.screenToWorld() afterwards for room coordinates. Hit-testing works in
// logical units, so pixelDensity does not enter here; masks are read at their
// own resolution and scaled by the colorMask provider.
export function clientToLogical(clientX, clientY, rect, logicalWidth, logicalHeight) {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * logicalWidth,
    y: ((clientY - rect.top) / rect.height) * logicalHeight,
  };
}
