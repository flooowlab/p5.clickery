import { polygonProvider, colorMaskProvider, svgProvider, parseSvgPaths } from './providers.js';

// A clickable region. The technique behind hit() is a provider and is hidden
// from game code.
export class Hotspot {
  enabled = true;

  constructor({ id, name = null, provider, z = 0, walkTo = null }) {
    this.id = id;
    this.name = name ?? id; // localisation key
    this.provider = provider;
    this.z = z;
    this.walkTo = walkTo;
  }

  hit(x, y) {
    return this.enabled && this.provider.contains(x, y);
  }
}

// Builds a hotspot from its room JSON entry. `assets` supplies what files hold:
//   pixels(name)  -> { data, width, height }   for colorMask
//   text(name)    -> string                    for svg files
//   Path2D, ctx   -> optional overrides for svg (tests)
// `room` gives the logical size a mask is scaled against.
export function createHotspot(def, assets = {}, room = {}) {
  let provider;
  switch (def.provider) {
    case 'polygon':
      provider = polygonProvider(def.points);
      break;
    case 'colorMask':
      provider = colorMaskProvider({
        pixels: required(assets.pixels, 'pixels')(def.mask),
        color: def.color,
        tolerance: def.tolerance,
        roomWidth: room.width,
        roomHeight: room.height,
      });
      break;
    case 'svg': {
      const d = def.d ?? pathFor(def, assets);
      provider = svgProvider({ d, Path2D: assets.Path2D, ctx: assets.ctx });
      break;
    }
    default:
      throw new RangeError(`hotspot "${def.id}": unknown provider "${def.provider}"`);
  }
  return new Hotspot({ ...def, provider });
}

function pathFor(def, assets) {
  const paths = parseSvgPaths(required(assets.text, 'text')(def.svg));
  const d = paths[def.pathId ?? def.id];
  if (!d) throw new Error(`hotspot "${def.id}": no path "${def.pathId ?? def.id}" in ${def.svg}`);
  return d;
}

function required(fn, name) {
  if (typeof fn !== 'function') throw new Error(`this hotspot needs assets.${name}()`);
  return fn;
}

export function createHotspots(room, assets) {
  return room.hotspots.map((def) => createHotspot(def, assets, room));
}
