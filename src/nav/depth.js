// Depth scale and draw order.

// Scale from stops [[y, scale], ...] sorted by y: linear between stops, clamped outside.
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

// Back to front by baseline (feet y), stable for ties. Items need `baseline` or `y`.
export function sortByBaseline(items) {
  const key = (item) => item.baseline ?? item.y;
  return items.map((item, i) => [item, i]).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(([item]) => item);
}
