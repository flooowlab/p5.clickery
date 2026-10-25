// Checks a room description for mistakes the game would otherwise only show while playing.
// Used by tools/check-rooms.mjs. Returns a list of { level: 'error' | 'warning', message }.
//
//   error:   the game cannot load the room, or a hotspot cannot work
//   warning: it loads, but something is probably not what you meant
import { parseRoom } from '../../src/scene/room.js';
import { Navigator } from '../../src/nav/navigator.js';

const PROVIDERS = ['polygon', 'svg', 'colorMask'];
const isNumber = (n) => Number.isFinite(n);

/**
 * @param {Object} json The room.
 * @param {Object} [options]
 * @param {Object<string,string>} [options.strings] Text keys that are defined; with it, hotspot names are checked against it.
 * @returns {Array<{level: string, message: string}>}
 */
export function checkRoom(json, { strings = null } = {}) {
  const problems = [];
  const error = (message) => problems.push({ level: 'error', message });
  const warn = (message) => problems.push({ level: 'warning', message });

  let room;
  try {
    room = parseRoom(json);
  } catch (err) {
    error(err.message);
    return problems;
  }

  const floor = room.walkable.length ? Navigator.fromRoom(room) : null;
  if (!floor) warn('there is no walkable area, so the hero cannot walk anywhere');

  for (const [name, start] of Object.entries(room.starts)) {
    if (floor && !floor.isWalkable(start.x, start.y)) warn(`start "${name}" (${start.x}, ${start.y}) is not on the floor`);
  }

  const first = room.starts.default ?? Object.values(room.starts)[0];
  for (const h of room.hotspots) {
    const where = `hotspot "${h.id}"`;
    if (!PROVIDERS.includes(h.provider)) {
      error(`${where}: provider must be ${PROVIDERS.join(', ')}, got ${JSON.stringify(h.provider)}`);
      continue;
    }
    if (h.provider === 'polygon' && !(Array.isArray(h.points) && h.points.length >= 3)) error(`${where}: a polygon needs 3 or more points`);
    if (h.provider === 'svg' && !h.d && !h.svg) error(`${where}: an svg hotspot needs "d" (path data) or "svg" (a file)`);
    if (h.provider === 'colorMask' && !(h.mask && h.color)) error(`${where}: a colorMask hotspot needs "mask" and "color"`);

    if (h.walkTo) {
      if (!isNumber(h.walkTo.x) || !isNumber(h.walkTo.y)) error(`${where}: walkTo needs x and y`);
      else if (floor && !floor.isWalkable(h.walkTo.x, h.walkTo.y)) warn(`${where}: walkTo (${h.walkTo.x}, ${h.walkTo.y}) is not on the floor`);
      else if (floor && first && floor.isWalkable(first.x, first.y) && !floor.findPath(first, h.walkTo)) warn(`${where}: the hero cannot reach its walkTo from the start`);
    }

    const key = h.name ?? h.id; // a hotspot without a name shows its id
    if (strings && !(key in strings)) warn(`${where}: the name key "${key}" is not in the strings`);
  }
  return problems;
}
