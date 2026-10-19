// Turns a click on a hotspot or an inventory item into an action and runs the
// object's script for it, or a default response when there is none.
//
// Handlers are registered per object id (hotspot or item):
//   interactor.register('door', {
//     async onInteract(ctx) { await ctx.say('door.locked'); },
//     async onLook(ctx) { ... },
//     async onUse(ctx) { if (ctx.item !== 'key') return false; ... },   // ctx.item = item used on it
//   });
// A handler that returns false counts as "not handled" and gets the default
// response. Actions run one at a time. A walk can be interrupted by a new
// click; once a handler is running, input is ignored until it finishes.
//
// Modes: 'smart' (default) picks the action for you: interact, or use when an
// item is held. 'verbs' lets the UI set `verb` ('interact' | 'look' | 'use' | 'walk').
export class Interactor {
  held = null; // selected inventory item id
  verb = 'interact';
  phase = 'idle'; // idle | walk | act
  onError = (err) => console.error(err);
  #token = 0;

  constructor({ hero, state, events, inventory, hover, cutscenes = null, dialogue = null, mode = 'smart', defaults = {} }) {
    this.hero = hero;
    this.state = state;
    this.events = events;
    this.inventory = inventory;
    this.hover = hover;
    this.cutscenes = cutscenes;
    this.dialogue = dialogue;
    this.mode = mode;
    this.defaults = {
      interact: 'default.interact', look: 'default.look', use: 'default.use', combine: 'default.combine', ...defaults,
    };
    this.handlers = new Map();
  }

  register(id, handlers) {
    this.handlers.set(id, { ...this.handlers.get(id), ...handlers });
  }

  // Input is ignored during a handler, a cutscene and a conversation.
  get busy() {
    return this.phase === 'act' || this.locked;
  }

  get locked() {
    return Boolean(this.cutscenes?.active || this.dialogue?.active);
  }

  select(item) {
    if (item !== null) this.inventory.define(item);
    this.held = item;
    this.events?.emit('inventory:select', { id: item });
  }

  // ---- entry points used by the pointer controller (all return promises) ----

  clickHotspot(hotspot) {
    if (this.busy) return Promise.resolve(false);
    if (this.mode === 'verbs') {
      if (this.verb === 'walk' && hotspot.walkTo) return this.clickGround(hotspot.walkTo);
      if (this.verb === 'look') return this.lookHotspot(hotspot);
      if (this.verb === 'use' && !this.held) return this.#say('use');
    }
    return this.#onHotspot(hotspot, this.held ? 'use' : 'interact', this.held);
  }

  lookHotspot(hotspot) {
    return this.#onHotspot(hotspot, 'look', null);
  }

  clickItem(id) {
    if (this.busy) return Promise.resolve(false);
    if (this.mode === 'verbs' && this.verb === 'look') return this.lookItem(id);
    if (this.held === null) { this.select(id); return Promise.resolve(true); }
    if (this.held === id) { this.select(null); return Promise.resolve(true); }
    return this.#combine(this.held, id);
  }

  lookItem(id) {
    if (this.busy) return Promise.resolve(false);
    return this.#perform(null, 'look', { id, hotspot: null, itemUsed: null }, 'item');
  }

  async clickGround(point) {
    if (this.busy) return false;
    const token = ++this.#token;
    this.phase = 'walk';
    try {
      return await this.hero.walkTo(point);
    } finally {
      if (token === this.#token) this.phase = 'idle';
    }
  }

  // ---- internals ----

  #onHotspot(hotspot, verb, item) {
    if (this.busy) return Promise.resolve(false);
    return this.#perform(hotspot.walkTo ?? null, verb, { id: hotspot.id, hotspot, item: null, itemUsed: item }, 'hotspot');
  }

  async #perform(walkTo, verb, target, kind) {
    const token = ++this.#token;
    try {
      if (walkTo) {
        this.phase = 'walk';
        const arrived = await this.hero.walkTo(walkTo);
        if (!arrived || token !== this.#token) return false;
      }
      this.phase = 'act';
      const ctx = this.context(target, verb);
      const handler = this.handlers.get(target.id)?.[{ interact: 'onInteract', look: 'onLook', use: 'onUse' }[verb]];
      const handled = handler ? (await handler(ctx)) !== false : false;
      if (!handled) await this.#say(verb);
      this.events?.emit('action', { verb, id: target.id, kind, item: target.itemUsed, handled });
      if (this.held && !this.inventory.has(this.held)) this.select(null);
      return handled;
    } catch (err) {
      this.onError(err);
      return false;
    } finally {
      if (token === this.#token) this.phase = 'idle';
    }
  }

  async #combine(a, b) {
    const token = ++this.#token;
    this.phase = 'act';
    try {
      const recipe = this.inventory.combine(a, b);
      this.select(null);
      await this.#say(recipe ? recipe.say : 'combine', Boolean(recipe));
      this.events?.emit('action', { verb: 'combine', id: b, kind: 'item', item: a, handled: Boolean(recipe) });
      return Boolean(recipe);
    } catch (err) {
      this.onError(err);
      return false;
    } finally {
      if (token === this.#token) this.phase = 'idle';
    }
  }

  // Says a localisation key, or the default response for a verb.
  #say(keyOrVerb, isKey = false) {
    const key = isKey ? keyOrVerb : this.defaults[keyOrVerb];
    return key ? this.hero.say(key) : Promise.resolve();
  }

  // What handlers receive. Also used for room and object enter hooks.
  context(target, verb) {
    return {
      verb,
      id: target.id,
      hotspot: target.hotspot ?? null,
      item: target.itemUsed ?? null,
      hero: this.hero,
      state: this.state,
      inventory: this.inventory,
      interactor: this,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      say: (key, options) => this.hero.say(key, options),
      setEnabled: (hotspotId, enabled) => this.setHotspotEnabled(hotspotId, enabled),
    };
  }

  // Enable or disable a hotspot in the current room; saved with the game.
  setHotspotEnabled(hotspotId, enabled, roomId = this.state.get('currentRoom')) {
    this.state.set(`rooms.${roomId}.hotspots.${hotspotId}.enabled`, enabled);
    const live = this.hover?.hotspots.find((h) => h.id === hotspotId);
    if (live) live.enabled = enabled;
  }
}

// Re-applies saved enabled/disabled flags after a room's hotspots are created.
export function applyHotspotState(state, roomId, hotspots) {
  for (const h of hotspots) {
    h.enabled = state.get(`rooms.${roomId}.hotspots.${h.id}.enabled`, true);
  }
}
