import { pointInPolygon, dist, toPoint, segmentsCross, closestPointOnSegment, vertexBisector } from './geometry.js';
import { scaleFromStops } from './depth.js';

// Walkable areas minus obstacles, with any-angle pathfinding.
//
// Areas are the only source of movement, scale and depth: a point is walkable
// when it is inside some area and outside every obstacle. Paths run A* over a
// visibility graph (the polygon corners, nudged `margin` into walkable space),
// which gives the shortest route and needs no mesh baking. Lines are checked by
// sampling every `step` px plus exact crossing tests against obstacle edges.
//
//   areas:     [{ id, points: [[x, y], ...], scale: [[y, s], ...] }]
//   obstacles: [{ id, points }]
export class Navigator {
  #nodes = null;
  #links = null;

  constructor({ areas, obstacles = [], margin = 2, step = 2 }) {
    if (!areas?.length) throw new Error('Navigator needs at least one walkable area');
    this.areas = areas;
    this.obstacles = obstacles;
    this.margin = margin;
    this.step = step;
  }

  static fromRoom(room, options) {
    return new Navigator({ areas: room.walkable, obstacles: room.obstacles, ...options });
  }

  isWalkable(x, y) {
    return this.areas.some((a) => pointInPolygon(a.points, x, y))
      && !this.obstacles.some((o) => pointInPolygon(o.points, x, y));
  }

  // Depth scale at a point: the last area containing it wins, 1 outside all areas.
  scaleAt(x, y) {
    const area = this.areas.findLast((a) => pointInPolygon(a.points, x, y));
    return area ? scaleFromStops(area.scale, y) : 1;
  }

  // Is the straight line a to b walkable all the way?
  canSee(a, b) {
    const length = dist(a, b);
    const n = Math.ceil(length / this.step);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    for (const o of this.obstacles) {
      for (let i = 0; i < o.points.length; i++) {
        if (segmentsCross(a, b, toPoint(o.points[i]), toPoint(o.points[(i + 1) % o.points.length]))) return false;
      }
    }
    return true;
  }

  // The walkable point closest to p (p itself when walkable), or null.
  nearestWalkable(p) {
    if (this.isWalkable(p.x, p.y)) return { x: p.x, y: p.y };
    let best = null;
    let bestD = Infinity;
    const consider = (c) => {
      const d = dist(p, c);
      if (d < bestD && this.isWalkable(c.x, c.y)) { best = c; bestD = d; }
    };
    for (const poly of [...this.areas, ...this.obstacles]) {
      const pts = poly.points.map(toPoint);
      for (let i = 0; i < pts.length; i++) {
        const c = closestPointOnSegment(p, pts[i], pts[(i + 1) % pts.length]);
        consider(c);
        // The edge itself may count as outside; step off it towards each side.
        const nx = pts[(i + 1) % pts.length].y - pts[i].y;
        const ny = pts[i].x - pts[(i + 1) % pts.length].x;
        const len = Math.hypot(nx, ny) || 1;
        for (const s of [-1, 1]) {
          consider({ x: c.x + (s * nx * this.margin * 1.5) / len, y: c.y + (s * ny * this.margin * 1.5) / len });
        }
      }
    }
    return best;
  }

  // Waypoints from `from` to `to`, not including `from`. Endpoints off the
  // walkable area snap to the nearest walkable point. Null when unreachable.
  findPath(from, to) {
    const start = this.nearestWalkable(from);
    const goal = this.nearestWalkable(to);
    if (!start || !goal) return null;
    if (this.canSee(start, goal)) return [goal];

    this.#build();
    const nodes = [...this.#nodes, start, goal];
    const S = nodes.length - 2;
    const G = nodes.length - 1;
    const links = this.#links.map((l) => [...l]);
    links[S] = [];
    links[G] = [];
    for (let i = 0; i < S; i++) {
      for (const end of [S, G]) {
        if (this.canSee(nodes[i], nodes[end])) { links[i].push(end); links[end].push(i); }
      }
    }
    return this.#astar(nodes, links, S, G)?.slice(1) ?? null;
  }

  #build() {
    if (this.#nodes) return;
    const nodes = [];
    const add = (poly, outward) => {
      poly.points.forEach(([x, y], i) => {
        const b = vertexBisector(poly.points, i, outward);
        const node = { x: x + b.x * this.margin, y: y + b.y * this.margin };
        if (this.isWalkable(node.x, node.y)) nodes.push(node);
      });
    };
    for (const a of this.areas) add(a, false);
    for (const o of this.obstacles) add(o, true);
    const links = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (this.canSee(nodes[i], nodes[j])) { links[i].push(j); links[j].push(i); }
      }
    }
    this.#nodes = nodes;
    this.#links = links;
  }

  #astar(nodes, links, S, G) {
    const g = new Map([[S, 0]]);
    const from = new Map();
    const open = new Map([[S, dist(nodes[S], nodes[G])]]);
    const closed = new Set();
    while (open.size) {
      let cur = null;
      for (const [id, f] of open) if (cur === null || f < open.get(cur)) cur = id;
      if (cur === G) {
        const path = [];
        for (let id = G; id !== undefined; id = from.get(id)) path.unshift(nodes[id]);
        return path;
      }
      open.delete(cur);
      closed.add(cur);
      for (const next of links[cur]) {
        if (closed.has(next)) continue;
        const cost = g.get(cur) + dist(nodes[cur], nodes[next]);
        if (cost < (g.get(next) ?? Infinity)) {
          g.set(next, cost);
          from.set(next, cur);
          open.set(next, cost + dist(nodes[next], nodes[G]));
        }
      }
    }
    return null;
  }
}
