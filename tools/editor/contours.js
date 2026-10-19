import { pointInPolygon } from '../../src/hit/providers.js';
import { signedArea, simplifyLoop } from './simplify.js';

// Mask -> outlines with marching squares.
//
// Pixel centres are the sample points. Every 2x2 block of samples is a cell; the
// contour crosses the cell edges halfway between an inside and an outside sample,
// which is exactly on the pixel boundary for straight edges. Diagonal-only
// contact (two pixels touching at a corner) counts as NOT connected, matching
// the 4-way flood fill of the wand. Segments are oriented so that the inside is
// always on the same side, so outer loops come out with positive area and holes
// with negative area.

const T = 0;
const R = 1;
const B = 2;
const L = 3;
const MID = [[1, 0], [2, 1], [1, 2], [0, 1]]; // edge midpoints in doubled cell units
const CORNER = { tl: [0, 0], tr: [2, 0], br: [2, 2], bl: [0, 2] };
const BIT = { tl: 8, tr: 4, br: 2, bl: 1 };

// case = tl*8 + tr*4 + br*2 + bl. Each segment: [edge, edge, reference corner].
const CASES = {
  1: [[L, B, 'bl']], 2: [[B, R, 'br']], 3: [[L, R, 'bl']], 4: [[T, R, 'tr']],
  5: [[T, R, 'tr'], [L, B, 'bl']], 6: [[T, B, 'tr']], 7: [[T, L, 'tl']], 8: [[T, L, 'tl']],
  9: [[T, B, 'tl']], 10: [[T, L, 'tl'], [B, R, 'br']], 11: [[T, R, 'tr']], 12: [[L, R, 'tl']],
  13: [[B, R, 'br']], 14: [[L, B, 'bl']],
};

// Orient each segment so the inside corner (or the outside one, for an outside
// reference) lies on the positive side.
const SEGMENTS = Object.fromEntries(Object.entries(CASES).map(([index, segs]) => [index, segs.map(([e1, e2, ref]) => {
  let a = MID[e1];
  let b = MID[e2];
  const c = CORNER[ref];
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const refInside = (Number(index) & BIT[ref]) !== 0;
  if ((cross > 0) !== refInside) [a, b] = [b, a];
  return [a, b];
})]));

// All closed outlines of the mask, as lists of [x, y] in pixel coordinates.
// Marching squares cuts every corner by half a sample, so by default the mask is
// sampled at `scale` times its resolution (each pixel counts as scale x scale
// samples): corners are then off by a quarter pixel at most and round to the right
// whole number. Use scale 1 for very large masks to save time.
export function traceContours(mask, { scale = 2 } = {}) {
  const { width: maskWidth, height: maskHeight, data } = mask;
  const width = maskWidth * scale;
  const height = maskHeight * scale;
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : data[Math.floor(y / scale) * maskWidth + Math.floor(x / scale)]);
  const next = new Map(); // "x,y" (doubled sample units) -> [x, y] of the next point

  for (let cy = -1; cy < height; cy++) {
    for (let cx = -1; cx < width; cx++) {
      const index = (at(cx, cy) << 3) | (at(cx + 1, cy) << 2) | (at(cx + 1, cy + 1) << 1) | at(cx, cy + 1);
      const segments = SEGMENTS[index];
      if (!segments) continue;
      for (const [a, b] of segments) {
        const from = [2 * cx + a[0], 2 * cy + a[1]];
        const key = `${from[0]},${from[1]}`;
        if (next.has(key)) throw new Error('ambiguous contour (internal error)');
        next.set(key, [2 * cx + b[0], 2 * cy + b[1]]);
      }
    }
  }

  const loops = [];
  const seen = new Set();
  for (const startKey of next.keys()) {
    if (seen.has(startKey)) continue;
    const loop = [];
    let key = startKey;
    while (!seen.has(key)) {
      seen.add(key);
      const [gx, gy] = key.split(',').map(Number);
      loop.push([(gx / 2 + 0.5) / scale, (gy / 2 + 0.5) / scale]);
      const to = next.get(key);
      key = `${to[0]},${to[1]}`;
    }
    loops.push(loop);
  }
  return loops;
}

// Outlines grouped into regions: { outer, holes: [...], area }, simplified.
// `minArea` ignores specks. Holes belong to the smallest outline that contains them.
export function maskToRegions(mask, { epsilon = 1.5, minArea = 16, scale = mask.width * mask.height > 3_000_000 ? 1 : 2 } = {}) {
  const loops = traceContours(mask, { scale }).map((points) => ({ points, area: signedArea(points) }));
  const regions = loops.filter((l) => l.area >= minArea).map((l) => ({ source: l.points, area: l.area, holes: [] }));
  for (const hole of loops.filter((l) => -l.area >= minArea)) {
    const [px, py] = hole.points[0];
    const owner = regions
      .filter((r) => pointInPolygon(r.source, px, py))
      .sort((a, b) => a.area - b.area)[0];
    owner?.holes.push(simplifyLoop(hole.points, epsilon));
  }
  return regions.map((r) => ({ outer: simplifyLoop(r.source, epsilon), holes: r.holes, area: r.area }));
}
