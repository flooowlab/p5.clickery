import { polygonProvider, colorMaskProvider, svgProvider, parseSvgPaths } from './providers.js';

/**
 * The description of a hotspot, as it appears in a room's `hotspots` list. The `provider` decides the
 * shape, and the other fields depend on it:
 *
 * - `'polygon'`: `points`, the corners as `[x, y]` pairs. The simplest; the room editor writes these.
 * - `'svg'`: `d`, SVG path data, or `svg`, the name of an SVG file whose `<path>` has this hotspot's `id` (or Inkscape label).
 * - `'colorMask'`: `mask`, a hidden picture where each colour is one hotspot, and `color`, this hotspot's colour in it.
 *   Export the mask without antialiasing; `tolerance` (default 4) is how far each colour channel may differ.
 *
 * @typedef {Object} HotspotDefinition
 * @property {string} id What you pass to `game.on(id, ...)`.
 * @property {string} [name] A text key shown when the pointer is over it. Default: the `id`.
 * @property {'polygon'|'svg'|'colorMask'} provider Which technique decides where it can be clicked.
 * @property {Array<Array<number>>} [points] `polygon`: the corners.
 * @property {string} [d] `svg`: path data.
 * @property {string} [svg] `svg`: the SVG file to find the path in.
 * @property {string} [mask] `colorMask`: the mask picture.
 * @property {string} [color] `colorMask`: the colour in the mask; for the other providers, a fill colour for the default drawing.
 * @property {number} [tolerance=4] `colorMask`: allowed difference per colour channel.
 * @property {number} [z=0] Which hotspot wins where two overlap: the higher one.
 * @property {WalkTarget} [walkTo] Where the hero stands before acting on it: `{ x, y, dir }`. Without it the hero acts where it stands.
 */

/**
 * A clickable area. The technique behind `hit()` (polygon, SVG path or colour mask) is hidden, so
 * game code only ever asks `hotspot.hit(x, y)`. Get the live hotspots of the room with
 * {@link Game#hotspot}; `enabled` switches one off.
 *
 * @param {Object} options
 * @param {string} options.id
 * @param {string} [options.name] A text key. Default: the `id`.
 * @param {{contains: function(number, number): boolean}} options.provider Decides what is inside.
 * @param {number} [options.z=0]
 * @param {WalkTarget} [options.walkTo]
 */
export class Hotspot {
  /** While `false`, it cannot be hit and the default drawing skips it. @type {boolean} */
  enabled = true;

  constructor({ id, name = null, provider, z = 0, walkTo = null }) {
    /** The id scripts are registered under. @type {string} */
    this.id = id;
    /** The text key shown on hover. @type {string} */
    this.name = name ?? id;
    this.provider = provider;
    /** Which hotspot wins where two overlap. @type {number} */
    this.z = z;
    /** Where the hero stands before acting on it, or `null`. @type {WalkTarget|null} */
    this.walkTo = walkTo;
  }

  /**
   * Asks whether a point is on the hotspot.
   * @param {number} x A room x.
   * @param {number} y A room y.
   * @returns {boolean} `false` when the hotspot is disabled.
   */
  hit(x, y) {
    return this.enabled && this.provider.contains(x, y);
  }
}

/**
 * Builds a hotspot from its entry in a room. A game does this for every hotspot when a room is entered.
 *
 * @param {HotspotDefinition} def
 * @param {Object} [assets] What files hold: `pixels(name)` returns `{ data, width, height }` (an `ImageData`) for `colorMask`, and `text(name)` returns the text of an SVG file.
 * @param {Room} [room] Gives the logical size a colour mask is scaled against.
 * @returns {Hotspot}
 * @throws {Error} For an unknown provider, or a provider whose assets are missing.
 */
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

/**
 * Builds every hotspot of a room.
 * @param {Room} room
 * @param {Object} [assets] See {@link createHotspot}.
 * @returns {Hotspot[]}
 */
export function createHotspots(room, assets) {
  return room.hotspots.map((def) => createHotspot(def, assets, room));
}
