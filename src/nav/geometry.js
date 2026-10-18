export { pointInPolygon } from '../hit/providers.js';

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const toPoint = ([x, y]) => ({ x, y });

// Signed area; the sign tells the winding direction.
export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

export function closestPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

// True when the segments cross at a single interior point of both. Touching
// ends and collinear overlaps do not count.
export function segmentsCross(a, b, c, d) {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// Unit normals of the edges into and out of vertex i, pointing to the left of travel.
function leftNormal(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

// Unit vector at vertex i pointing into the polygon (or out of it when `outward`).
export function vertexBisector(points, i, outward = false) {
  const n = points.length;
  const prev = points[(i + n - 1) % n];
  const cur = points[i];
  const next = points[(i + 1) % n];
  const flip = (polygonArea(points) > 0 ? 1 : -1) * (outward ? -1 : 1);
  const a = leftNormal(prev, cur);
  const b = leftNormal(cur, next);
  let x = (a.x + b.x) * flip;
  let y = (a.y + b.y) * flip;
  let len = Math.hypot(x, y);
  if (len < 1e-9) { x = a.x * flip; y = a.y * flip; len = Math.hypot(x, y); }
  return { x: x / len, y: y / len };
}
