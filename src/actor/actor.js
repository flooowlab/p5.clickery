import { AnimationState, directionFromVector } from './animation.js';
import { dist } from '../nav/geometry.js';

// A character. walkTo() and say() return promises so scripts can await them:
//   await hero.walkTo(door); await hero.say("door.locked");
// Call update(dt) every frame (the demo hooks it to the "update" event).
export class Actor {
  mode = 'idle'; // idle | walk | talk
  speech = null; // { key, text, remaining }
  textSpeed = 1; // above 1 shortens lines
  skipping = false; // cutscene fast-forward: walks jump to the end, lines are not shown
  #path = [];
  #walkDone = null;
  #sayDone = null;

  // speed is px/s at scale 1; walking is slower further away, where the actor is smaller.
  constructor({ id, x = 0, y = 0, navigator = null, speed = 120, directions = 8, animations = {}, translate = (k) => k }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.navigator = navigator;
    this.speed = speed;
    this.directions = directions;
    this.translate = translate;
    this.anim = new AnimationState(animations);
  }

  get scale() {
    return this.navigator?.scaleAt(this.x, this.y) ?? 1;
  }

  get baseline() {
    return this.y;
  }

  get dir() {
    return this.anim.dir;
  }

  get walking() {
    return this.#walkDone !== null;
  }

  teleport(x, y) {
    this.#endWalk(false);
    this.x = x;
    this.y = y;
  }

  face(dir) {
    this.anim.face(dir);
  }

  // Face a point (or leave facing alone when already on it).
  faceTowards(x, y) {
    if (x === this.x && y === this.y) return;
    this.face(directionFromVector(x - this.x, y - this.y, this.directions));
  }

  // Resolves true on arrival, false when interrupted by a new command or when
  // there is no route. `target.dir` turns the actor on arrival.
  walkTo(target) {
    this.#endWalk(false);
    const path = this.navigator ? this.navigator.findPath(this, target) : [{ x: target.x, y: target.y }];
    if (!path || path.length === 0) return Promise.resolve(false);
    if (this.skipping) {
      this.#jumpTo(path.at(-1));
      if (target.dir) this.face(target.dir);
      return Promise.resolve(true);
    }
    this.#path = path;
    this.mode = this.speech ? 'talk' : 'walk';
    return new Promise((resolve) => {
      this.#walkDone = (arrived) => {
        if (arrived && target.dir) this.face(target.dir);
        resolve(arrived);
      };
    });
  }

  // Shows a line and resolves true when it ends. Speech key or text goes
  // through `translate`. A newer line ends the previous one.
  // `literal` skips translation (text that comes from a dialogue file).
  say(key, { ms, literal = false } = {}) {
    this.#endSay();
    if (this.skipping) return Promise.resolve(true);
    const text = literal ? key : this.translate(key);
    this.speech = { key, text, remaining: ms ?? Math.max(1200, text.length * 60) };
    this.mode = 'talk';
    return new Promise((resolve) => { this.#sayDone = resolve; });
  }

  skipSpeech() {
    this.#endSay();
  }

  // Cutscene fast-forward. Turning it on completes the current walk and line.
  setSkipping(on) {
    this.skipping = on;
    if (!on) return;
    if (this.#path.length) {
      this.#jumpTo(this.#path.at(-1));
      this.#endWalk(true);
    }
    this.#endSay();
  }

  // Stop whatever the actor is doing.
  stop() {
    this.#endWalk(false);
    this.#endSay();
  }

  update(dt) {
    if (this.speech && (this.speech.remaining -= dt * this.textSpeed) <= 0) this.#endSay();
    if (this.#path.length) this.#step(dt);
    this.anim.set(this.speech ? 'talk' : this.#path.length ? 'walk' : 'idle');
    this.anim.update(dt);
  }

  toJSON() {
    return { x: this.x, y: this.y, dir: this.dir };
  }

  fromJSON({ x, y, dir }) {
    this.teleport(x, y);
    if (dir) this.face(dir);
  }

  #jumpTo(point) {
    this.faceTowards(point.x, point.y);
    this.x = point.x;
    this.y = point.y;
  }

  #step(dt) {
    let budget = (this.speed * this.scale * dt) / 1000;
    while (budget > 0 && this.#path.length) {
      const next = this.#path[0];
      const d = dist(this, next);
      this.faceTowards(next.x, next.y);
      if (d <= budget) {
        this.x = next.x;
        this.y = next.y;
        budget -= d;
        this.#path.shift();
      } else {
        this.x += ((next.x - this.x) / d) * budget;
        this.y += ((next.y - this.y) / d) * budget;
        budget = 0;
      }
    }
    if (!this.#path.length) this.#endWalk(true);
  }

  #endWalk(arrived) {
    this.#path = [];
    const done = this.#walkDone;
    this.#walkDone = null;
    if (!this.speech) this.mode = 'idle';
    done?.(arrived);
  }

  #endSay() {
    const done = this.#sayDone;
    this.#sayDone = null;
    this.speech = null;
    this.mode = this.#path.length ? 'walk' : 'idle';
    done?.(true);
  }
}
