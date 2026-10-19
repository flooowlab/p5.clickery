// The magic wand: flood-select pixels of similar colour into a mask, plus
// small mask helpers. A mask is { width, height, data: Uint8Array } with 1 for selected.

export function emptyMask(width, height) {
  return { width, height, data: new Uint8Array(width * height) };
}

export function maskCount(mask) {
  let n = 0;
  for (let i = 0; i < mask.data.length; i++) n += mask.data[i];
  return n;
}

// Selects pixels whose colour is within `tolerance` (per channel, 0-255) of the
// pixel at (x, y). `contiguous` selects only the connected area (4-way); turn it
// off to select that colour everywhere. `image` is ImageData-like { width, height, data }.
export function floodSelect(image, x, y, tolerance = 24, { contiguous = true } = {}) {
  const { width, height, data } = image;
  const mask = emptyMask(width, height);
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return mask;

  const seed = (sy * width + sx) * 4;
  const r = data[seed];
  const g = data[seed + 1];
  const b = data[seed + 2];
  const a = data[seed + 3];
  const matches = (p) => {
    const i = p * 4;
    return Math.abs(data[i] - r) <= tolerance && Math.abs(data[i + 1] - g) <= tolerance
      && Math.abs(data[i + 2] - b) <= tolerance && Math.abs(data[i + 3] - a) <= tolerance;
  };

  if (!contiguous) {
    for (let p = 0; p < width * height; p++) if (matches(p)) mask.data[p] = 1;
    return mask;
  }

  const stack = new Int32Array(width * height);
  let top = 0;
  stack[top++] = sy * width + sx;
  mask.data[sy * width + sx] = 1;
  while (top > 0) {
    const p = stack[--top];
    const px = p % width;
    const py = (p - px) / width;
    const visit = (q) => {
      if (mask.data[q] === 0 && matches(q)) { mask.data[q] = 1; stack[top++] = q; }
    };
    if (px > 0) visit(p - 1);
    if (px < width - 1) visit(p + 1);
    if (py > 0) visit(p - width);
    if (py < height - 1) visit(p + width);
  }
  return mask;
}

function combine(a, b, fn) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('masks must be the same size');
  const out = emptyMask(a.width, a.height);
  for (let i = 0; i < out.data.length; i++) out.data[i] = fn(a.data[i], b.data[i]) ? 1 : 0;
  return out;
}

export const unionMask = (a, b) => combine(a, b, (x, y) => x || y);
export const subtractMask = (a, b) => combine(a, b, (x, y) => x && !y);

// Smallest box around the selected pixels, or null for an empty mask.
export function maskBounds(mask) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!mask.data[y * mask.width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
