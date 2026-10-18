import { parseRoom, startPosition } from './room.js';
import { Camera } from './camera.js';
import { Fade } from './transition.js';

// Loads rooms, runs enter/exit hooks and fade transitions, and keeps the
// current room id and per-room data in the state store.
//
//   loadRoom(id)  -> room JSON (async, e.g. fetch)
//   scripts       -> a Scripts registry, a Map, or a plain { roomId: { onEnter, onEntered, onExit } }
//                    onEnter runs while the screen is black; onEntered after the fade-in
//                    finishes (the place for an opening cutscene). Both may be async.
//
// Events: "room:exit" { room }, "room:enter" { room, start, firstVisit }.
export class SceneManager {
  room = null;
  #busy = false;
  #firstVisit = false;

  constructor({ state, events, loadRoom, scripts = {}, viewWidth, viewHeight, fadeMs = 300 }) {
    this.state = state;
    this.events = events;
    this.loadRoom = loadRoom;
    this.scripts = scripts;
    this.fadeMs = fadeMs;
    this.camera = new Camera(viewWidth, viewHeight);
    this.fade = new Fade();
    events.on('update', (dt) => this.fade.update(dt));
  }

  get busy() {
    return this.#busy;
  }

  // Fade out of the current room, switch, fade in. `start` names a start position.
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

  // Enter the room saved in state (after a load) without a fade. Returns false if none.
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
