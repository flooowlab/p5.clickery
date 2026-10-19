import { pointInPolygon } from '../../src/hit/providers.js';
import { signedArea, roundLoop } from './simplify.js';
import { maskToRegions } from './contours.js';

// The level editor's document: one room made of shapes. It exports exactly the
// JSON the runtime's parseRoom() reads, so nothing needs editing by hand.
//
// Shapes: 'hotspot' (clickable, exported as a polygon hotspot), 'walkable'
// (floor, optional depth scale stops) and 'obstacle' (a hole in the floor).
// Everything that changes the document goes through #mutate, which also keeps
// the undo history.
export const KINDS = ['hotspot', 'walkable', 'obstacle'];
export const DIRECTIONS = ['up', 'right', 'down', 'left', 'up_right', 'down_right', 'down_left', 'up_left'];
const ID_PATTERN = /^[A-Za-z_][\w-]*$/;
const PREFIX = { hotspot: 'hotspot', walkable: 'floor', obstacle: 'obstacle' };

export class EditorModel {
  #uid = 1;
  #undo = [];
  #redo = [];
  #listeners = new Set();
  #depth = 0;

  constructor({ id = 'room', width = 640, height = 360, background = null, color = '#000000', music } = {}) {
    this.room = { id, width, height, background, color, music };
    this.shapes = [];
    this.starts = {};
    this.passthrough = []; // hotspots the editor cannot edit (svg / colorMask), kept as they are
  }

  // ---- reading ----

  shapesOf(kind) {
    return this.shapes.filter((s) => s.kind === kind);
  }

  shape(uid) {
    return this.shapes.find((s) => s.uid === uid) ?? null;
  }

  get canUndo() { return this.#undo.length > 0; }

  get canRedo() { return this.#redo.length > 0; }

  onChange(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  // Is a point on walkable ground (inside a floor, outside every obstacle)?
  isWalkable(x, y) {
    return this.shapesOf('walkable').some((s) => pointInPolygon(s.points, x, y))
      && !this.shapesOf('obstacle').some((s) => pointInPolygon(s.points, x, y));
  }

  // ---- editing ----

  setRoom(patch) {
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in this.room)) throw new Error(`unknown room field "${k}"`);
      if ((k === 'width' || k === 'height') && !(v > 0)) throw new RangeError(`${k} must be positive`);
      if (k === 'id') this.#checkId(v);
    }
    this.#mutate(() => Object.assign(this.room, patch));
  }

