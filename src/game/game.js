import { createCore } from '../core/index.js';
import { Settings, bindTextSettings } from '../core/settings.js';
import { saveToSlot, loadFromSlot } from '../core/save.js';
import { SceneManager } from '../scene/scene-manager.js';
import { HoverTracker } from '../hit/hover.js';
import { createHotspots } from '../hit/hotspot.js';
import { Navigator } from '../nav/navigator.js';
import { Actor } from '../actor/actor.js';
import { Inventory } from '../interact/inventory.js';
import { Interactor, applyHotspotState } from '../interact/interactor.js';
import { PointerController } from '../interact/pointer-controller.js';
import { defaultStrings } from '../interact/strings.js';
import { Cutscenes } from '../script/cutscene.js';
import { Scripts } from '../script/scripts.js';
import { SubtitleBar } from '../ui/subtitles.js';
import { ChoiceMenu } from '../ui/choice-menu.js';
import { InventoryBar } from '../ui/inventory-bar.js';
import { DialogueSession } from '../dialogue/session.js';
import { AudioManager } from '../audio/audio.js';
import { toRunner } from './conversation.js';
import { GAME_DEFAULTS } from './options.js';

export { GAME_DEFAULTS };

/**
 * Everything a point-and-click game needs, wired together with sensible defaults:
 * rooms, a hero, hotspots, an inventory, scripts, cutscenes, dialogue, saving and sound.
 *
 * In a sketch you get one from {@link createGame}. `new Game(options)` makes the same
 * object without p5, for tests or for a game's logic in its own module.
 *
 * @example
 * const game = createGame({
 *   rooms: [{
 *     id: 'yard', width: 640, height: 360, color: '#2d3a55',
 *     starts: { default: { x: 80, y: 300 } },
 *     walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
 *   }],
 * });
 * await game.start();
 *
 * @param {GameOptions} [options] See {@link GameOptions}.
 */
export class Game {
  /**
   * Shows the outlines of hotspots and floors while `true`. The `debugKey` (default `d`) toggles it.
   * @type {boolean}
   */
  debug = false;
  /**
   * `true` once p5 has started calling `draw()`, which is when p5 takes over moving the game forward.
   * @type {boolean}
   */
  drawnByP5 = false;
  /**
   * The state inspector, once it has been opened with the `inspectorKey` option (or made by hand).
   * @type {StateInspector|null}
   */
  inspector = null;
  /**
   * Extra things drawn in depth order with the hero: objects with a `baseline` (the y of their feet) and a `draw(p)` function.
   * @type {Array<{baseline: number, draw: function(Object): void}>}
   */
  actors = [];
  /**
   * Fits the canvas to the window with letterbox bars. Set when the game is attached to p5.
   * @type {LetterboxScaler|undefined}
   */
  scaler;
  /**
   * The room pictures that are loaded, by room id: `{ 'hall.png': image }`, under the names the room uses
   * for its `background` and `layers`. The game loads them in `start()`. A picture already in here is not
   * loaded again, so you can put your own (for example one made with `createGraphics`) before starting.
   * @type {Map<string, Object<string, Object>>}
   */
  images = new Map();
  /**
   * The inventory pictures that are loaded, by item id (the `image` of an item).
   * @type {Object<string, Object>}
   */
  itemImages = {};
  roomURLs = new Map(); // room id -> URL of its file, so its pictures load relative to it
  /**
   * The files that hotspots need, loaded in `start()`: for a `colorMask` hotspot its mask picture's pixels,
   * for an `svg` hotspot with a file its text. Keys are `'<room id>:<name as the room writes it>'`, values
   * `{ pixels: { data, width, height } }` or `{ text }`. A game made with {@link createGame} fills it by
   * itself; fill it by hand when you use `new Game` with these hotspots.
   * @type {Map<string, Object>}
   */
  hotspotFiles = new Map();
  #roomSources = [];
  #ready = null;

