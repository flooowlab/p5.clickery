/**
 * A minimal event bus: one part of the game announces something, others listen. A game has one,
 * `game.events`, and the library sends events such as `room:enter`, `inventory:add`,
 * `dialogue:line` and `update`. Your own events are fine too.
 *
 * Handlers run in the order they were added. A handler that throws does not stop the others;
 * its error is thrown after all have run.
 *
 * @example
 * const off = game.events.on('inventory:add', ({ id }) => console.log('picked up', id));
 * game.events.emit('my-event', 1, 2);
 * off(); // stop listening
 */
export class EventBus {
  #handlers = new Map();

  /**
   * Listens for an event.
   * @param {string} type The event name, such as `'room:enter'`.
   * @param {Function} handler Called with whatever the event sends.
   * @returns {function(): void} A function that stops listening.
   */
  on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  /**
   * Listens for the next time an event happens, and then stops.
   * @param {string} type
   * @param {Function} handler
   * @returns {function(): void} A function that stops listening before it happens.
   */
  once(type, handler) {
    const off = this.on(type, (...args) => {
      off();
      return handler(...args);
    });
    return off;
  }

  /**
   * Stops listening.
   * @param {string} type
   * @param {Function} handler The same function that was given to `on`.
   */
  off(type, handler) {
    const set = this.#handlers.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.#handlers.delete(type);
  }

  /**
   * Announces an event to everything listening for it.
   * @param {string} type
   * @param {...*} args Passed to each handler.
   */
  emit(type, ...args) {
    const set = this.#handlers.get(type);
    if (!set) return;
    const errors = [];
    for (const handler of [...set]) {
      try {
        handler(...args);
      } catch (err) {
        errors.push(err);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `${errors.length} handlers for "${type}" threw`);
  }
}