  addShape(kind, points, props = {}) {
    if (!KINDS.includes(kind)) throw new Error(`unknown shape kind "${kind}"`);
    const pts = this.#cleanPoints(points);
    const id = props.id ?? this.#autoId(kind);
    this.#checkId(id);
    this.#checkUnique(kind, id);
    const shape = { uid: this.#uid++, kind, id, points: pts };
    if (kind === 'hotspot') Object.assign(shape, { name: props.name ?? null, z: props.z ?? 0, walkTo: props.walkTo ?? null });
    if (kind === 'walkable') shape.scale = props.scale ?? null;
    this.#mutate(() => this.shapes.push(shape));
    return shape;
  }

  removeShape(uid) {
    this.#need(uid);
    this.#mutate(() => { this.shapes = this.shapes.filter((s) => s.uid !== uid); });
  }

  // Fields: id, name, z, walkTo ({ x, y, dir } or null) for hotspots; scale ([[y, s], ...] or null) for floors.
  updateShape(uid, patch) {
    const shape = this.#need(uid);
    const allowed = { hotspot: ['id', 'name', 'z', 'walkTo'], walkable: ['id', 'scale'], obstacle: ['id'] }[shape.kind];
    for (const [k, v] of Object.entries(patch)) {
      if (!allowed.includes(k)) throw new Error(`a ${shape.kind} has no field "${k}"`);
      if (k === 'id') { this.#checkId(v); if (v !== shape.id) this.#checkUnique(shape.kind, v); }
      if (k === 'z' && !Number.isFinite(v)) throw new TypeError('z must be a number');
      if (k === 'scale') this.#checkScale(v);
      if (k === 'walkTo' && v !== null) this.#checkWalkTo(v);
    }
    this.#mutate(() => Object.assign(shape, patch.walkTo ? { ...patch, walkTo: this.#cleanWalkTo(patch.walkTo) } : patch));
    return shape;
  }

  movePoint(uid, index, x, y) {
    const shape = this.#need(uid);
    if (!shape.points[index]) throw new RangeError(`no point ${index}`);
    this.#mutate(() => { shape.points[index] = this.#clamp(x, y); });
  }

  insertPoint(uid, index, x, y) {
    const shape = this.#need(uid);
    this.#mutate(() => shape.points.splice(index, 0, this.#clamp(x, y)));
  }

  removePoint(uid, index) {
    const shape = this.#need(uid);
    if (shape.points.length <= 3) throw new Error('a shape needs at least 3 points');
    this.#mutate(() => shape.points.splice(index, 1));
  }

  // Replaces all points at once (a finished drag is a single undo step).
  setPoints(uid, points) {
    const shape = this.#need(uid);
    const pts = this.#cleanPoints(points);
    this.#mutate(() => { shape.points = pts; });
  }

  moveShape(uid, dx, dy) {
    const shape = this.#need(uid);
    this.#mutate(() => { shape.points = shape.points.map(([x, y]) => this.#clamp(x + dx, y + dy)); });
  }

  setStart(name, x, y, dir = 'down') {
    this.#checkId(name);
    if (!DIRECTIONS.includes(dir)) throw new Error(`unknown direction "${dir}"`);
    const [cx, cy] = this.#clamp(x, y);
    this.#mutate(() => { this.starts[name] = { x: cx, y: cy, dir }; });
  }

  removeStart(name) {
    if (!(name in this.starts)) throw new Error(`no start "${name}"`);
    this.#mutate(() => { delete this.starts[name]; });
  }

  // Several edits as one undo step.
  transaction(fn) {
    return this.#mutate(fn);
  }

  undo() {
    if (!this.canUndo) return false;
    this.#redo.push(this.#snapshot());
    this.#restore(this.#undo.pop());
    this.#emit();
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.#undo.push(this.#snapshot());
    this.#restore(this.#redo.pop());
    this.#emit();
    return true;
  }

  // ---- checking and export ----

  // [{ level: 'error' | 'warning', message }]. Errors would stop the room working.
  problems() {
    const out = [];
    const error = (message) => out.push({ level: 'error', message });
    const warning = (message) => out.push({ level: 'warning', message });
    if (Object.keys(this.starts).length === 0) error('Add at least one start position (Start tool).');
    for (const s of this.shapes) if (Math.abs(signedArea(s.points)) < 1) error(`${s.kind} "${s.id}" has no area.`);
    if (this.shapesOf('walkable').length === 0) warning('No walkable area: the hero cannot walk anywhere.');
    else {
      for (const [name, s] of Object.entries(this.starts)) {
        if (!this.isWalkable(s.x, s.y)) warning(`Start "${name}" is not on walkable ground.`);
      }
      for (const h of this.shapesOf('hotspot')) {
        if (h.walkTo && !this.isWalkable(h.walkTo.x, h.walkTo.y)) warning(`Hotspot "${h.id}": its walk-to point is not on walkable ground.`);
      }
    }
    return out;
  }

  toRoomJSON() {
    const { id, width, height, background, color, music } = this.room;
    const room = { id, width, height };
    if (background) room.background = background;
    else room.color = color;
    if (music !== undefined) room.music = music;
    room.starts = structuredClone(this.starts);
    room.walkable = this.shapesOf('walkable').map((s) => ({ id: s.id, points: s.points, ...(s.scale ? { scale: s.scale.slice().sort((a, b) => a[0] - b[0]) } : {}) }));
    room.obstacles = this.shapesOf('obstacle').map((s) => ({ id: s.id, points: s.points }));
    room.hotspots = [
      ...this.shapesOf('hotspot').map((s) => ({
        id: s.id, name: s.name ?? `obj.${s.id}`, provider: 'polygon', points: s.points,
        ...(s.z ? { z: s.z } : {}), ...(s.walkTo ? { walkTo: s.walkTo } : {}),
      })),
      ...structuredClone(this.passthrough),
    ];
    return structuredClone(room);
  }

  // A starter text table for the hotspot names: { "obj.door": "door" }.
  stringsTemplate() {
    return Object.fromEntries(this.shapesOf('hotspot').map((s) => [s.name ?? `obj.${s.id}`, s.id]));
  }

  static fromRoomJSON(json) {
    const model = new EditorModel({
      id: json.id, width: json.width, height: json.height,
      background: json.background ?? null, color: json.color ?? '#000000', music: json.music,
    });
    for (const a of json.walkable ?? []) model.#load('walkable', a.points, { id: a.id, scale: a.scale ?? null });
    for (const o of json.obstacles ?? []) model.#load('obstacle', o.points, { id: o.id });
    for (const h of json.hotspots ?? []) {
      if (h.provider === 'polygon') model.#load('hotspot', h.points, { id: h.id, name: h.name ?? null, z: h.z ?? 0, walkTo: h.walkTo ?? null });
      else model.passthrough.push(structuredClone(h));
    }
    model.starts = structuredClone(json.starts ?? {});
    return model;
  }

  // ---- internals ----

  #load(kind, points, props) {
    this.shapes.push({ uid: this.#uid++, kind, points: points.map((p) => [...p]), ...props });
  }

  #need(uid) {
    const shape = this.shape(uid);
    if (!shape) throw new Error(`no shape ${uid}`);
    return shape;
  }

  #autoId(kind) {
    for (let n = 1; ; n++) {
      const id = `${PREFIX[kind]}${n}`;
      if (!this.shapes.some((s) => s.kind === kind && s.id === id)) return id;
    }
  }

  #checkId(id) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new Error(`"${id}" is not a valid id: use letters, digits, "_" or "-", starting with a letter (no dots or spaces)`);
    }
  }

  #checkUnique(kind, id) {
    if (this.shapes.some((s) => s.kind === kind && s.id === id)) throw new Error(`there is already a ${kind} called "${id}"`);
  }

  #checkScale(scale) {
    if (scale === null) return;
    const ok = Array.isArray(scale) && scale.length > 0 && scale.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && p[1] > 0);
    if (!ok) throw new TypeError('scale must be a list of [y, scale] pairs with scale above 0');
  }

  #checkWalkTo(w) {
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y)) throw new TypeError('walkTo needs x and y');
    if (w.dir !== undefined && !DIRECTIONS.includes(w.dir)) throw new Error(`unknown direction "${w.dir}"`);
  }

  #cleanWalkTo(w) {
    const [x, y] = this.#clamp(w.x, w.y);
    return { x, y, ...(w.dir ? { dir: w.dir } : {}) };
  }

  #clamp(x, y) {
    return [Math.round(Math.min(Math.max(x, 0), this.room.width)), Math.round(Math.min(Math.max(y, 0), this.room.height))];
  }

  #cleanPoints(points) {
    if (!Array.isArray(points)) throw new TypeError('points must be a list');
    const pts = roundLoop(points.map(([x, y]) => this.#clamp(x, y)));
    if (pts.length < 3) throw new Error('a shape needs at least 3 different points');
    return pts;
  }

  #snapshot() {
    return JSON.stringify({ room: this.room, shapes: this.shapes, starts: this.starts, passthrough: this.passthrough, uid: this.#uid });
  }

  #restore(text) {
    const s = JSON.parse(text);
    this.room = s.room;
    this.shapes = s.shapes;
    this.starts = s.starts;
    this.passthrough = s.passthrough;
    this.#uid = s.uid;
  }

  #mutate(fn) {
    if (this.#depth === 0) {
      this.#undo.push(this.#snapshot());
      this.#redo = [];
    }
    this.#depth++;
    try {
      return fn();
    } finally {
      this.#depth--;
      if (this.#depth === 0) this.#emit();
    }
  }

  #emit() {
    for (const fn of [...this.#listeners]) fn(this);
  }
}

// Turns a wand selection into shapes: each region becomes a shape of `kind`; for
// a floor, the holes inside the region become obstacles. One undo step. Returns the new shapes.
export function createShapesFromMask(model, mask, kind, { epsilon = 1.5, minArea = 16 } = {}) {
  const regions = maskToRegions(mask, { epsilon, minArea });
  const made = [];
  model.transaction(() => {
    for (const r of regions) {
      made.push(model.addShape(kind, r.outer));
      if (kind === 'walkable') for (const hole of r.holes) made.push(model.addShape('obstacle', hole));
    }
  });
  return made;
}
