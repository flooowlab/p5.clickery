/**
 * A game loop: turns timestamps into delta time, honours a pause flag and drives the scheduler.
 * A game made with {@link createGame} does not need one, because it moves forward with p5's own
 * frames. Use it when you build a game from the parts without p5 driving it. It uses its own
 * clock (not p5's `draw`) and limits each step, so a hidden browser tab does not make the game jump.
 *
 * Frame scheduling is injectable (`request`, `cancel`), so tests can step it by hand with `tick`.
 *
 * @example
 * core.loop.start();   // begins running; updates the scheduler and sends `update`
 * core.loop.pause();   // timers and `update` stop
 * core.loop.resume();
 *
 * @param {Object} [options]
 * @param {Scheduler} [options.scheduler] Updated each frame.
 * @param {EventBus} [options.events] Gets an `update` event each frame, with the delta time.
 * @param {number} [options.maxDt=100] The longest single step, in milliseconds.
 * @param {function(Function): *} [options.request] Asks for the next frame. Default: `requestAnimationFrame`.
 * @param {function(*): void} [options.cancel] Cancels a request. Default: `cancelAnimationFrame`.
 */
export class GameLoop {
  /** While `true`, time does not advance. @type {boolean} */
  paused = false;
  #last = null;
  #handle = null;

  constructor({ scheduler, events, maxDt = 100, request, cancel } = {}) {
    this.scheduler = scheduler;
    this.events = events;
    this.maxDt = maxDt;
    this.request = request ?? ((fn) => globalThis.requestAnimationFrame(fn));
    this.cancel = cancel ?? ((id) => globalThis.cancelAnimationFrame(id));
  }

  /**
   * `true` between `start()` and `stop()`.
   * @type {boolean}
   */
  get running() {
    return this.#handle !== null;
  }

  /**
   * Stops time from advancing, without stopping the loop.
   */
  pause() {
    this.paused = true;
  }

  /**
   * Lets time advance again.
   */
  resume() {
    this.paused = false;
  }

  /**
   * Advances one frame to a time.
   * @param {number} now Milliseconds, as `requestAnimationFrame` gives them.
   * @returns {number} The delta time that was applied (0 while paused).
   */
  tick(now) {
    const dt = this.#last === null ? 0 : Math.min(Math.max(now - this.#last, 0), this.maxDt);
    this.#last = now;
    if (this.paused) return 0;
    this.scheduler?.update(dt);
    this.events?.emit('update', dt);
    return dt;
  }

  /**
   * Starts running, one frame after another. Does nothing if already running.
   */
  start() {
    if (this.running) return;
    this.#last = null;
    const frame = (now) => {
      this.#handle = this.request(frame);
      this.tick(now);
    };
    this.#handle = this.request(frame);
  }

  /**
   * Stops running.
   */
  stop() {
    if (!this.running) return;
    this.cancel(this.#handle);
    this.#handle = null;
  }
}
