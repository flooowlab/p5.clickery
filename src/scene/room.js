/**
 * A room: one screen of the game, or one wide scrolling screen. It is plain data, so it can be an
 * object in your code or a JSON file (the room editor writes one). {@link parseRoom} checks it and
 * fills in the defaults. At least one start is required; see also {@link Hotspot} for the hotspot
 * fields.
 *
 * @typedef {Object} Room
 * @property {string} id The room's name, used by `game.goTo(id)` and in the state (`rooms.<id>`).
 * @property {number} width Width in logical pixels. Wider than the screen scrolls with the camera.
 * @property {number} height Height in logical pixels.
 * @property {string} [background] The name of the background picture, loaded relative to the room file.
 * @property {string} [color='#000000'] A flat fill, used when there is no `background`.
 * @property {string|null} [music] A sound id to play here. `null` is silence; leave it out to keep the current music.
 * @property {Array<RoomLayer>} [layers] Extra pictures in front of or behind the action.
 * @property {Array<Object>} [hotspots] The clickable areas: `{ id, name, provider, points, walkTo, color }`.
 * @property {Array<WalkableArea>} [walkable] The floor the hero can walk on.
 * @property {Array<WalkableArea>} [obstacles] Holes in the floor: `{ id, points }`.
 * @property {Object<string, RoomStart>} starts Named places the hero can appear. `default` is used when none is named.
 */

/**
 * A picture layer of a room.
 *
 * @typedef {Object} RoomLayer
 * @property {string} image The picture's name.
 * @property {'bg'|'fg'} [depth='bg'] `'bg'` is drawn behind the hero, `'fg'` in front of everything.
 * @property {number} [parallax=1] `1` moves with the room, `0` stays fixed on the screen; in between looks far away.
 */

/**
 * A floor or an obstacle: a polygon.
 *
 * @typedef {Object} WalkableArea
 * @property {string} id A name, unique in the room.
 * @property {Array<Array<number>>} points The corners as `[x, y]` pairs. At least three.
 * @property {Array<Array<number>>} [scale] Depth scale stops as `[y, size]` pairs: `[[250, 0.6], [360, 1]]` is 60% size at y 250 and full size at y 360.
 * @property {string} [color] A fill colour for the default drawing, handy before there is art.
 */

/**
 * A place the hero can appear in a room.
 *
 * @typedef {Object} RoomStart
 * @property {number} x
 * @property {number} y
 * @property {string} [dir] The direction to face: `'up'`, `'right'`, `'down'` or `'left'`.
 */

/**
 * Checks a room and fills in its defaults. It does not load any pictures. A game and its scene
 * manager call it for you.
 *
 * @param {Object} json The room.
 * @returns {Room} The room with defaults filled in: no `background` is `null`, `color` is black, lists are lists.
 * @throws {Error} With a message naming the room and what is wrong: no id, a size that is not above 0, a duplicate id, fewer than three corners, no start.
 * @example
 * const room = parseRoom({
 *   id: 'yard', width: 640, height: 360,
 *   starts: { default: { x: 80, y: 300 } },
 *   walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
 * });
 */
export function parseRoom(json) {
  const where = `room "${json?.id ?? '?'}"`;
  if (json === null || typeof json !== 'object') throw new TypeError('room must be an object');
  if (typeof json.id !== 'string' || json.id === '') throw new TypeError('room needs a string id');
  for (const key of ['width', 'height']) {
    if (!Number.isFinite(json[key]) || json[key] <= 0) throw new RangeError(`${where}: ${key} must be a positive number`);
  }
  const ids = new Set();
  const unique = (kind, id) => {
    if (typeof id !== 'string' || id === '') throw new TypeError(`${where}: every ${kind} needs a string id`);
    if (ids.has(`${kind}:${id}`)) throw new Error(`${where}: duplicate ${kind} id "${id}"`);
    ids.add(`${kind}:${id}`);
  };

  const layers = (json.layers ?? []).map((layer, i) => {
    if (typeof layer.image !== 'string') throw new TypeError(`${where}: layer ${i} needs an image`);
    const depth = layer.depth ?? 'bg';
    if (depth !== 'bg' && depth !== 'fg') throw new RangeError(`${where}: layer ${i} depth must be "bg" or "fg"`);
    const parallax = layer.parallax ?? 1;
    if (!Number.isFinite(parallax) || parallax < 0) throw new RangeError(`${where}: layer ${i} parallax must be >= 0`);
    return { image: layer.image, depth, parallax };
  });

  const hotspots = (json.hotspots ?? []).map((h) => {
    unique('hotspot', h.id);
    return { ...h };
  });

  const walkable = (json.walkable ?? []).map((area) => {
    unique('walkable', area.id);
    if (!Array.isArray(area.points) || area.points.length < 3) throw new RangeError(`${where}: walkable "${area.id}" needs 3+ points`);
    return { ...area };
  });

  const obstacles = (json.obstacles ?? []).map((o) => {
    unique('obstacle', o.id);
    if (!Array.isArray(o.points) || o.points.length < 3) throw new RangeError(`${where}: obstacle "${o.id}" needs 3+ points`);
    return { ...o };
  });

  const starts = json.starts ?? {};
  if (Object.keys(starts).length === 0) throw new Error(`${where}: needs at least one start position`);
  for (const [name, s] of Object.entries(starts)) {
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) throw new TypeError(`${where}: start "${name}" needs x and y`);
  }

  return {
    id: json.id,
    width: json.width,
    height: json.height,
    background: json.background ?? null,
    color: json.color ?? '#000000',
    music: json.music, // sound id; omitted keeps the current music, null stops it
    layers,
    hotspots,
    walkable,
    obstacles,
    starts: structuredClone(starts),
  };
}

/**
 * Finds one of a room's start positions.
 * @param {Room} room
 * @param {string} [name='default']
 * @returns {RoomStart}
 * @throws {Error} When the room has no start of that name.
 */
export function startPosition(room, name = 'default') {
  const start = room.starts[name];
  if (!start) throw new Error(`room "${room.id}" has no start "${name}"`);
  return start;
}
