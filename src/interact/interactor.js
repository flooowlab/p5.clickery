/**
 * Turns a click on a hotspot or an inventory item into an action and runs the object's script for
 * it, or a default response when there is none. A game makes one: `game.interactor`; `game.on(id, handlers)`
 * registers handlers on it.
 *
 * A handler that returns `false` counts as "not handled" and gets the default response (`default.interact`,
 * `default.look`, `default.use`, or `default.combine` for two items that do not go together). Actions run
 * one at a time. A walk can be interrupted by a new click; while a handler runs, input is ignored.
 *
 * Modes: `'smart'` (default) picks the action for you: interact, or use when an item is held.
 * `'verbs'` lets your own buttons set `verb`.
 *
 * @example
 * interactor.register('door', {
 *   async onInteract(ctx) { await ctx.say('door.locked'); },
 *   async onUse(ctx) { if (ctx.item !== 'key') return false; },
 * });
 *
 * @param {Object} options
 * @param {Actor} options.hero
 * @param {StateStore} options.state
 * @param {EventBus} [options.events]
 * @param {Inventory} options.inventory
 * @param {HoverTracker} options.hover
 * @param {Cutscenes} [options.cutscenes] Clicks are ignored during a cutscene.
 * @param {DialogueSession} [options.dialogue] Clicks are ignored during a conversation.
 * @param {AudioManager} [options.audio]
 * @param {'smart'|'verbs'} [options.mode='smart']
 * @param {Object<string,string>} [options.defaults] Text keys for the default answers: `{ interact, look, use, combine }`.
 */
export class Interactor {
  /**
   * The inventory item being held (clicked in the bar), or `null`.
   * @type {string|null}
   */
  held = null;
  /**
   * In `'verbs'` mode, the verb the next click uses: `'interact'`, `'look'`, `'use'` or `'walk'`. Set it from your own buttons.
   * @type {string}
   */
  verb = 'interact';
  /**
   * What is happening: `'idle'`, `'walk'` (walking to a hotspot) or `'act'` (a handler is running).
   * @type {string}
   */
  phase = 'idle';
  /**
   * Called with the error when a handler throws. Default: `console.error`.
   * @type {function(Error): void}
   */
  onError = (err) => console.error(err);
  #token = 0;

  constructor({ hero, state, events, inventory, hover, cutscenes = null, dialogue = null, audio = null, mode = 'smart', defaults = {} }) {
    /** @type {Actor} */
    this.hero = hero;
    /** @type {StateStore} */
    this.state = state;
    /** @type {EventBus|undefined} */
    this.events = events;
    /** @type {Inventory} */
    this.inventory = inventory;
    /** @type {HoverTracker} */
    this.hover = hover;
    /** @type {Cutscenes|null} */
    this.cutscenes = cutscenes;
    /** @type {DialogueSession|null} */
    this.dialogue = dialogue;
    /** @type {AudioManager|null} */
    this.audio = audio;
    /**
     * `'smart'` or `'verbs'`.
     * @type {string}
     */
    this.mode = mode;
    this.defaults = {
      interact: 'default.interact', look: 'default.look', use: 'default.use', combine: 'default.combine', ...defaults,
    };
    this.handlers = new Map();
  }

  /**
   * Sets the handlers of a hotspot or item. Registering the same id again merges into what is there.
   * @param {string} id
   * @param {Object} handlers `onInteract`, `onLook` and `onUse`, each `(ctx: ScriptContext) => ...`; return `false` for "not handled".
   */
  register(id, handlers) {
    this.handlers.set(id, { ...this.handlers.get(id), ...handlers });
  }

  /**
   * `true` while input is ignored: a handler is running, a cutscene is on or a conversation is playing.
   * @type {boolean}
   */
  get busy() {
    return this.phase === 'act' || this.locked;
  }

  /**
   * `true` during a cutscene or a conversation.
   * @type {boolean}
   */
  get locked() {
    return Boolean(this.cutscenes?.active || this.dialogue?.active);
  }

  /**
   * Holds an item, or puts it away. Clicking an item in the bar does this.
   * @param {string|null} item A carried item, or `null` to put it away.
   * @throws {Error} For an item that is not carried.
   */
  select(item) {
    if (item !== null) {
      this.inventory.define(item);
      if (!this.inventory.has(item)) throw new Error(`not carrying "${item}"`);
    }
    this.held = item;
    this.events?.emit('inventory:select', { id: item });
  }

