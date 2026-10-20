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

// Everything a point-and-click game needs, wired together with sensible defaults.
// In a sketch use createGame(options) (see src/index.js); new Game(options) gives the
// same object without p5, for tests or a game's logic module.
export const GAME_DEFAULTS = {
  width: 640,
  height: 360,
  rooms: [],             // room objects or URLs of room JSON files
  strings: {},           // text keys -> text (added to the built-in English strings)
  language: 'en',
  items: {},             // id -> 'display text' or { name, text, image }
  recipes: [],
  sounds: {},            // sound id -> URL
  sfx: {},               // event name -> sound id (see AudioManager.attach)
  hero: {},              // Actor options: speed, directions, animations, x, y
  mode: 'smart',         // or 'verbs'
  fadeMs: 300,
  followHero: true,      // the camera keeps the hero in view in rooms wider than the screen
  debugKey: 'd',         // toggles the outlines of hotspots and floors (null: off)
  saveSlot: 'game',
  storage: undefined,    // where saves and settings go (default: localStorage)
  Story: undefined,      // inkjs's Story class, if ink.js is not loaded as a script
};

export class Game {
  debug = false;
  images = new Map(); // room id -> { image name: p5.Image }, filled by the p5 binding
  itemImages = {};
  roomURLs = new Map(); // room id -> URL of its file, so its pictures load relative to it
  #roomSources = [];
  #ready = null;

  constructor(options = {}) {
    const o = { ...GAME_DEFAULTS, ...options, hero: { ...GAME_DEFAULTS.hero, ...options.hero } };
    this.options = o;
    const core = createCore();
    Object.assign(this, { core, events: core.events, state: core.state, scheduler: core.scheduler, i18n: core.i18n });
    this.i18n.language = o.language;
    this.i18n.add('en', defaultStrings);
    this.i18n.add(o.language, o.strings);

    this.rooms = new Map();
    for (const source of Array.isArray(o.rooms) ? o.rooms : Object.values(o.rooms)) this.addRoom(source);

    this.scene = new SceneManager({
      ...core, viewWidth: o.width, viewHeight: o.height, fadeMs: o.fadeMs, loadRoom: async (id) => this.#room(id),
    });
    this.hero = new Actor({ id: 'hero', speed: 150, directions: 4, ...o.hero, translate: (key) => this.i18n.t(key) });
    this.hover = new HoverTracker(this.events);
    this.inventory = new Inventory({ state: this.state, events: this.events, ...this.#items(o.items), recipes: o.recipes });
    this.settings = new Settings({ storage: o.storage });
    this.settings.load();
    this.subtitles = new SubtitleBar();
    bindTextSettings(this.settings, { subtitles: this.subtitles, actors: [this.hero] });
    this.menu = new ChoiceMenu({ viewWidth: o.width, viewHeight: o.height });
    this.dialogue = new DialogueSession({ events: this.events, subtitles: this.subtitles, menu: this.menu });
    this.cutscenes = new Cutscenes({ events: this.events, scheduler: this.scheduler, targets: [this.hero, this.scene.fade] });
    this.audio = Object.keys(o.sounds).length && globalThis.AudioContext ? new AudioManager({ settings: this.settings }) : null;
    this.audio?.register(o.sounds);
    this.audio?.attach(this.events, { sfx: o.sfx });
    this.interactor = new Interactor({
      hero: this.hero, state: this.state, events: this.events, inventory: this.inventory, hover: this.hover,
      cutscenes: this.cutscenes, dialogue: this.dialogue, audio: this.audio, mode: o.mode,
    });
    this.interactor.onError = (err) => console.error(err);
    this.scripts = new Scripts({ interactor: this.interactor });
    this.scene.scripts = this.scripts;
    this.bar = new InventoryBar({ viewWidth: o.width, viewHeight: o.height });
    this.pointer = new PointerController({
      interactor: this.interactor, hover: this.hover, camera: this.scene.camera, bar: this.bar, scheduler: this.scheduler,
    });

    // Entering a room: its hotspots, its floor, and the hero at the start position.
    this.events.on('room:enter', ({ room, start }) => {
      const hotspots = createHotspots(room);
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

  // A room object, or the URL of a room JSON file (loaded by start()).
  addRoom(source) {
    if (typeof source === 'string') this.#roomSources.push({ url: source });
    else this.rooms.set(source.id, source);
    this.#ready = null;
    return this;
  }

  // The script for an object, item or room: { onInteract, onLook, onUse, onEnter, onEntered, onExit }.
  on(id, handlers) {
    this.scripts.add(id, handlers);
    return this;
  }

  // Loads room files, pictures and sounds once. start() calls it for you.
  preload() {
    this.#ready ??= this.#load();
    return this.#ready;
  }

  // Loads everything, then enters the room (default: the first one added).
  async start(roomId, startName = 'default') {
    await this.preload();
    const first = roomId ?? this.rooms.keys().next().value;
    if (first === undefined) throw new Error('add a room first: createGame({ rooms: [...] })');
    return this.scene.goTo(first, startName);
  }

  goTo(roomId, startName = 'default') {
    return this.scene.goTo(roomId, startName);
  }

  // ---- playing ----

  get room() {
    return this.scene.room;
  }

  // The hero says a line (a text key). Resolves when the line is over.
  say(key, options) {
    return this.hero.say(key, options);
  }

  // Plays a conversation: Markdown or Twee text, Twison, an Ink story or compiled Ink JSON, or a runner.
  // options: sync (Ink variables to save), externals (Ink EXTERNAL functions), start (Markdown section).
  talk(source, options = {}) {
    const runner = toRunner(source, { state: this.state, inventory: this.inventory, Story: this.options.Story, ...options });
    return this.dialogue.play(runner);
  }

  // Runs a cutscene: input is locked and the player can skip it.
  cutscene(script, options) {
    return this.cutscenes.run(script, options);
  }

  // flag('doorOpen') reads a flag; flag('doorOpen', true) sets it. Flags are saved with the game.
  flag(name, value) {
    if (value === undefined) return this.state.get(`flags.${name}`, false);
    this.state.set(`flags.${name}`, value);
    return value;
  }

  give(item) { return this.inventory.give(item); }

  take(item) { return this.inventory.remove(item); }

  has(item) { return this.inventory.has(item); }

  hotspot(id) {
    return this.hover.hotspots.find((h) => h.id === id) ?? null;
  }

  // One step of game time. With createGame() p5 calls this every frame.
  update(dt) {
    const step = Math.min(Math.max(dt || 0, 0), 100);
    this.scheduler.update(step);
    this.events.emit('update', step);
  }

  // ---- saving ----

  save(slot = this.options.saveSlot) {
    this.state.set('hero', this.hero.toJSON());
    saveToSlot(this.state, slot, this.#storage());
  }

  // Returns false when nothing is saved in that slot.
  async load(slot = this.options.saveSlot) {
    await this.preload();
    if (!loadFromSlot(this.state, slot, this.#storage())) return false;
    await this.scene.restore();
    const hero = this.state.get('hero');
    if (hero) this.hero.fromJSON(hero);
    return true;
  }

  // ---- internals ----

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
