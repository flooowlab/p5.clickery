import { parseRoom, startPosition } from './room.js';
import { Camera } from './camera.js';
import { Fade } from './transition.js';

/**
 * Moves between rooms: loads them, runs the enter and exit hooks, fades, and keeps the current room
 * and per-room facts in the state store (`currentRoom`, `rooms.<id>.visited`, and anything you store
 * under `rooms.<id>`), so a room is as you left it. A game has one: `game.scene`; `game.goTo` calls it.
 *
 * `onEnter` runs while the screen is black, and `onEntered` after the fade-in (the place for an
 * opening cutscene); both may be async. Events: `room:exit` with `{ room }`, and `room:enter` and
 * `room:entered` with `{ room, start, firstVisit }`, where `firstVisit` is `true` only the first time.
 *
 * @example
 * await scene.goTo('cellar');                // fade out, switch, fade in
 * await scene.goTo('hall', 'fromCellar');    // ...and appear at a named start
 * scene.room;                                // the current room
 *
 * @param {Object} options
 * @param {StateStore} options.state
 * @param {EventBus} options.events
 * @param {function(string): Promise<Object>|Object} options.loadRoom Returns the room for an id, for example by fetching a JSON file.
 * @param {Scripts|Map|Object} [options.scripts] Where room scripts are found: a `Scripts` registry, a map, or `{ roomId: { onEnter, onEntered, onExit } }`.
 * @param {number} options.viewWidth The screen width.
 * @param {number} options.viewHeight The screen height.
 * @param {number} [options.fadeMs=300] Length of the fade between rooms.
 */
export class SceneManager {
  /** The current room, or `null` before the first `goTo`. @type {Room|null} */
  room = null;
  #busy = false;
  #firstVisit = false;

  constructor({ state, events, loadRoom, scripts = {}, viewWidth, viewHeight, fadeMs = 300 }) {
    this.state = state;
    this.events = events;
    this.loadRoom = loadRoom;
    /** The room scripts. @type {Scripts|Map|Object} */
    this.scripts = scripts;
    this.fadeMs = fadeMs;
    /** The view onto the room. @type {Camera} */
    this.camera = new Camera(viewWidth, viewHeight);
    /** The fade between rooms. @type {Fade} */
    this.fade = new Fade();
    events.on('update', (dt) => this.fade.update(dt));
  }

  /**
   * `true` while a room change is under way.
   * @type {boolean}
   */
  get busy() {
    return this.#busy;
  }

  /**
   * Fades out of the current room, switches, and fades in.
   * @param {string} roomId
   * @param {string} [start='default'] Which of the room's `starts` the hero appears at.
   * @returns {Promise<void>} Resolves after the fade-in and the `onEntered` hook.
   * @throws {Error} When a change is already running, or the room has no such start.
   */
  async goTo(roomId, start = 'default') {
    if (this.#busy) throw new Error(`already changing rooms, cannot go to "${roomId}"`);
    this.#busy = true;
    try {
      const room = await this.#load(roomId);
      startPosition(room, start);
      if (this.room) {
        await this.fade.out(this.fadeMs);
        await this.#leave();
      }
      await this.#enter(room, start);
      await this.fade.in(this.fadeMs);
      await this.#entered(room, start);
    } finally {
      this.#busy = false;
    }
  }

  /**
   * Enters the room saved in the state, without a fade. Call it after loading a game ({@link Game#load} does).
   * @param {string} [start='default']
   * @returns {Promise<boolean>} `false` when no room is saved.
   */
  async restore(start = 'default') {
    const id = this.state.get('currentRoom');
    if (!id) return false;
    if (this.#busy) throw new Error('already changing rooms');
    this.#busy = true;
    try {
      if (this.room) await this.#leave();
      await this.#enter(await this.#load(id), start);
      this.fade.alpha = 0;
      return true;
    } finally {
      this.#busy = false;
    }
  }

  async #load(id) {
    return parseRoom(await this.loadRoom(id));
  }

  async #leave() {
    const ctx = this.#context(this.room);
    this.events.emit('room:exit', ctx);
    await this.#script(this.room.id)?.onExit?.(ctx);
  }

  async #enter(room, start) {
    const firstVisit = !this.state.get(`rooms.${room.id}.visited`, false);
    this.#firstVisit = firstVisit;
    this.room = room;
    this.state.set('currentRoom', room.id);
    this.state.set(`rooms.${room.id}.visited`, true);
    this.camera.setRoom(room.width, room.height);
    const { x, y } = startPosition(room, start);
    this.camera.centerOn(x, y);
    const ctx = { ...this.#context(room), start, firstVisit };
    this.events.emit('room:enter', ctx);
    await this.#script(room.id)?.onEnter?.(ctx);
    await this.scripts.runEnter?.(ctx, 'onEnter');
  }

  async #entered(room, start) {
    const ctx = { ...this.#context(room), start, firstVisit: this.#firstVisit };
    this.events.emit('room:entered', ctx);
    await this.#script(room.id)?.onEntered?.(ctx);
    await this.scripts.runEnter?.(ctx, 'onEntered');
  }

  #script(id) {
    return typeof this.scripts.get === 'function' ? this.scripts.get(id) : this.scripts[id];
  }

  #context(room) {
    return { room, state: this.state, scene: this };
  }
}