  constructor(options = {}) {
    const o = { ...GAME_DEFAULTS, ...options, hero: { ...GAME_DEFAULTS.hero, ...options.hero } };
    /**
     * The options the game was made with, defaults filled in.
     * @type {GameOptions}
     */
    this.options = o;
    const core = createCore();
    /**
     * The pieces `createCore()` makes (events, state, scheduler, text, game loop), kept together.
     * @type {Object}
     */
    this.core = core;
    /**
     * The event bus: `game.events.on('room:enter', fn)`.
     * @type {EventBus}
     */
    this.events = core.events;
    /**
     * The game's memory: flags, variables, inventory, the current room. Saved by `save()`.
     * @type {StateStore}
     */
    this.state = core.state;
    /**
     * Game-time timers: `await game.scheduler.wait(1000)`. They stop while the game is paused.
     * @type {Scheduler}
     */
    this.scheduler = core.scheduler;
    /**
     * Text keys and translations: `game.i18n.t('sign.look')`.
     * @type {I18n}
     */
    this.i18n = core.i18n;
    this.i18n.language = o.language;
    this.i18n.add('en', defaultStrings);
    this.i18n.add(o.language, o.strings);

    /**
     * The rooms by id.
     * @type {Map<string, Object>}
     */
    this.rooms = new Map();
    for (const source of Array.isArray(o.rooms) ? o.rooms : Object.values(o.rooms)) this.addRoom(source);

    /**
     * Moves between rooms; also holds the camera (`game.scene.camera`).
     * @type {SceneManager}
     */
    this.scene = new SceneManager({
      ...core, viewWidth: o.width, viewHeight: o.height, fadeMs: o.fadeMs, loadRoom: async (id) => this.#room(id),
    });
    /**
     * The player's character: `await game.hero.walkTo({ x: 300, y: 300 })`.
     * @type {Actor}
     */
    this.hero = new Actor({ id: 'hero', speed: 150, directions: 4, ...o.hero, translate: (key) => this.i18n.t(key) });
    /**
     * Finds the hotspot under the pointer.
     * @type {HoverTracker}
     */
    this.hover = new HoverTracker(this.events);
    /**
     * What the player carries.
     * @type {Inventory}
     */
    this.inventory = new Inventory({ state: this.state, events: this.events, ...this.#items(o.items), recipes: o.recipes });
    /**
     * The player's settings: text speed, subtitles, volumes. Saved separately from the game.
     * @type {Settings}
     */
    this.settings = new Settings({ storage: o.storage });
    this.settings.load();
    /**
     * The bar that shows the lines being said.
     * @type {SubtitleBar}
     */
    this.subtitles = new SubtitleBar();
    bindTextSettings(this.settings, { subtitles: this.subtitles, actors: [this.hero] });
    /**
     * The menu of dialogue choices.
     * @type {ChoiceMenu}
     */
    this.menu = new ChoiceMenu({ viewWidth: o.width, viewHeight: o.height });
    /**
     * Plays conversations (see {@link Game#talk}).
     * @type {DialogueSession}
     */
    this.dialogue = new DialogueSession({ events: this.events, subtitles: this.subtitles, menu: this.menu });
    /**
     * Runs cutscenes (see {@link Game#cutscene}).
     * @type {Cutscenes}
     */
    this.cutscenes = new Cutscenes({ events: this.events, scheduler: this.scheduler, targets: [this.hero, this.scene.fade] });
    /**
     * Music and sound effects; `null` when the game has no `sounds`.
     * @type {AudioManager|null}
     */
    this.audio = Object.keys(o.sounds).length && globalThis.AudioContext ? new AudioManager({ settings: this.settings }) : null;
    this.audio?.register(o.sounds);
    this.audio?.attach(this.events, { sfx: o.sfx });
    /**
     * Turns clicks into actions and runs the scripts.
     * @type {Interactor}
     */
    this.interactor = new Interactor({
      hero: this.hero, state: this.state, events: this.events, inventory: this.inventory, hover: this.hover,
      cutscenes: this.cutscenes, dialogue: this.dialogue, audio: this.audio, mode: o.mode,
    });
    this.interactor.onError = (err) => console.error(err);
    /**
     * The registry of scripts (see {@link Game#on}).
     * @type {Scripts}
     */
    this.scripts = new Scripts({ interactor: this.interactor });
    this.scene.scripts = this.scripts;
    /**
     * The inventory bar at the bottom of the screen.
     * @type {InventoryBar}
     */
    this.bar = new InventoryBar({ viewWidth: o.width, viewHeight: o.height });
    /**
     * Mouse and touch behaviour (click, long press, tap to highlight).
     * @type {PointerController}
     */
    this.pointer = new PointerController({
      interactor: this.interactor, hover: this.hover, camera: this.scene.camera, bar: this.bar, scheduler: this.scheduler,
    });

    // Entering a room: its hotspots, its floor, and the hero at the start position.
    this.events.on('room:enter', ({ room, start }) => {
      const hotspots = createHotspots(room, this.#hotspotAssets(room));
      applyHotspotState(this.state, room.id, hotspots);
      this.hover.setHotspots(hotspots);
      this.hero.navigator = Navigator.fromRoom(room);
      const at = room.starts[start];
      this.hero.teleport(at.x, at.y);
      if (at.dir) this.hero.face(at.dir);
    });
    this.events.on('update', (dt) => {
      this.hero.update(dt);
      this.subtitles.update(dt);
      if (this.options.followHero) this.scene.camera.follow(this.hero.x, this.hero.y, dt);
    });
  }

  // ---- building the game ----

  /**
   * Adds a room after the game was made. A URL is fetched by {@link Game#start}.
   * @param {Object|string} source A room object, or the URL of a room JSON file.
   * @returns {Game} The game, so calls can be chained.
   * @example
   * game.addRoom({ id: 'cellar', width: 640, height: 360, color: '#222', starts: { default: { x: 100, y: 300 } }, walkable: [] });
   */
  addRoom(source) {
    if (typeof source === 'string') this.#roomSources.push({ url: source });
    else this.rooms.set(source.id, source);
    this.#ready = null;
    return this;
  }

  /**
   * Sets what happens when the player acts on a hotspot, an item or a room. A handler gets a
   * context `ctx` with `ctx.say(key)`, `ctx.hero`, `ctx.inventory`, `ctx.state`, `ctx.item`
   * and `ctx.setEnabled(id, on)`. Returning `false` from a handler gives the default answer.
   *
   * @param {string} id The id of a hotspot, an item or a room.
   * @param {Object} handlers Any of `onInteract` (click), `onLook` (right-click or long press), `onUse` (an item was used on it), `onEnter` (a room, screen still black), `onEntered` (a room, after the fade-in) and `onExit`.
   * @returns {Game} The game, so calls can be chained.
   * @example
   * game.on('door', {
   *   onLook: (ctx) => ctx.say('door.look'),
   *   onUse: async (ctx) => {
   *     if (ctx.item !== 'key') return false;
   *     ctx.inventory.remove('key');
   *     game.flag('doorOpen', true);
   *     await ctx.say('door.opens');
   *   },
   * });
   */
  on(id, handlers) {
    this.scripts.add(id, handlers);
    return this;
  }

  /**
   * Loads room files, pictures and sounds once. {@link Game#start} calls it for you; call it
   * yourself to load while a title screen shows.
   * @returns {Promise<void>}
   */
  preload() {
    this.#ready ??= this.#load();
    return this.#ready;
  }

  /**
   * Loads everything the game needs (room files, pictures, sounds), then enters a room.
   *
   * It resolves once the room is entered and its `onEnter` and `onEntered` hooks have finished, so an
   * opening cutscene in `onEntered` is part of it. p5 does not start calling `draw()` until an async
   * `setup()` has finished, so until then the game steps and draws itself: awaiting this in `setup()` is fine.
   * @param {string} [roomId] The room to start in. Default: the first one added.
   * @param {string} [startName='default'] Which of the room's `starts` the hero appears at.
   * @returns {Promise<void>} Resolves once the room is entered.
   * @example
   * async function setup() {
   *   game = createGame({ rooms: [yard] });
   *   await game.start();
   * }
   */
  async start(roomId, startName = 'default') {
    await this.preload();
    const first = roomId ?? this.rooms.keys().next().value;
    if (first === undefined) throw new Error('add a room first: createGame({ rooms: [...] })');
    return this.scene.goTo(first, startName);
  }

  /**
   * Changes room with a fade. The state remembers each room, so it is as you left it when you come back.
   * @param {string} roomId The room to go to.
   * @param {string} [startName='default'] Which of that room's `starts` the hero appears at.
   * @returns {Promise<void>} Resolves when the new room has faded in. Throws if a change is already running.
   * @example
   * game.on('door', { onInteract: () => game.goTo('hall', 'fromYard') });
   */
  goTo(roomId, startName = 'default') {
    return this.scene.goTo(roomId, startName);
  }

  // ---- playing ----

  /**
   * The room the hero is in, or `undefined` before {@link Game#start}.
   * @type {Object|undefined}
   */
  get room() {
    return this.scene.room;
  }

  /**
   * The hero says a line. Everything the player reads is a text key from `strings`; a key that
   * is missing shows as `[key]`, which is easy to spot.
   * @param {string} key A text key, such as `'sign.look'`.
   * @param {Object} [options] Passed to {@link Actor#say}.
   * @returns {Promise<void>} Resolves when the line is over (or the player skips it).
   * @example
   * await game.say('sign.look');
   */
  say(key, options) {
    return this.hero.say(key, options);
  }

  /**
   * Plays a conversation. The format is detected: Markdown text, Twee 3 text (starts with `::`),
   * Twison JSON, compiled Ink JSON or an inkjs `Story`, or a ready-made dialogue runner.
   * Ink variables are saved with the game, and Ink can call `giveItem("key")` and `setFlag("name")`.
   *
   * @param {string|Object} source The conversation.
   * @param {Object} [options]
   * @param {string[]} [options.sync] Ink only: which variables to keep in the state (default: all).
   * @param {Object<string,Function>} [options.externals] Ink only: extra EXTERNAL functions.
   * @param {string} [options.start] Markdown only: the section to begin with.
   * @returns {Promise<void>} Resolves when the conversation ends.
   * @example
   * await game.talk(`
   * # start
   * Guard: Halt! Who goes there?
   * * Just me -> me
   * * A friend -> friend
   *
   * # me
   * Guard: Move along, then.
   * -> END
   *
   * # friend
   * Guard: Any friend of the lighthouse is a friend of mine.
   * -> END
   * `);
   */
  talk(source, options = {}) {
    const runner = toRunner(source, { state: this.state, inventory: this.inventory, Story: this.options.Story, ...options });
    return this.dialogue.play(runner);
  }

  /**
   * Runs a cutscene: the player cannot act, and a Skip button (or Escape) ends it early, jumping
   * the hero and the fade to where they would have ended up. The script's state changes still
   * happen, so a skipped cutscene ends in the same state as a played one.
   * @param {function(Object): Promise<*>} script An async function. It gets the cutscene controller `cs`; `cs.label('name')` marks a place that `skip('name')` can stop at.
   * @param {Object} [options]
   * @param {boolean} [options.skippable=true] `false` hides the Skip button.
   * @returns {Promise<*>} Resolves with the script's result when it ends or is skipped.
   * @example
   * await game.cutscene(async () => {
   *   await game.hero.walkTo({ x: 300, y: 300 });
   *   await game.say('intro.hello');
   * });
   */
  cutscene(script, options) {
    return this.cutscenes.run(script, options);
  }

  /**
   * Reads or sets a yes/no fact about the game. Flags are saved with the game.
   * @param {string} name The flag's name. Do not put dots in it.
   * @param {boolean} [value] Given: the flag is set to it. Left out: the flag is read.
   * @returns {boolean} The flag's value (`false` if it was never set).
   * @example
   * if (!game.flag('doorOpen')) await game.say('door.locked');
   * game.flag('doorOpen', true);
   */
  flag(name, value) {
    if (value === undefined) return this.state.get(`flags.${name}`, false);
    this.state.set(`flags.${name}`, value);
    return value;
  }

  /**
   * Puts an item in the inventory.
   * @param {string} item An id from the `items` option.
   * @returns {boolean} `true`, or `false` if it was already carried.
   * @example
   * game.give('key');
   */
  give(item) { return this.inventory.give(item); }

  /**
   * Removes an item from the inventory.
   * @param {string} item An id from the `items` option.
   * @returns {boolean} `true`, or `false` if it was not carried.
   */
  take(item) { return this.inventory.remove(item); }

  /**
   * Asks whether an item is carried.
   * @param {string} item An id from the `items` option.
   * @returns {boolean}
   * @example
   * if (game.has('key')) await game.say('door.unlock');
   */
  has(item) { return this.inventory.has(item); }

  /**
   * The live hotspot of the current room, for example to switch it off with `.enabled = false`.
   * @param {string} id The hotspot's id.
   * @returns {Hotspot|null} `null` if the current room has no such hotspot.
   */
  hotspot(id) {
    return this.hover.hotspots.find((h) => h.id === id) ?? null;
  }

  /**
   * Moves the game forward one step. With {@link createGame}, p5 calls this every frame, so you
   * only call it yourself in tests or in a game without p5.
   * @param {number} dt Milliseconds since the last step. Capped at 100.
   */
  update(dt) {
    const step = Math.min(Math.max(dt || 0, 0), 100);
    this.scheduler.update(step);
    this.events.emit('update', step);
  }

  // ---- saving ----

  /**
   * Saves the game: the state (flags, inventory, current room) and where the hero stands.
   * @param {string} [slot] Default: the `saveSlot` option.
   * @example
   * game.save();
   */
  save(slot = this.options.saveSlot) {
    this.state.set('hero', this.hero.toJSON());
    saveToSlot(this.state, slot, this.#storage());
  }

  /**
   * Loads a saved game and re-enters its room.
   * @param {string} [slot] Default: the `saveSlot` option.
   * @returns {Promise<boolean>} `false` when nothing is saved in that slot.
   * @example
   * if (!(await game.load())) await game.start();
   */
  async load(slot = this.options.saveSlot) {
    await this.preload();
    if (!loadFromSlot(this.state, slot, this.#storage())) return false;
    await this.scene.restore();
    const hero = this.state.get('hero');
    if (hero) this.hero.fromJSON(hero);
    return true;
  }

  // ---- internals ----

  // What createHotspots needs to read mask pictures and svg files (see hotspotFiles).
  #hotspotAssets(room) {
    const file = (name, what) => {
      const found = this.hotspotFiles.get(`${room.id}:${name}`);
      if (!found) throw new Error(`room "${room.id}": ${what} "${name}" is not loaded (a game loads these in start())`);
      return found;
    };
    return { pixels: (name) => file(name, 'the mask picture').pixels, text: (name) => file(name, 'the svg file').text };
  }

  #storage() {
    return this.options.storage ?? globalThis.localStorage;
  }

  #room(id) {
    const room = this.rooms.get(id);
    if (!room) throw new Error(`no room "${id}" (rooms: ${[...this.rooms.keys()].join(', ') || 'none'})`);
    return room;
  }

  // Items may be given as display text: { key: 'brass key' } becomes the text key "item.key".
  #items(items) {
    const defs = {};
    const strings = {};
    for (const [id, value] of Object.entries(items)) {
      if (typeof value === 'string') {
        defs[id] = { name: `item.${id}` };
        strings[`item.${id}`] = value;
      } else {
        defs[id] = { ...value, name: value.name ?? `item.${id}` };
        if (value.text) strings[defs[id].name] = value.text;
      }
    }
    this.i18n.add(this.options.language, strings);
    return { items: defs };
  }

  async #load() {
    for (const source of this.#roomSources.splice(0)) {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`could not load room ${source.url}: ${response.status}`);
      const room = await response.json();
      this.roomURLs.set(room.id, new URL(source.url, globalThis.document?.baseURI ?? 'file:///').href);
      this.rooms.set(room.id, room);
    }
    await this.loadAssets?.(); // pictures, when a p5 sketch is attached (see attachP5)
    if (this.audio) {
      try { await this.audio.loadAll(); } catch (err) { console.warn('some sounds could not be loaded:', err.message); }
    }
  }
}
