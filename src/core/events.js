// Minimal event bus. Handlers run in registration order; a throwing handler
// does not stop the others, its error is rethrown after all have run.
export class EventBus {
  #handlers = new Map();

  // Returns an unsubscribe function.
  on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, (...args) => {
      off();
      return handler(...args);
    });
    return off;
  }

  off(type, handler) {
    const set = this.#handlers.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.#handlers.delete(type);
  }

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
