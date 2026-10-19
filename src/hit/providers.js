// Hit-test providers. Each is { contains(x, y) } in room coordinates, and may
// add debugDraw(p) for the overlay. Game code never calls these directly, it
// goes through Hotspot.hit().

// Ray casting. Points are [[x, y], ...]; the edge counts as inside on the left/top only.
export function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

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

// "#rrggbb" or "#rgb" to [r, g, b].
export function parseColor(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) throw new TypeError(`bad colour "${hex}", expected #rrggbb`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Matches one colour in a hidden mask image. `pixels` is an ImageData-like
// { data, width, height }, read once at load. The mask may have a different
// resolution from the room, so room coordinates are scaled to it.
// Export masks without antialiasing or colour management; `tolerance` is per channel.
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

// Path2D based. `Path2D` and `ctx` default to the browser's; inject them to test.
// Path data is in room coordinates (apply any SVG transform before exporting).
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

// Finds <path> elements in SVG text and returns { key: d }, keyed by id and by
// inkscape:label when present. Only plain `d` attributes are read.
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
