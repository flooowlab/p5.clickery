/**
 * The registry of per-object scripts, keyed by the id of a hotspot, an inventory item or a room. A
 * script is `{ onInteract, onLook, onUse, onEnter, onEntered, onExit }`; every hook is optional and
 * may be async. `scripts.add('door', {...})` and `interactor.register('door', {...})` are the same
 * thing, and {@link Game#on} is a short way to write either. A game has one: `game.scripts`.
 *
 * `onEnter` and `onEntered` run for every hotspot of a room when it is entered (while the screen
 * is black, and after the fade-in). Room scripts use the room id and can also have `onExit`.
 * Putting each object's script in its own file keeps a bigger game tidy.
 *
 * @example
 * import * as door from './scripts/door.js';  // exports onInteract, onLook...
 * scripts.addAll({ door, lamp, guard });
 *
 * @param {Object} options
 * @param {Interactor} options.interactor Where the handlers are kept.
 */
export class Scripts {
  constructor({ interactor }) {
    this.interactor = interactor;
  }

  /**
   * Sets the script of an object.
   * @param {string} id A hotspot, item or room id.
   * @param {Object} handlers `onInteract`, `onLook`, `onUse`, `onEnter`, `onEntered`, `onExit`.
   * @returns {Scripts} Itself, so calls can be chained.
   */
  add(id, handlers) {
    this.interactor.register(id, handlers);
    return this;
  }

  /**
   * Sets many scripts at once.
   * @param {Object<string, Object>} map `{ id: handlers }`, where each value can also be an imported module (a module's default export wins).
   * @returns {Scripts} Itself.
   */
  addAll(map) {
    for (const [id, mod] of Object.entries(map)) this.add(id, mod.default ?? mod);
    return this;
  }

  /**
   * Looks up the script of an object.
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return this.interactor.handlers.get(id);
  }

  /**
   * Runs a hook (`'onEnter'` or `'onEntered'`) for every hotspot of a room that has one. The scene manager calls this.
   * @param {Object} sceneCtx The scene manager's context: `{ room, state, scene, ... }`.
   * @param {string} hook
   * @returns {Promise<void>}
   */
  async runEnter(sceneCtx, hook) {
    for (const def of sceneCtx.room.hotspots) {
      const handler = this.get(def.id)?.[hook];
      if (!handler) continue;
      const hotspot = this.interactor.hover?.hotspots.find((h) => h.id === def.id) ?? null;
      await handler({ ...this.interactor.context({ id: def.id, hotspot }, hook), ...sceneCtx });
    }
  }
}
