// Hit-test providers. Each is { contains(x, y) } in room coordinates, and may
// add debugDraw(p) for the overlay. Game code never calls these directly, it
// goes through Hotspot.hit().

/**
 * Asks whether a point is inside a polygon (ray casting). A point on the edge counts as inside on the left and top only.
 * @param {Array<Array<number>>} points The corners as `[x, y]` pairs.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 * @example
 * pointInPolygon([[0, 0], [10, 0], [10, 10], [0, 10]], 5, 5); // true
 */
export function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * A hit-test provider for a polygon.
 * @param {Array<Array<number>>} points The corners. At least three.
 * @returns {{kind: string, contains: function(number, number): boolean, debugDraw: function(Object): void}}
 */
export function polygonProvider(points) {
  if (!Array.isArray(points) || points.length < 3) throw new RangeError('polygon needs 3+ points');
  return {
    kind: 'polygon',
    contains: (x, y) => pointInPolygon(points, x, y),
    debugDraw(p) {
      p.beginShape();
      for (const [x, y] of points) p.vertex(x, y);
      p.endShape(p.CLOSE);
    },
  };
}

/**
 * Turns a colour written as `#rrggbb` or `#rgb` into `[r, g, b]`.
 * @param {string} hex
 * @returns {number[]} Three numbers from 0 to 255.
 * @throws {TypeError} For anything that is not a hex colour.
 * @example
 * parseColor('#ff8000'); // [255, 128, 0]
 */
export function parseColor(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) throw new TypeError(`bad colour "${hex}", expected #rrggbb`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * A hit-test provider that matches one colour in a hidden mask picture. Read the pixels once, at
 * load, and keep them: reading them every frame is slow. The mask may have a different size from the
 * room; positions are scaled. Export masks without antialiasing or colour management.
 *
 * @param {Object} options
 * @param {{data: Uint8ClampedArray, width: number, height: number}} options.pixels The mask as `ImageData`.
 * @param {string} options.color The colour that means this hotspot: `#rrggbb`.
 * @param {number} [options.tolerance=4] How far each colour channel may differ.
 * @param {number} [options.roomWidth] The room width the mask is scaled against. Default: the mask's own.
 * @param {number} [options.roomHeight]
 * @returns {{kind: string, contains: function(number, number): boolean, debugDraw: function(Object): void}}
 */
export function colorMaskProvider({ pixels, color, tolerance = 4, roomWidth, roomHeight }) {
  const [r, g, b] = parseColor(color);
  const { data, width, height } = pixels;
  const sx = width / (roomWidth ?? width);
  const sy = height / (roomHeight ?? height);
  return {
    kind: 'colorMask',
    contains(x, y) {
      const px = Math.floor(x * sx);
      const py = Math.floor(y * sy);
      if (px < 0 || py < 0 || px >= width || py >= height) return false;
      const i = (py * width + px) * 4;
      return data[i + 3] > 0
        && Math.abs(data[i] - r) <= tolerance
        && Math.abs(data[i + 1] - g) <= tolerance
        && Math.abs(data[i + 2] - b) <= tolerance;
    },
    debugDraw(p) {
      p.noFill();
      p.text(`mask ${color}`, 4, 12);
    },
  };
}

/**
 * A hit-test provider for an SVG path, using the browser's `Path2D`. Path data is in room
 * coordinates, so apply any SVG transform before exporting.
 *
 * @param {Object} options
 * @param {string} options.d The path data.
 * @param {Function} [options.Path2D] Default: the browser's. Inject one to test without a browser.
 * @param {Object} [options.ctx] A 2D context with `isPointInPath`. Default: an offscreen canvas.
 * @returns {{kind: string, contains: function(number, number): boolean, debugDraw: function(Object): void}}
 */
export function svgProvider({ d, Path2D: PathClass = globalThis.Path2D, ctx }) {
  if (typeof d !== 'string' || d.trim() === '') throw new TypeError('svg provider needs path data');
  if (!PathClass) throw new Error('svg provider needs Path2D');
  const path = new PathClass(d);
  let context = ctx;
  return {
    kind: 'svg',
    contains(x, y) {
      context ??= new OffscreenCanvas(1, 1).getContext('2d');
      return context.isPointInPath(path, x, y);
    },
    debugDraw(p) {
      p.drawingContext.stroke(path);
    },
  };
}

/**
 * Finds the `<path>` elements in SVG text and returns their path data by `id`, and by
 * `inkscape:label` when there is one. Only plain `d` attributes are read.
 * @param {string} svgText
 * @returns {Object<string, string>} `{ id: d }`.
 * @example
 * parseSvgPaths('<path id="crate" d="M0 0 L10 0 L10 10 Z"/>'); // { crate: 'M0 0 L10 0 L10 10 Z' }
 */
export function parseSvgPaths(svgText) {
  const paths = {};
  for (const [, attrs] of svgText.matchAll(/<path\b([^>]*)>/g)) {
    const attr = (name) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
    const d = attr('d');
    if (!d) continue;
    for (const name of ['id', 'inkscape:label']) {
      const m = attr(name);
      if (m) paths[m[1] ?? m[2]] = d[1] ?? d[2];
    }
  }
  return paths;
}
