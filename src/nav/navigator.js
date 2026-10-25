import { pointInPolygon, dist, toPoint, segmentsCross, closestPointOnSegment, vertexBisector } from './geometry.js';
import { scaleFromStops } from './depth.js';

/**
 * The floor of a room: walkable areas minus obstacles, with shortest-path walking. Walkable areas
 * are the only source of movement, scale and depth: a point is walkable when it is inside some
 * area and outside every obstacle. Paths use A* over the polygon corners, so they take the shortest
 * route around obstacles and need no baking. A game makes one for every room it enters and gives
 * it to the hero: `game.hero.navigator`.
 *
 * @example
 * const navigator = Navigator.fromRoom(room);
 * navigator.isWalkable(100, 300);                      // true or false
 * navigator.findPath({ x: 50, y: 300 }, { x: 600, y: 300 }); // a list of waypoints, or null
 * navigator.scaleAt(100, 300);                         // the size factor there
 *
 * @param {Object} options
 * @param {Array<WalkableArea>} options.areas The floors. At least one.
 * @param {Array<WalkableArea>} [options.obstacles] The holes.
 * @param {number} [options.margin=2] How far path corners are nudged away from obstacles, in pixels.
 * @param {number} [options.step=2] How often a straight line is sampled to check it is walkable, in pixels.
 */
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

  /**
   * Makes the navigator of a room from its `walkable` and `obstacles`.
   * @param {Room} room
   * @param {Object} [options] The other options of the constructor.
   * @returns {Navigator}
   */
  static fromRoom(room, options) {
    return new Navigator({ areas: room.walkable, obstacles: room.obstacles, ...options });
  }

  /**
   * Asks whether a point is on the floor: inside some area and outside every obstacle.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isWalkable(x, y) {
    return this.areas.some((a) => pointInPolygon(a.points, x, y))
      && !this.obstacles.some((o) => pointInPolygon(o.points, x, y));
  }

  /**
   * The size of things at a point, from the `scale` stops of the area there. The last area containing the point wins.
   * @param {number} x
   * @param {number} y
   * @returns {number} `1` is full size; `1` outside all areas.
   */
  scaleAt(x, y) {
    const area = this.areas.findLast((a) => pointInPolygon(a.points, x, y));
    return area ? scaleFromStops(area.scale, y) : 1;
  }

  /**
   * Asks whether the straight line between two points is walkable all the way.
   * @param {{x: number, y: number}} a
   * @param {{x: number, y: number}} b
   * @returns {boolean}
   */
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

  /**
   * The walkable point closest to a point. This is where the hero goes when the player clicks off the floor.
   * @param {{x: number, y: number}} p
   * @returns {{x: number, y: number}|null} `p` itself when it is walkable; `null` when there is none.
   */
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

  /**
   * The shortest walk between two points. A point off the floor snaps to the nearest walkable point.
   * @param {{x: number, y: number}} from
   * @param {{x: number, y: number}} to
   * @returns {Array<{x: number, y: number}>|null} The waypoints to walk through, not including `from`; `null` when unreachable.
   */
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
