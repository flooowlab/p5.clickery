// Per-object scripts, keyed by object id (hotspot, inventory item or room).
// A script is { onInteract, onLook, onUse, onEnter, onEntered, onExit }; every
// hook is optional and may be async. Hooks share the interactor's registry, so
// `scripts.add('door', {...})` and `interactor.register('door', {...})` are the same.
//
// Object hooks onEnter / onEntered run for every hotspot of a room when it is
// entered (while black / after the fade-in). Room scripts use the room id.
export class Scripts {
  constructor({ interactor }) {
    this.interactor = interactor;
  }

  add(id, handlers) {
    this.interactor.register(id, handlers);
    return this;
  }

  // { id: handlers } or { id: moduleNamespace }; a module's default export wins.
  addAll(map) {
    for (const [id, mod] of Object.entries(map)) this.add(id, mod.default ?? mod);
    return this;
  }

  get(id) {
    return this.interactor.handlers.get(id);
  }

  // Called by the scene manager with its context. Hooks run in hotspot order.
  async runEnter(sceneCtx, hook) {
    for (const def of sceneCtx.room.hotspots) {
      const handler = this.get(def.id)?.[hook];
      if (!handler) continue;
      const hotspot = this.interactor.hover?.hotspots.find((h) => h.id === def.id) ?? null;
      await handler({ ...this.interactor.context({ id: def.id, hotspot }, hook), ...sceneCtx });
    }
  }
}