  // ---- entry points used by the pointer controller (all return promises) ----

  /**
   * A click on a hotspot: walks to its `walkTo`, then runs `onInteract` (or `onUse` when an item is held).
   * @param {Hotspot} hotspot
   * @returns {Promise<boolean>} `false` when input is being ignored.
   */
  clickHotspot(hotspot) {
    if (this.busy) return Promise.resolve(false);
    if (this.mode === 'verbs') {
      if (this.verb === 'walk' && hotspot.walkTo) return this.clickGround(hotspot.walkTo);
      if (this.verb === 'look') return this.lookHotspot(hotspot);
      if (this.verb === 'use' && !this.held) return this.#say('use');
    }
    return this.#onHotspot(hotspot, this.held ? 'use' : 'interact', this.held);
  }

  /**
   * A right-click or long press on a hotspot: walks to it and runs `onLook`.
   * @param {Hotspot} hotspot
   * @returns {Promise<boolean>}
   */
  lookHotspot(hotspot) {
    return this.#onHotspot(hotspot, 'look', null);
  }

  /**
   * A click on an item in the bar: holds it; or, while another item is held, tries to combine the two.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  clickItem(id) {
    if (this.busy) return Promise.resolve(false);
    if (this.mode === 'verbs' && this.verb === 'look') return this.lookItem(id);
    if (this.held === null) { this.select(id); return Promise.resolve(true); }
    if (this.held === id) { this.select(null); return Promise.resolve(true); }
    return this.#combine(this.held, id);
  }

  /**
   * A right-click or long press on an item in the bar: runs its `onLook`.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  lookItem(id) {
    if (this.busy) return Promise.resolve(false);
    return this.#perform(null, 'look', { id, hotspot: null, itemUsed: null }, 'item');
  }

  /**
   * A click on the floor: the hero walks there.
   * @param {{x: number, y: number}} point
   * @returns {Promise<boolean>} `true` on arrival.
   */
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

  /**
   * What a handler receives: the context of the action. Also given to room and object enter hooks.
   *
   * @typedef {Object} ScriptContext
   * @property {string} verb What the player did: `'interact'`, `'look'` or `'use'`.
   * @property {string} id The id of the hotspot or item it was done to.
   * @property {Hotspot|null} hotspot The hotspot, or `null` when the target is an item.
   * @property {string|null} item The item being used on it (in `onUse`), otherwise `null`.
   * @property {Actor} hero The hero.
   * @property {StateStore} state The game's memory.
   * @property {Inventory} inventory What the player carries.
   * @property {Interactor} interactor The part that runs handlers.
   * @property {Cutscenes|null} cutscenes Runs cutscenes.
   * @property {DialogueSession|null} dialogue Plays conversations.
   * @property {AudioManager|null} audio Plays sounds, if the game has any.
   * @property {function(string, Object=): Promise<boolean>} say The hero says a line (a text key).
   * @property {function(string, boolean): void} setEnabled Switches a hotspot of the current room on or off. Saved with the game.
   */
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
      audio: this.audio,
      say: (key, options) => this.hero.say(key, options),
      setEnabled: (hotspotId, enabled) => this.setHotspotEnabled(hotspotId, enabled),
    };
  }

  /**
   * Switches a hotspot on or off. A hotspot that is off cannot be clicked and is not drawn. The
   * choice is saved with the game (`ctx.setEnabled` calls this).
   * @param {string} hotspotId
   * @param {boolean} enabled
   * @param {string} [roomId] Default: the current room.
   */
  setHotspotEnabled(hotspotId, enabled, roomId = this.state.get('currentRoom')) {
    this.state.set(`rooms.${roomId}.hotspots.${hotspotId}.enabled`, enabled);
    const live = this.hover?.hotspots.find((h) => h.id === hotspotId);
    if (live) live.enabled = enabled;
  }
}

/**
 * Re-applies the saved on/off state to a room's hotspots after they are created, so a hotspot switched
 * off with `ctx.setEnabled` stays off when you come back. A game does this on every room change.
 * @param {StateStore} state
 * @param {string} roomId
 * @param {Hotspot[]} hotspots
 */
export function applyHotspotState(state, roomId, hotspots) {
  for (const h of hotspots) {
    h.enabled = state.get(`rooms.${roomId}.hotspots.${h.id}.enabled`, true);
  }
}
