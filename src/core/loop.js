// Game loop: turns timestamps into delta time, honours a pause flag and drives
// the scheduler. Frame scheduling is injectable so tests can step it by hand.
export class GameLoop {
  paused = false;
  #last = null;
  #handle = null;

  // maxDt caps a single step, so a background tab does not cause a huge jump.
  constructor({ scheduler, events, maxDt = 100, request, cancel } = {}) {
    this.scheduler = scheduler;
    this.events = events;
    this.maxDt = maxDt;
    this.request = request ?? ((fn) => globalThis.requestAnimationFrame(fn));
    this.cancel = cancel ?? ((id) => globalThis.cancelAnimationFrame(id));
  }

  get running() {
    return this.#handle !== null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  // Advance one frame to time `now` (ms). Returns the dt that was applied.
  tick(now) {
    const dt = this.#last === null ? 0 : Math.min(Math.max(now - this.#last, 0), this.maxDt);
    this.#last = now;
    if (this.paused) return 0;
    this.scheduler?.update(dt);
    this.events?.emit('update', dt);
    return dt;
  }

  start() {
    if (this.running) return;
    this.#last = null;
    const frame = (now) => {
      this.#handle = this.request(frame);
      this.tick(now);
    };
    this.#handle = this.request(frame);
  }

  stop() {
    if (!this.running) return;
    this.cancel(this.#handle);
    this.#handle = null;
  }
}
