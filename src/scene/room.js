// Room JSON format. parseRoom validates a room description and fills defaults;
// it does not load any images (see scene/render.js for drawing).
//
// {
//   "id": "hall", "width": 960, "height": 360,
//   "background": "hall.png",            // or "color": "#223344" for a flat fill
//   "music": "hall-theme",               // optional: sound id; null = silence, omitted = keep playing
//   "layers": [{ "image": "far.png", "parallax": 0.5, "depth": "bg" },
//              { "image": "pillar.png", "depth": "fg" }],
//   "hotspots": [{ "id": "door", "name": "room.hall.door", "provider": "polygon", "points": [[10,10],...] }],
//   "walkable": [{ "id": "floor", "points": [[0,250],[960,250],[960,360],[0,360]],
//                  "scale": [[250, 0.6], [360, 1]] }],      // [y, scale] stops
//   "obstacles": [{ "id": "table", "points": [[300,280],[400,280],[400,320],[300,320]] }],
//   "starts": { "default": { "x": 100, "y": 300, "dir": "right" } }
// }
// Parallax: 1 moves with the camera (the room itself), 0 stays fixed on screen.
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

// Start position by name; "default" when unnamed, error when unknown.
export function startPosition(room, name = 'default') {
  const start = room.starts[name];
  if (!start) throw new Error(`room "${room.id}" has no start "${name}"`);
  return start;
}
