// Polygon clean-up for traced outlines: Douglas-Peucker on a closed loop.

// Signed area (shoelace). With the contour tracer's conventions, outer loops are
// positive and holes negative.
export function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Douglas-Peucker on an open polyline; keeps both ends. Iterative, so loops of
// hundreds of thousands of points are fine.
function simplifyOpen(points, epsilon) {
  const n = points.length;
  if (n <= 2) return points.slice();
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let worst = 0;
    let at = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distanceToSegment(points[k], points[i], points[j]);
      if (d > worst) { worst = d; at = k; }
    }
    if (at !== -1 && worst > epsilon) {
      keep[at] = 1;
      stack.push([i, at], [at, j]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Simplifies a closed polygon (no repeated first point). Points further than
// `epsilon` from the simplified outline are kept, so corners survive and
// staircase noise goes. Always returns at least 3 points when given 3.
export function simplifyLoop(points, epsilon = 1.5) {
  const n = points.length;
  if (n <= 3) return points.map((p) => [...p]);
  let far = 1;
  let best = -1;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = simplifyOpen(points.slice(0, far + 1), epsilon);
  const b = simplifyOpen([...points.slice(far), points[0]], epsilon);
  const result = [...a, ...b.slice(1, -1)].map((p) => [...p]);
  if (result.length >= 3) return result;
  // Degenerate (a thin sliver): keep the two extremes plus the point furthest from their line.
  let apex = 1;
  let apexD = -1;
  for (let i = 1; i < n; i++) {
    const d = distanceToSegment(points[i], points[0], points[far]);
    if (d > apexD && i !== far) { apexD = d; apex = i; }
  }
  return [points[0], points[apex], points[far]].map((p) => [...p]);
}

// Rounds to whole numbers and drops consecutive duplicates (including last == first).
export function roundLoop(points) {
  const out = [];
  for (const [x, y] of points) {
    const p = [Math.round(x), Math.round(y)];
    const last = out.at(-1);
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  while (out.length > 1 && out[0][0] === out.at(-1)[0] && out[0][1] === out.at(-1)[1]) out.pop();
  return out;
}
