import { AnimationState, directionFromVector } from './animation.js';
import { dist } from '../nav/geometry.js';

/**
 * A place to go: a point, and optionally the direction to face once there.
 *
 * @typedef {Object} WalkTarget
 * @property {number} x Where to stand, from the left of the room.
 * @property {number} y Where to stand (the feet), from the top of the room.
 * @property {string} [dir] Turn this way on arrival: `'up'`, `'right'`, `'down'` or `'left'`.
 */

/**
 * A character that walks and talks. `walkTo()` and `say()` return promises, so a script reads like
 * a story. The hero of a game is one: `game.hero`. Games call `update(dt)` for you.
 *
 * @example
 * await hero.walkTo({ x: 400, y: 300, dir: 'up' });
 * await hero.say('door.locked');
 *
 * @param {Object} options
 * @param {string} options.id A name for the actor.
 * @param {number} [options.x=0] Where its feet start.
 * @param {number} [options.y=0]
 * @param {Navigator} [options.navigator] The floor it walks on. Without one it walks in straight lines.
 * @param {number} [options.speed=120] Pixels per second at full size. Further away it is smaller, and slower.
 * @param {number} [options.directions=8] `4` or `8` facing directions.
 * @param {Object} [options.animations] Named animations: `{ idle, walk_right, walk_down, talk, ... }`.
 * @param {function(string): string} [options.translate] Turns a text key into text. A game sets it for you.
 */
export class Actor {
  /**
   * What the actor is doing: `'idle'`, `'walk'` or `'talk'`.
   * @type {string}
   */
  mode = 'idle';
  /**
   * The line being said, or `null`: `{ key, text, remaining }`.
   * @type {{key: string, text: string, remaining: number}|null}
   */
  speech = null;
  /**
   * How fast lines are read. Above `1` shortens them. The player's text speed setting changes it.
   * @type {number}
   */
  textSpeed = 1;
  /**
   * `true` during a skipped cutscene: walks jump to their end and lines are not shown.
   * @type {boolean}
   */
  skipping = false;
  #path = [];
  #walkDone = null;
  #sayDone = null;

  constructor({ id, x = 0, y = 0, navigator = null, speed = 120, directions = 8, animations = {}, translate = (k) => k }) {
    /** The actor's name. @type {string} */
    this.id = id;
    /** Where its feet are, from the left of the room. @type {number} */
    this.x = x;
    /** Where its feet are, from the top of the room. @type {number} */
    this.y = y;
    /** The floor it walks on. A game sets it on every room change. @type {Navigator|null} */
    this.navigator = navigator;
    /** Pixels per second at full size. @type {number} */
    this.speed = speed;
    /** `4` or `8` facing directions. @type {number} */
    this.directions = directions;
    this.translate = translate;
    /** The current animation, drawn with `drawAnimation`. @type {AnimationState} */
    this.anim = new AnimationState(animations);
  }

  /**
   * How big the actor is where it stands: `1` is full size, smaller further away (set by the walkable area's `scale` stops).
   * @type {number}
   */
  get scale() {
    return this.navigator?.scaleAt(this.x, this.y) ?? 1;
  }

  /**
   * The y position of its feet, which decides who stands in front of whom.
   * @type {number}
   */
  get baseline() {
    return this.y;
  }

  /**
   * The direction it faces: `'up'`, `'right'`, `'down'`, `'left'` (and `'up_right'` and so on with 8 directions).
   * @type {string}
   */
  get dir() {
    return this.anim.dir;
  }

  /**
   * `true` while a `walkTo` is under way.
   * @type {boolean}
   */
  get walking() {
    return this.#walkDone !== null;
  }

  /**
   * Jumps to a place and cancels any walk.
   * @param {number} x
   * @param {number} y
   * @example
   * hero.teleport(50, 300);
   */
  teleport(x, y) {
    this.#endWalk(false);
    this.x = x;
    this.y = y;
  }

  /**
   * Turns to face a direction.
   * @param {string} dir `'up'`, `'right'`, `'down'`, `'left'` (and `'up_right'` and so on with 8 directions).
   * @example
   * hero.face('left');
   */
  face(dir) {
    this.anim.face(dir);
  }

  /**
   * Turns to face a point. Does nothing when already standing on it.
   * @param {number} x
   * @param {number} y
   */
  faceTowards(x, y) {
    if (x === this.x && y === this.y) return;
    this.face(directionFromVector(x - this.x, y - this.y, this.directions));
  }

  /**
   * Walks to a point, around obstacles. A new `walkTo` (or `stop`) interrupts the one before.
   * @param {WalkTarget} target Where to go. `dir` turns the actor that way on arrival.
   * @returns {Promise<boolean>} `true` on arrival, `false` when interrupted or when there is no route.
   * @example
   * const arrived = await hero.walkTo({ x: 400, y: 300, dir: 'up' });
   */
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

  /**
   * Shows a line above the actor. A newer line ends the previous one. The default time is
   * about 60 ms per character, at least 1.2 seconds.
   * @param {string} key A text key, translated with the actor's `translate`.
   * @param {Object} [options]
   * @param {number} [options.ms] How long to show it, in milliseconds.
   * @param {boolean} [options.literal=false] `true` shows `key` as it is, with no translation (for text from a dialogue file).
   * @returns {Promise<boolean>} Resolves when the line ends or is skipped.
   * @example
   * await hero.say('door.locked');
   */
  say(key, { ms, literal = false } = {}) {
    this.#endSay();
    if (this.skipping) return Promise.resolve(true);
    const text = literal ? key : this.translate(key);
    this.speech = { key, text, remaining: ms ?? Math.max(1200, text.length * 60) };
    this.mode = 'talk';
    return new Promise((resolve) => { this.#sayDone = resolve; });
  }

  /**
   * Ends the line being said, as if its time had run out.
   */
  skipSpeech() {
    this.#endSay();
  }

  /**
   * Cutscene fast-forward. Turning it on completes the current walk and line; while it is on, walks
   * jump to their end and lines are not shown. {@link Game#cutscene} uses it for Skip.
   * @param {boolean} on
   */
  setSkipping(on) {
    this.skipping = on;
    if (!on) return;
    if (this.#path.length) {
      this.#jumpTo(this.#path.at(-1));
      this.#endWalk(true);
    }
    this.#endSay();
  }

  /**
   * Stops walking and talking. A pending `walkTo` resolves `false`.
   */
  stop() {
    this.#endWalk(false);
    this.#endSay();
  }

  /**
   * Moves the actor along its path and advances its line and animation. A game calls it every frame.
   * @param {number} dt Milliseconds since the last step.
   */
  update(dt) {
    if (this.speech && (this.speech.remaining -= dt * this.textSpeed) <= 0) this.#endSay();
    if (this.#path.length) this.#step(dt);
    this.anim.set(this.speech ? 'talk' : this.#path.length ? 'walk' : 'idle');
    this.anim.update(dt);
  }

  /**
   * What a save keeps: where the actor stands and which way it faces.
   * @returns {{x: number, y: number, dir: string}}
   */
  toJSON() {
    return { x: this.x, y: this.y, dir: this.dir };
  }

  /**
   * Puts the actor back where {@link Actor#toJSON} said.
   * @param {WalkTarget} saved
   */
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
