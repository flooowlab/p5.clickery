// Depth scale and draw order.

/**
 * The size of something at a height, from scale stops: linear between stops, and held at the
 * first or last stop outside them. A walkable area's `scale` is a list of these.
 * @param {Array<Array<number>>} stops `[y, size]` pairs sorted by `y`: `[[250, 0.6], [360, 1]]` is 60% size at y 250 and full size at y 360.
 * @param {number} y
 * @returns {number} The size, where `1` is full size. `1` when there are no stops.
 * @example
 * scaleFromStops([[250, 0.6], [360, 1]], 305); // 0.8
 */
export function scaleFromStops(stops, y) {
  if (!stops || stops.length === 0) return 1;
  if (y <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [y1, s1] = stops[i];
    if (y <= y1) {
      const [y0, s0] = stops[i - 1];
      return y1 === y0 ? s1 : s0 + ((s1 - s0) * (y - y0)) / (y1 - y0);
    }
  }
  return stops.at(-1)[1];
}

/**
 * Puts things in drawing order, back to front, by the y of their feet: whatever is further down the
 * screen is closer, so it is drawn later and ends up in front. Ties keep their order.
 * @param {Array<{baseline: number, y: number}>} items Each needs a `baseline` (or a `y`).
 * @returns {Array} A new list, back to front.
 * @example
 * for (const thing of sortByBaseline([hero, table, lamp])) thing.draw();
 */
export function sortByBaseline(items) {
  const key = (item) => item.baseline ?? item.y;
  return items.map((item, i) => [item, i]).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(([item]) => item);
}
