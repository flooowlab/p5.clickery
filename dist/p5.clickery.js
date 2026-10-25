/*! p5.clickery v0.1.0 | MIT License | https://github.com/flooowlab/p5.clickery */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    Actor: () => Actor,
    AnimationState: () => AnimationState,
    AudioManager: () => AudioManager,
    Camera: () => Camera,
    ChoiceMenu: () => ChoiceMenu,
    Cutscenes: () => Cutscenes,
    DIRS4: () => DIRS4,
    DIRS8: () => DIRS8,
    DialogueSession: () => DialogueSession,
    EventBus: () => EventBus,
    Fade: () => Fade,
    GAME_DEFAULTS: () => GAME_DEFAULTS,
    Game: () => Game,
    GameLoop: () => GameLoop,
    GraphRunner: () => GraphRunner,
    Hotspot: () => Hotspot,
    HoverTracker: () => HoverTracker,
    I18n: () => I18n,
    Interactor: () => Interactor,
    Inventory: () => Inventory,
    InventoryBar: () => InventoryBar,
    LetterboxScaler: () => LetterboxScaler,
    Navigator: () => Navigator,
    PointerController: () => PointerController,
    SAVE_VERSION: () => SAVE_VERSION,
    SceneManager: () => SceneManager,
    Scheduler: () => Scheduler,
    Scripts: () => Scripts,
    Settings: () => Settings,
    StateInspector: () => StateInspector,
    StateStore: () => StateStore,
    SubtitleBar: () => SubtitleBar,
    Timer: () => Timer,
    VERSION: () => VERSION,
    applyHotspotState: () => applyHotspotState,
    attachP5: () => attachP5,
    bindTextSettings: () => bindTextSettings,
    clickeryAddon: () => clickeryAddon,
    clientToLogical: () => clientToLogical,
    closestPointOnSegment: () => closestPointOnSegment,
    colorMaskProvider: () => colorMaskProvider,
    compileTwine: () => compileTwine,
    createCore: () => createCore,
    createHotspot: () => createHotspot,
    createHotspots: () => createHotspots,
    createInkRunner: () => createInkRunner,
    createMarkdownRunner: () => createMarkdownRunner,
    createTwineRunner: () => createTwineRunner,
    createVars: () => createVars,
    defaultStrings: () => defaultStrings,
    deleteSlot: () => deleteSlot,
    deserialize: () => deserialize,
    directionFromVector: () => directionFromVector,
    dist: () => dist,
    drawAnimation: () => drawAnimation,
    drawBackground: () => drawBackground,
    drawDebugOverlay: () => drawDebugOverlay,
    drawFade: () => drawFade,
    drawForeground: () => drawForeground,
    drawHeroDefault: () => drawHeroDefault,
    drawHoverLabel: () => drawHoverLabel,
    drawRoomShapes: () => drawRoomShapes,
    drawSkipButton: () => drawSkipButton,
    drawSpeechDefault: () => drawSpeechDefault,
    exportToFile: () => exportToFile,
    firstInteract: () => firstInteract,
    firstLook: () => firstLook,
    firstUse: () => firstUse,
    fitLetterbox: () => fitLetterbox,
    hitSkipButton: () => hitSkipButton,
    hoverLabel: () => hoverLabel,
    importFromFile: () => importFromFile,
    inkExternals: () => inkExternals,
    loadFromSlot: () => loadFromSlot,
    mirrorDirection: () => mirrorDirection,
    once: () => once,
    parseColor: () => parseColor,
    parseMarkdown: () => parseMarkdown,
    parseRoom: () => parseRoom,
    parseSvgPaths: () => parseSvgPaths,
    parseTags: () => parseTags,
    parseTwee: () => parseTwee,
    parseTwison: () => parseTwison,
    pointInPolygon: () => pointInPolygon,
    polygonArea: () => polygonArea,
    polygonProvider: () => polygonProvider,
    registerClickery: () => registerClickery,
    saveToSlot: () => saveToSlot,
    scaleFromStops: () => scaleFromStops,
    segmentsCross: () => segmentsCross,
    serialize: () => serialize,
    skipButtonRect: () => skipButtonRect,
    sortByBaseline: () => sortByBaseline,
    splitSpeaker: () => splitSpeaker,
    spriteFrames: () => spriteFrames,
    startPosition: () => startPosition,
    svgProvider: () => svgProvider,
    toRunner: () => toRunner
  });

  // src/core/events.js
  var EventBus = class {
    #handlers = /* @__PURE__ */ new Map();
    /**
     * Listens for an event.
     * @param {string} type The event name, such as `'room:enter'`.
     * @param {Function} handler Called with whatever the event sends.
     * @returns {function(): void} A function that stops listening.
     */
    on(type, handler) {
      if (typeof handler !== "function") throw new TypeError("handler must be a function");
      if (!this.#handlers.has(type)) this.#handlers.set(type, /* @__PURE__ */ new Set());
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
  };

  // src/core/scheduler.js
  var Timer = class {
    constructor(delay, callback, repeat) {
      this.delay = delay;
      this.callback = callback;
      this.repeat = repeat;
      this.remaining = delay;
      this.cancelled = false;
    }
    /**
     * Stops the timer; it will not be called again.
     */
    cancel() {
      this.cancelled = true;
    }
  };
  var Scheduler = class {
    /** `true` during a skipped cutscene, when every wait finishes at once. @type {boolean} */
    skipping = false;
    #timers = [];
    #waits = /* @__PURE__ */ new Set();
    /**
     * Calls a function once, after some game time.
     * @param {number} ms Milliseconds of game time.
     * @param {Function} callback
     * @returns {Timer}
     */
    after(ms, callback) {
      return this.#add(new Timer(checkMs(ms), callback, false));
    }
    /**
     * Calls a function again and again, until cancelled.
     * @param {number} ms Milliseconds of game time between calls. Above 0.
     * @param {Function} callback
     * @returns {Timer} Call `cancel()` on it to stop.
     */
    every(ms, callback) {
      if (checkMs(ms) === 0) throw new RangeError("every() needs a delay above 0");
      return this.#add(new Timer(ms, callback, true));
    }
    /**
     * Pauses an async function for some game time. While a cutscene is being skipped, waits finish at once.
     * @param {number} ms Milliseconds of game time.
     * @param {AbortSignal} [signal] Rejects the wait early when aborted.
     * @returns {Promise<void>}
     * @example
     * await game.scheduler.wait(1000);
     */
    wait(ms, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason);
        if (this.skipping) return resolve();
        const settle = () => {
          timer.cancel();
          signal?.removeEventListener("abort", onAbort);
          this.#waits.delete(settle);
          resolve();
        };
        const onAbort = () => {
          timer.cancel();
          this.#waits.delete(settle);
          reject(signal.reason);
        };
        const timer = this.after(ms, settle);
        this.#waits.add(settle);
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    }
    /**
     * Cutscene fast-forward: turning it on finishes every pending wait.
     * @param {boolean} on
     */
    setSkipping(on) {
      this.skipping = on;
      if (!on) return;
      for (const settle of [...this.#waits]) settle();
    }
    /**
     * Moves game time forward and calls whatever is due. A game does this every frame.
     * @param {number} dt Milliseconds. Not negative.
     */
    update(dt) {
      if (!(dt >= 0)) throw new RangeError(`dt must be a non-negative number, got ${dt}`);
      for (const timer of [...this.#timers]) {
        if (timer.cancelled) continue;
        timer.remaining -= dt;
        while (!timer.cancelled && timer.remaining <= 0) {
          if (timer.repeat) timer.remaining += timer.delay;
          else timer.cancel();
          timer.callback();
        }
      }
      this.#timers = this.#timers.filter((t) => !t.cancelled);
    }
    /**
     * Cancels every timer.
     */
    clear() {
      for (const timer of this.#timers) timer.cancel();
      this.#timers = [];
    }
    /**
     * How many timers are waiting.
     * @type {number}
     */
    get size() {
      return this.#timers.filter((t) => !t.cancelled).length;
    }
    #add(timer) {
      this.#timers.push(timer);
      return timer;
    }
  };
  function checkMs(ms) {
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`delay must be a finite number >= 0, got ${ms}`);
    return ms;
  }

  // src/core/loop.js
  var GameLoop = class {
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
      this.events?.emit("update", dt);
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
  };

  // src/core/state.js
  var initial = () => ({ flags: {}, vars: {}, inventory: [], rooms: {}, currentRoom: null });
  var StateStore = class {
    #data = initial();
    #watchers = /* @__PURE__ */ new Map();
    /**
     * Reads a value.
     * @param {string} [path] A dotted path. Without one, the whole state.
     * @param {*} [fallback] Returned when nothing is stored at the path.
     * @returns {*} A copy of the value.
     */
    get(path, fallback) {
      if (path === void 0 || path === "") return this.toJSON();
      const value = getIn(this.#data, path);
      return value === void 0 ? fallback : clone(value);
    }
    /**
     * Stores a value, creating the path as needed, and tells whoever is watching it.
     * @param {string} path A dotted path.
     * @param {*} value JSON data. `undefined` is rejected: use `null`.
     */
    set(path, value) {
      const keys = split(path);
      if (keys.length === 0) throw new Error("set() needs a path");
      if (value === void 0) throw new TypeError("state values cannot be undefined, use null");
      const stored = clone(value);
      const before = this.toJSON();
      let node = this.#data;
      for (const key of keys.slice(0, -1)) {
        if (node[key] === null || typeof node[key] !== "object") node[key] = {};
        node = node[key];
      }
      node[keys.at(-1)] = stored;
      this.#notify(before);
    }
    /**
     * Calls a function whenever the value at a path changes, including changes made to a parent or
     * child path.
     * @param {string} path
     * @param {function(*, *, string): void} fn Called with the new value, the old value and the path.
     * @returns {function(): void} A function that stops watching.
     */
    watch(path, fn) {
      if (!this.#watchers.has(path)) this.#watchers.set(path, /* @__PURE__ */ new Set());
      this.#watchers.get(path).add(fn);
      return () => this.#watchers.get(path)?.delete(fn);
    }
    /**
     * A copy of the whole state, ready to be saved.
     * @returns {Object}
     */
    toJSON() {
      return clone(this.#data);
    }
    /**
     * Replaces all of the state, for example with what was saved. Missing top-level keys get their defaults.
     * @param {Object} json What {@link StateStore#toJSON} returned.
     */
    fromJSON(json) {
      if (json === null || typeof json !== "object" || Array.isArray(json)) {
        throw new TypeError("fromJSON needs an object");
      }
      const before = this.toJSON();
      this.#data = { ...initial(), ...clone(json) };
      this.#notify(before);
    }
    #notify(before) {
      for (const [path, fns] of [...this.#watchers]) {
        const old = getIn(before, path);
        const now = getIn(this.#data, path);
        if (JSON.stringify(now) === JSON.stringify(old)) continue;
        for (const fn of [...fns]) fn(clone(now), clone(old), path);
      }
    }
  };
  function split(path) {
    return String(path).split(".").filter(Boolean);
  }
  function getIn(data, path) {
    let node = data;
    for (const key of split(path)) {
      if (node === null || typeof node !== "object" || !Object.hasOwn(node, key)) return void 0;
      node = node[key];
    }
    return node;
  }
  function clone(value) {
    if (value === void 0) return void 0;
    const json = JSON.stringify(value);
    if (json === void 0) throw new TypeError(`state values must be JSON-serialisable, got ${typeof value}`);
    return JSON.parse(json);
  }

  // src/core/i18n.js
  var I18n = class {
    constructor(tables = {}, language = "en", fallback = "en") {
      this.tables = tables;
      this.language = language;
      this.fallback = fallback;
    }
    /**
     * Adds strings to a language, keeping the ones already there.
     * @param {string} language
     * @param {Object<string,string>} strings Keys and their text.
     */
    add(language, strings) {
      this.tables[language] = { ...this.tables[language], ...strings };
    }
    /**
     * Asks whether a key has text, in the current or the fallback language.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
      return key in (this.tables[this.language] ?? {}) || key in (this.tables[this.fallback] ?? {});
    }
    /**
     * Looks up a key. `{name}` placeholders are filled from `vars`.
     * @param {string} key
     * @param {Object} [vars] Values for placeholders.
     * @returns {string} The text, or `[key]` when there is none.
     */
    t(key, vars = {}) {
      const text = this.tables[this.language]?.[key] ?? this.tables[this.fallback]?.[key];
      if (text === void 0) return `[${key}]`;
      return text.replace(/\{(\w+)\}/g, (m, name) => name in vars ? String(vars[name]) : m);
    }
  };

  // src/core/save.js
  var SAVE_VERSION = 1;
  var PREFIX = "p5.clickery:";
  function serialize(store, now = Date.now()) {
    return JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: store.toJSON() });
  }
  function deserialize(store, text) {
    let save;
    try {
      save = JSON.parse(text);
    } catch {
      throw new Error("Save data is not valid JSON");
    }
    if (save === null || typeof save !== "object" || typeof save.state !== "object" || save.state === null) {
      throw new Error("Save data has no state");
    }
    if (save.version > SAVE_VERSION) {
      throw new Error(`Save version ${save.version} is newer than supported version ${SAVE_VERSION}`);
    }
    store.fromJSON(save.state);
    return save;
  }
  function saveToSlot(store, slot, storage = globalThis.localStorage) {
    storage.setItem(PREFIX + slot, serialize(store));
  }
  function loadFromSlot(store, slot, storage = globalThis.localStorage) {
    const text = storage.getItem(PREFIX + slot);
    if (text === null) return false;
    deserialize(store, text);
    return true;
  }
  function deleteSlot(slot, storage = globalThis.localStorage) {
    storage.removeItem(PREFIX + slot);
  }
  function exportToFile(store, filename = "savegame.json") {
    const url = URL.createObjectURL(new Blob([serialize(store)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: filename });
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importFromFile(store, file) {
    return deserialize(store, await file.text());
  }

  // src/core/settings.js
  var RANGES = {
    textSpeed: [0.25, 4],
    masterVolume: [0, 1],
    musicVolume: [0, 1],
    sfxVolume: [0, 1],
    voiceVolume: [0, 1]
  };
  var DEFAULTS = {
    textSpeed: 1,
    subtitles: true,
    masterVolume: 1,
    musicVolume: 0.7,
    sfxVolume: 1,
    voiceVolume: 1
  };
  var Settings = class {
    #values;
    #listeners = /* @__PURE__ */ new Set();
    constructor({ storage = globalThis.localStorage, key = "p5.clickery:settings", defaults = {} } = {}) {
      this.storage = storage;
      this.key = key;
      this.defaults = { ...DEFAULTS, ...defaults };
      this.#values = { ...this.defaults };
    }
    /**
     * A copy of all the settings.
     * @type {Object}
     */
    get all() {
      return { ...this.#values };
    }
    /**
     * Reads a setting.
     * @param {string} name
     * @returns {number|boolean}
     * @throws {Error} For an unknown name.
     */
    get(name) {
      this.#check(name);
      return this.#values[name];
    }
    /**
     * Changes a setting. A number is kept within its range. The change is saved and listeners are told.
     * @param {string} name
     * @param {number|boolean} value
     * @returns {number|boolean} The value that was kept.
     */
    set(name, value) {
      this.#check(name);
      const next = this.#clean(name, value);
      if (next === this.#values[name]) return next;
      this.#values[name] = next;
      this.save();
      for (const fn of [...this.#listeners]) fn(name, next, this.all);
      return next;
    }
    /**
     * Listens for changes.
     * @param {function(string, *, Object): void} fn Called with the name, the new value and all the settings.
     * @returns {function(): void} A function that stops listening.
     */
    onChange(fn) {
      this.#listeners.add(fn);
      return () => this.#listeners.delete(fn);
    }
    /**
     * Puts every setting back to its default.
     */
    reset() {
      for (const [name, value] of Object.entries(this.defaults)) this.set(name, value);
    }
    /**
     * Reads the saved settings. Unknown or invalid entries are ignored.
     * @returns {boolean} `false` when nothing was saved.
     */
    load() {
      let saved;
      try {
        const text = this.storage?.getItem(this.key);
        if (!text) return false;
        saved = JSON.parse(text);
      } catch {
        return false;
      }
      for (const [name, value] of Object.entries(saved ?? {})) {
        if (!(name in this.defaults)) continue;
        try {
          this.set(name, value);
        } catch {
        }
      }
      return true;
    }
    /**
     * Writes the settings to storage. `set` does it for you; in a private window it quietly does nothing.
     */
    save() {
      try {
        this.storage?.setItem(this.key, JSON.stringify(this.#values));
      } catch {
      }
    }
    #check(name) {
      if (!(name in this.defaults)) throw new Error(`unknown setting "${name}"`);
    }
    #clean(name, value) {
      if (typeof this.defaults[name] === "boolean") {
        if (typeof value !== "boolean") throw new TypeError(`${name} must be true or false`);
        return value;
      }
      if (typeof value !== "number" || Number.isNaN(value)) throw new TypeError(`${name} must be a number`);
      const [lo, hi] = RANGES[name] ?? [-Infinity, Infinity];
      return Math.min(hi, Math.max(lo, value));
    }
  };
  function bindTextSettings(settings, { subtitles = null, actors = [] } = {}) {
    const apply = () => {
      if (subtitles) {
        subtitles.speed = settings.get("textSpeed");
        subtitles.enabled = settings.get("subtitles");
      }
      for (const actor of actors) actor.textSpeed = settings.get("textSpeed");
    };
    apply();
    return settings.onChange(apply);
  }

  // src/core/index.js
  function createCore(loopOptions = {}) {
    const events = new EventBus();
    const scheduler = new Scheduler();
    const state = new StateStore();
    const i18n = new I18n();
    const loop = new GameLoop({ scheduler, events, ...loopOptions });
    return { events, scheduler, state, i18n, loop };
  }

  // src/scene/room.js
  function parseRoom(json) {
    const where = `room "${json?.id ?? "?"}"`;
    if (json === null || typeof json !== "object") throw new TypeError("room must be an object");
    if (typeof json.id !== "string" || json.id === "") throw new TypeError("room needs a string id");
    for (const key of ["width", "height"]) {
      if (!Number.isFinite(json[key]) || json[key] <= 0) throw new RangeError(`${where}: ${key} must be a positive number`);
    }
    const ids = /* @__PURE__ */ new Set();
    const unique = (kind, id) => {
      if (typeof id !== "string" || id === "") throw new TypeError(`${where}: every ${kind} needs a string id`);
      if (ids.has(`${kind}:${id}`)) throw new Error(`${where}: duplicate ${kind} id "${id}"`);
      ids.add(`${kind}:${id}`);
    };
    const layers = (json.layers ?? []).map((layer, i) => {
      if (typeof layer.image !== "string") throw new TypeError(`${where}: layer ${i} needs an image`);
      const depth = layer.depth ?? "bg";
      if (depth !== "bg" && depth !== "fg") throw new RangeError(`${where}: layer ${i} depth must be "bg" or "fg"`);
      const parallax = layer.parallax ?? 1;
      if (!Number.isFinite(parallax) || parallax < 0) throw new RangeError(`${where}: layer ${i} parallax must be >= 0`);
      return { image: layer.image, depth, parallax };
    });
    const hotspots = (json.hotspots ?? []).map((h) => {
      unique("hotspot", h.id);
      return { ...h };
    });
    const walkable = (json.walkable ?? []).map((area) => {
      unique("walkable", area.id);
      if (!Array.isArray(area.points) || area.points.length < 3) throw new RangeError(`${where}: walkable "${area.id}" needs 3+ points`);
      return { ...area };
    });
    const obstacles = (json.obstacles ?? []).map((o) => {
      unique("obstacle", o.id);
      if (!Array.isArray(o.points) || o.points.length < 3) throw new RangeError(`${where}: obstacle "${o.id}" needs 3+ points`);
      return { ...o };
    });
    const starts = json.starts ?? {};
    if (Object.keys(starts).length === 0) throw new Error(`${where}: needs at least one start position`);
    for (const [name, s] of Object.entries(starts)) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) throw new TypeError(`${where}: start "${name}" needs x and y`);
    }
    return {
      id: json.id,
      width: json.width,
      height: json.height,
      background: json.background ?? null,
      color: json.color ?? "#000000",
      music: json.music,
      // sound id; omitted keeps the current music, null stops it
      layers,
      hotspots,
      walkable,
      obstacles,
      starts: structuredClone(starts)
    };
  }
  function startPosition(room, name = "default") {
    const start = room.starts[name];
    if (!start) throw new Error(`room "${room.id}" has no start "${name}"`);
    return start;
  }

  // src/scene/camera.js
  var Camera = class {
    /** The room x shown at the left edge. @type {number} */
    x = 0;
    /** The room y shown at the top edge. @type {number} */
    y = 0;
    constructor(viewWidth, viewHeight, roomWidth = viewWidth, roomHeight = viewHeight) {
      this.viewWidth = viewWidth;
      this.viewHeight = viewHeight;
      this.setRoom(roomWidth, roomHeight);
    }
    /**
     * Tells the camera the size of the room it is looking at. The scene manager does this on every room change.
     * @param {number} roomWidth
     * @param {number} roomHeight
     */
    setRoom(roomWidth, roomHeight) {
      this.roomWidth = roomWidth;
      this.roomHeight = roomHeight;
      this.moveTo(this.x, this.y);
    }
    /**
     * The furthest right the camera can be.
     * @type {number}
     */
    get maxX() {
      return Math.max(0, this.roomWidth - this.viewWidth);
    }
    /**
     * The furthest down the camera can be.
     * @type {number}
     */
    get maxY() {
      return Math.max(0, this.roomHeight - this.viewHeight);
    }
    /**
     * Puts the top-left of the view somewhere, kept inside the room.
     * @param {number} x
     * @param {number} y
     */
    moveTo(x, y) {
      this.x = clamp(x, 0, this.maxX);
      this.y = clamp(y, 0, this.maxY);
    }
    /**
     * Centres the view on a room point, usually the hero.
     * @param {number} x
     * @param {number} y
     */
    centerOn(x, y) {
      this.moveTo(x - this.viewWidth / 2, y - this.viewHeight / 2);
    }
    /**
     * Eases towards centring on a point. Call it every frame.
     * @param {number} x
     * @param {number} y
     * @param {number} dtMs Milliseconds since the last frame.
     * @param {number} [speed=5] The fraction of the distance closed per second.
     */
    follow(x, y, dtMs, speed = 5) {
      const t = 1 - Math.exp(-speed * dtMs / 1e3);
      this.moveTo(this.x + (x - this.viewWidth / 2 - this.x) * t, this.y + (y - this.viewHeight / 2 - this.y) * t);
    }
    /**
     * Where a layer with a parallax factor is drawn on screen. `1` moves with the room, `0` stays fixed on the screen.
     * @param {number} [parallax=1]
     * @returns {{x: number, y: number}}
     */
    layerOffset(parallax = 1) {
      return { x: -this.x * parallax, y: -this.y * parallax };
    }
    /**
     * Converts a room position to a screen position.
     * @param {number} x
     * @param {number} y
     * @returns {{x: number, y: number}}
     */
    worldToScreen(x, y) {
      return { x: x - this.x, y: y - this.y };
    }
    /**
     * Converts a screen position to a room position.
     * @param {number} x
     * @param {number} y
     * @returns {{x: number, y: number}}
     */
    screenToWorld(x, y) {
      return { x: x + this.x, y: y + this.y };
    }
  };
  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  // src/scene/transition.js
  var Fade = class {
    /** How dark it is: `0` is clear, `1` is black. @type {number} */
    alpha = 0;
    /** `true` during a skipped cutscene, when fades finish at once. @type {boolean} */
    skipping = false;
    #from = 0;
    #to = 0;
    #duration = 0;
    #elapsed = 0;
    #resolve = null;
    /**
     * Fades to a darkness. Starting a new fade settles the one before.
     * @param {number} target `0` (clear) to `1` (black).
     * @param {number} ms How long it takes.
     * @returns {Promise<void>} Resolves when the fade ends.
     */
    to(target, ms) {
      this.#settle();
      this.#from = this.alpha;
      this.#to = target;
      this.#duration = ms;
      this.#elapsed = 0;
      if (ms <= 0 || this.alpha === target || this.skipping) {
        this.alpha = target;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        this.#resolve = resolve;
      });
    }
    /**
     * Fades to black.
     * @param {number} ms
     * @returns {Promise<void>}
     */
    out(ms) {
      return this.to(1, ms);
    }
    /**
     * Fades back to clear.
     * @param {number} ms
     * @returns {Promise<void>}
     */
    in(ms) {
      return this.to(0, ms);
    }
    /**
     * Cutscene fast-forward: finishes the current fade at once and makes new ones instant.
     * @param {boolean} on
     */
    setSkipping(on) {
      this.skipping = on;
      if (on && this.#resolve) {
        this.alpha = this.#to;
        this.#settle();
      }
    }
    /**
     * `true` while a fade is under way.
     * @type {boolean}
     */
    get active() {
      return this.#resolve !== null;
    }
    /**
     * Moves the fade forward. The scene manager does this on every `update` event.
     * @param {number} dt Milliseconds.
     */
    update(dt) {
      if (!this.#resolve) return;
      this.#elapsed += dt;
      const t = Math.min(this.#elapsed / this.#duration, 1);
      this.alpha = this.#from + (this.#to - this.#from) * t;
      if (t >= 1) this.#settle();
    }
    #settle() {
      const resolve = this.#resolve;
      this.#resolve = null;
      resolve?.();
    }
  };

  // src/scene/scene-manager.js
  var SceneManager = class {
    /** The current room, or `null` before the first `goTo`. @type {Room|null} */
    room = null;
    #busy = false;
    #firstVisit = false;
    constructor({ state, events, loadRoom, scripts = {}, viewWidth, viewHeight, fadeMs = 300 }) {
      this.state = state;
      this.events = events;
      this.loadRoom = loadRoom;
      this.scripts = scripts;
      this.fadeMs = fadeMs;
      this.camera = new Camera(viewWidth, viewHeight);
      this.fade = new Fade();
      events.on("update", (dt) => this.fade.update(dt));
    }
    /**
     * `true` while a room change is under way.
     * @type {boolean}
     */
    get busy() {
      return this.#busy;
    }
    /**
     * Fades out of the current room, switches, and fades in.
     * @param {string} roomId
     * @param {string} [start='default'] Which of the room's `starts` the hero appears at.
     * @returns {Promise<void>} Resolves after the fade-in and the `onEntered` hook.
     * @throws {Error} When a change is already running, or the room has no such start.
     */
    async goTo(roomId, start = "default") {
      if (this.#busy) throw new Error(`already changing rooms, cannot go to "${roomId}"`);
      this.#busy = true;
      try {
        const room = await this.#load(roomId);
        startPosition(room, start);
        if (this.room) {
          await this.fade.out(this.fadeMs);
          await this.#leave();
        }
        await this.#enter(room, start);
        await this.fade.in(this.fadeMs);
        await this.#entered(room, start);
      } finally {
        this.#busy = false;
      }
    }
    /**
     * Enters the room saved in the state, without a fade. Call it after loading a game ({@link Game#load} does).
     * @param {string} [start='default']
     * @returns {Promise<boolean>} `false` when no room is saved.
     */
    async restore(start = "default") {
      const id = this.state.get("currentRoom");
      if (!id) return false;
      if (this.#busy) throw new Error("already changing rooms");
      this.#busy = true;
      try {
        if (this.room) await this.#leave();
        await this.#enter(await this.#load(id), start);
        this.fade.alpha = 0;
        return true;
      } finally {
        this.#busy = false;
      }
    }
    async #load(id) {
      return parseRoom(await this.loadRoom(id));
    }
    async #leave() {
      const ctx = this.#context(this.room);
      this.events.emit("room:exit", ctx);
      await this.#script(this.room.id)?.onExit?.(ctx);
    }
    async #enter(room, start) {
      const firstVisit = !this.state.get(`rooms.${room.id}.visited`, false);
      this.#firstVisit = firstVisit;
      this.room = room;
      this.state.set("currentRoom", room.id);
      this.state.set(`rooms.${room.id}.visited`, true);
      this.camera.setRoom(room.width, room.height);
      const { x, y } = startPosition(room, start);
      this.camera.centerOn(x, y);
      const ctx = { ...this.#context(room), start, firstVisit };
      this.events.emit("room:enter", ctx);
      await this.#script(room.id)?.onEnter?.(ctx);
      await this.scripts.runEnter?.(ctx, "onEnter");
    }
    async #entered(room, start) {
      const ctx = { ...this.#context(room), start, firstVisit: this.#firstVisit };
      this.events.emit("room:entered", ctx);
      await this.#script(room.id)?.onEntered?.(ctx);
      await this.scripts.runEnter?.(ctx, "onEntered");
    }
    #script(id) {
      return typeof this.scripts.get === "function" ? this.scripts.get(id) : this.scripts[id];
    }
    #context(room) {
      return { room, state: this.state, scene: this };
    }
  };

  // src/scene/render.js
  function drawLayers(p, room, camera, images, depth) {
    const layers = room.layers.filter((l) => l.depth === depth);
    if (depth === "bg" && room.background && images[room.background]) {
      p.image(images[room.background], -camera.x, -camera.y);
    }
    for (const layer of layers) {
      const img = images[layer.image];
      if (!img) continue;
      const { x, y } = camera.layerOffset(layer.parallax);
      p.image(img, x, y);
    }
  }
  function drawBackground(p, room, camera, images = {}) {
    if (!room.background) {
      p.noStroke();
      p.fill(room.color);
      p.rect(-camera.x, -camera.y, room.width, room.height);
    }
    drawLayers(p, room, camera, images, "bg");
  }
  function drawForeground(p, room, camera, images = {}) {
    drawLayers(p, room, camera, images, "fg");
  }
  function drawFade(p, fade) {
    if (fade.alpha <= 0) return;
    p.noStroke();
    p.fill(0, 0, 0, fade.alpha * 255);
    p.rect(0, 0, p.width, p.height);
  }

  // src/hit/providers.js
  function pointInPolygon(points, x, y) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function polygonProvider(points) {
    if (!Array.isArray(points) || points.length < 3) throw new RangeError("polygon needs 3+ points");
    return {
      kind: "polygon",
      contains: (x, y) => pointInPolygon(points, x, y),
      debugDraw(p) {
        p.beginShape();
        for (const [x, y] of points) p.vertex(x, y);
        p.endShape(p.CLOSE);
      }
    };
  }
  function parseColor(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex ?? "");
    if (!m) throw new TypeError(`bad colour "${hex}", expected #rrggbb`);
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  function colorMaskProvider({ pixels, color, tolerance = 4, roomWidth, roomHeight }) {
    const [r, g, b] = parseColor(color);
    const { data, width, height } = pixels;
    const sx = width / (roomWidth ?? width);
    const sy = height / (roomHeight ?? height);
    return {
      kind: "colorMask",
      contains(x, y) {
        const px = Math.floor(x * sx);
        const py = Math.floor(y * sy);
        if (px < 0 || py < 0 || px >= width || py >= height) return false;
        const i = (py * width + px) * 4;
        return data[i + 3] > 0 && Math.abs(data[i] - r) <= tolerance && Math.abs(data[i + 1] - g) <= tolerance && Math.abs(data[i + 2] - b) <= tolerance;
      },
      debugDraw(p) {
        p.noFill();
        p.text(`mask ${color}`, 4, 12);
      }
    };
  }
  function svgProvider({ d, Path2D: PathClass = globalThis.Path2D, ctx }) {
    if (typeof d !== "string" || d.trim() === "") throw new TypeError("svg provider needs path data");
    if (!PathClass) throw new Error("svg provider needs Path2D");
    const path = new PathClass(d);
    let context = ctx;
    return {
      kind: "svg",
      contains(x, y) {
        context ??= new OffscreenCanvas(1, 1).getContext("2d");
        return context.isPointInPath(path, x, y);
      },
      debugDraw(p) {
        p.drawingContext.stroke(path);
      }
    };
  }
  function parseSvgPaths(svgText) {
    const paths = {};
    for (const [, attrs] of svgText.matchAll(/<path\b([^>]*)>/g)) {
      const attr = (name) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
      const d = attr("d");
      if (!d) continue;
      for (const name of ["id", "inkscape:label"]) {
        const m = attr(name);
        if (m) paths[m[1] ?? m[2]] = d[1] ?? d[2];
      }
    }
    return paths;
  }

  // src/hit/hotspot.js
  var Hotspot = class {
    /** While `false`, it cannot be hit and the default drawing skips it. @type {boolean} */
    enabled = true;
    constructor({ id, name = null, provider, z = 0, walkTo = null }) {
      this.id = id;
      this.name = name ?? id;
      this.provider = provider;
      this.z = z;
      this.walkTo = walkTo;
    }
    /**
     * Asks whether a point is on the hotspot.
     * @param {number} x A room x.
     * @param {number} y A room y.
     * @returns {boolean} `false` when the hotspot is disabled.
     */
    hit(x, y) {
      return this.enabled && this.provider.contains(x, y);
    }
  };
  function createHotspot(def, assets = {}, room = {}) {
    let provider;
    switch (def.provider) {
      case "polygon":
        provider = polygonProvider(def.points);
        break;
      case "colorMask":
        provider = colorMaskProvider({
          pixels: required(assets.pixels, "pixels")(def.mask),
          color: def.color,
          tolerance: def.tolerance,
          roomWidth: room.width,
          roomHeight: room.height
        });
        break;
      case "svg": {
        const d = def.d ?? pathFor(def, assets);
        provider = svgProvider({ d, Path2D: assets.Path2D, ctx: assets.ctx });
        break;
      }
      default:
        throw new RangeError(`hotspot "${def.id}": unknown provider "${def.provider}"`);
    }
    return new Hotspot({ ...def, provider });
  }
  function pathFor(def, assets) {
    const paths = parseSvgPaths(required(assets.text, "text")(def.svg));
    const d = paths[def.pathId ?? def.id];
    if (!d) throw new Error(`hotspot "${def.id}": no path "${def.pathId ?? def.id}" in ${def.svg}`);
    return d;
  }
  function required(fn, name) {
    if (typeof fn !== "function") throw new Error(`this hotspot needs assets.${name}()`);
    return fn;
  }
  function createHotspots(room, assets) {
    return room.hotspots.map((def) => createHotspot(def, assets, room));
  }

  // src/hit/hover.js
  var HoverTracker = class {
    /** The hotspot under the pointer, or `null`. @type {Hotspot|null} */
    hovered = null;
    constructor(events) {
      this.events = events;
      this.hotspots = [];
    }
    /**
     * Sets the hotspots to look through, usually on a room change. Clears the hover.
     * @param {Hotspot[]} hotspots
     */
    setHotspots(hotspots) {
      this.hotspots = hotspots;
      this.#set(null);
    }
    /**
     * Looks at a point without changing the hover. When hotspots overlap the highest `z` wins, and a later one beats an earlier one.
     * @param {number} x A room x.
     * @param {number} y A room y.
     * @returns {Hotspot|null}
     */
    at(x, y) {
      let best = null;
      for (const h of this.hotspots) {
        if (h.hit(x, y) && (best === null || h.z >= best.z)) best = h;
      }
      return best;
    }
    /**
     * Moves the pointer: finds the hotspot there and sends a `hover` event if it changed.
     * @param {number} x A room x.
     * @param {number} y A room y.
     * @returns {Hotspot|null}
     */
    update(x, y) {
      const hit = this.at(x, y);
      this.#set(hit);
      return hit;
    }
    /**
     * Forgets the hover, for example when the pointer leaves the game.
     */
    clear() {
      this.#set(null);
    }
    #set(hotspot) {
      if (hotspot === this.hovered) return;
      this.hovered = hotspot;
      this.events?.emit("hover", { id: hotspot?.id ?? null, hotspot });
    }
  };

  // src/nav/geometry.js
  var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  var toPoint = ([x, y]) => ({ x, y });
  function polygonArea(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
  }
  function closestPointOnSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return { x: a.x + dx * t, y: a.y + dy * t };
  }
  var cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  function segmentsCross(a, b, c, d) {
    const d1 = cross(a, b, c);
    const d2 = cross(a, b, d);
    const d3 = cross(c, d, a);
    const d4 = cross(c, d, b);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  function leftNormal(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  }
  function vertexBisector(points, i, outward = false) {
    const n = points.length;
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const flip = (polygonArea(points) > 0 ? 1 : -1) * (outward ? -1 : 1);
    const a = leftNormal(prev, cur);
    const b = leftNormal(cur, next);
    let x = (a.x + b.x) * flip;
    let y = (a.y + b.y) * flip;
    let len = Math.hypot(x, y);
    if (len < 1e-9) {
      x = a.x * flip;
      y = a.y * flip;
      len = Math.hypot(x, y);
    }
    return { x: x / len, y: y / len };
  }

  // src/nav/depth.js
  function scaleFromStops(stops, y) {
    if (!stops || stops.length === 0) return 1;
    if (y <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const [y1, s1] = stops[i];
      if (y <= y1) {
        const [y0, s0] = stops[i - 1];
        return y1 === y0 ? s1 : s0 + (s1 - s0) * (y - y0) / (y1 - y0);
      }
    }
    return stops.at(-1)[1];
  }
  function sortByBaseline(items) {
    const key = (item) => item.baseline ?? item.y;
    return items.map((item, i) => [item, i]).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(([item]) => item);
  }

  // src/nav/navigator.js
  var Navigator = class _Navigator {
    #nodes = null;
    #links = null;
    constructor({ areas, obstacles = [], margin = 2, step = 2 }) {
      if (!areas?.length) throw new Error("Navigator needs at least one walkable area");
      this.areas = areas;
      this.obstacles = obstacles;
      this.margin = margin;
      this.step = step;
    }
    /**
     * Makes the navigator of a room from its `walkable` and `obstacles`.
     * @param {Room} room
     * @param {Object} [options] The other options of the constructor.
     * @returns {Navigator}
     */
    static fromRoom(room, options) {
      return new _Navigator({ areas: room.walkable, obstacles: room.obstacles, ...options });
    }
    /**
     * Asks whether a point is on the floor: inside some area and outside every obstacle.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isWalkable(x, y) {
      return this.areas.some((a) => pointInPolygon(a.points, x, y)) && !this.obstacles.some((o) => pointInPolygon(o.points, x, y));
    }
    /**
     * The size of things at a point, from the `scale` stops of the area there. The last area containing the point wins.
     * @param {number} x
     * @param {number} y
     * @returns {number} `1` is full size; `1` outside all areas.
     */
    scaleAt(x, y) {
      const area = this.areas.findLast((a) => pointInPolygon(a.points, x, y));
      return area ? scaleFromStops(area.scale, y) : 1;
    }
    /**
     * Asks whether the straight line between two points is walkable all the way.
     * @param {{x: number, y: number}} a
     * @param {{x: number, y: number}} b
     * @returns {boolean}
     */
    canSee(a, b) {
      const length = dist(a, b);
      const n = Math.ceil(length / this.step);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (!this.isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
      }
      for (const o of this.obstacles) {
        for (let i = 0; i < o.points.length; i++) {
          if (segmentsCross(a, b, toPoint(o.points[i]), toPoint(o.points[(i + 1) % o.points.length]))) return false;
        }
      }
      return true;
    }
    /**
     * The walkable point closest to a point. This is where the hero goes when the player clicks off the floor.
     * @param {{x: number, y: number}} p
     * @returns {{x: number, y: number}|null} `p` itself when it is walkable; `null` when there is none.
     */
    nearestWalkable(p) {
      if (this.isWalkable(p.x, p.y)) return { x: p.x, y: p.y };
      let best = null;
      let bestD = Infinity;
      const consider = (c) => {
        const d = dist(p, c);
        if (d < bestD && this.isWalkable(c.x, c.y)) {
          best = c;
          bestD = d;
        }
      };
      for (const poly of [...this.areas, ...this.obstacles]) {
        const pts = poly.points.map(toPoint);
        for (let i = 0; i < pts.length; i++) {
          const c = closestPointOnSegment(p, pts[i], pts[(i + 1) % pts.length]);
          consider(c);
          const nx = pts[(i + 1) % pts.length].y - pts[i].y;
          const ny = pts[i].x - pts[(i + 1) % pts.length].x;
          const len = Math.hypot(nx, ny) || 1;
          for (const s of [-1, 1]) {
            consider({ x: c.x + s * nx * this.margin * 1.5 / len, y: c.y + s * ny * this.margin * 1.5 / len });
          }
        }
      }
      return best;
    }
    /**
     * The shortest walk between two points. A point off the floor snaps to the nearest walkable point.
     * @param {{x: number, y: number}} from
     * @param {{x: number, y: number}} to
     * @returns {Array<{x: number, y: number}>|null} The waypoints to walk through, not including `from`; `null` when unreachable.
     */
    findPath(from, to) {
      const start = this.nearestWalkable(from);
      const goal = this.nearestWalkable(to);
      if (!start || !goal) return null;
      if (this.canSee(start, goal)) return [goal];
      this.#build();
      const nodes = [...this.#nodes, start, goal];
      const S = nodes.length - 2;
      const G = nodes.length - 1;
      const links = this.#links.map((l) => [...l]);
      links[S] = [];
      links[G] = [];
      for (let i = 0; i < S; i++) {
        for (const end of [S, G]) {
          if (this.canSee(nodes[i], nodes[end])) {
            links[i].push(end);
            links[end].push(i);
          }
        }
      }
      return this.#astar(nodes, links, S, G)?.slice(1) ?? null;
    }
    #build() {
      if (this.#nodes) return;
      const nodes = [];
      const add = (poly, outward) => {
        poly.points.forEach(([x, y], i) => {
          const b = vertexBisector(poly.points, i, outward);
          const node = { x: x + b.x * this.margin, y: y + b.y * this.margin };
          if (this.isWalkable(node.x, node.y)) nodes.push(node);
        });
      };
      for (const a of this.areas) add(a, false);
      for (const o of this.obstacles) add(o, true);
      const links = nodes.map(() => []);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (this.canSee(nodes[i], nodes[j])) {
            links[i].push(j);
            links[j].push(i);
          }
        }
      }
      this.#nodes = nodes;
      this.#links = links;
    }
    #astar(nodes, links, S, G) {
      const g = /* @__PURE__ */ new Map([[S, 0]]);
      const from = /* @__PURE__ */ new Map();
      const open = /* @__PURE__ */ new Map([[S, dist(nodes[S], nodes[G])]]);
      const closed = /* @__PURE__ */ new Set();
      while (open.size) {
        let cur = null;
        for (const [id, f] of open) if (cur === null || f < open.get(cur)) cur = id;
        if (cur === G) {
          const path = [];
          for (let id = G; id !== void 0; id = from.get(id)) path.unshift(nodes[id]);
          return path;
        }
        open.delete(cur);
        closed.add(cur);
        for (const next of links[cur]) {
          if (closed.has(next)) continue;
          const cost = g.get(cur) + dist(nodes[cur], nodes[next]);
          if (cost < (g.get(next) ?? Infinity)) {
            g.set(next, cost);
            from.set(next, cur);
            open.set(next, cost + dist(nodes[next], nodes[G]));
          }
        }
      }
      return null;
    }
  };

  // src/actor/animation.js
  var DIRS4 = ["up", "right", "down", "left"];
  var DIRS8 = ["up", "up_right", "right", "down_right", "down", "down_left", "left", "up_left"];
  function directionFromVector(dx, dy, count = 8) {
    const dirs = count === 4 ? DIRS4 : DIRS8;
    const angle = Math.atan2(dx, -dy);
    const step = Math.PI * 2 / dirs.length;
    return dirs[(Math.round(angle / step) % dirs.length + dirs.length) % dirs.length];
  }
  function mirrorDirection(dir) {
    return dir.replace("left", "\0").replace("right", "left").replace("\0", "right");
  }
  var AnimationState = class {
    /** `'idle'`, `'walk'` or `'talk'`. @type {string} */
    state = "idle";
    /** The direction faced, such as `'down'`. @type {string} */
    dir = "down";
    #elapsed = 0;
    #key = null;
    constructor(animations = {}) {
      this.animations = animations;
    }
    /**
     * Changes the state. The animation restarts when the state is a new one.
     * @param {string} state
     */
    set(state) {
      if (state !== this.state) {
        this.state = state;
        this.#elapsed = 0;
      }
    }
    /**
     * Changes the direction faced.
     * @param {string} dir
     */
    face(dir) {
      this.dir = dir;
    }
    /**
     * Moves the animation forward.
     * @param {number} dt Milliseconds.
     */
    update(dt) {
      const { key } = this.current;
      if (key !== this.#key) {
        this.#key = key;
        this.#elapsed = 0;
      }
      this.#elapsed += dt;
    }
    /**
     * The animation for the state and direction now.
     * @type {{key: string|null, anim: Object|null, flip: boolean}} `key` is `null` when none is defined; `flip` is `true` when the mirror image is used.
     */
    get current() {
      const { state, dir } = this;
      const tries = [[dir, false]];
      if (mirrorDirection(dir) !== dir) tries.push([mirrorDirection(dir), true]);
      if (dir.includes("_")) {
        const [v, h] = dir.split("_");
        tries.push([h, false], [mirrorDirection(h), true], [v, false]);
      }
      tries.push([null, false]);
      for (const [d, flip] of tries) {
        const key = d ? `${state}_${d}` : state;
        if (this.animations[key]) return { key, anim: this.animations[key], flip };
      }
      return { key: null, anim: null, flip: false };
    }
    /**
     * `true` when the picture should be drawn mirrored.
     * @type {boolean}
     */
    get flip() {
      return this.current.flip;
    }
    /**
     * The picture to draw now, or `null` when there is no animation.
     * @type {*}
     */
    get frame() {
      const { anim } = this.current;
      if (!anim?.frames?.length) return null;
      const step = Math.floor(this.#elapsed / (anim.delay ?? 100));
      const n = anim.frames.length;
      return anim.frames[anim.loop === false ? Math.min(step, n - 1) : step % n];
    }
    /**
     * `true` once an animation that does not loop has played to its end.
     * @type {boolean}
     */
    get finished() {
      const { anim } = this.current;
      return anim?.loop === false && this.#elapsed >= anim.frames.length * (anim.delay ?? 100);
    }
  };
  function drawAnimation(p, anim, x, y, scale = 1) {
    const frame = anim.frame;
    if (!frame) return false;
    p.push();
    p.translate(x, y);
    p.scale(anim.flip ? -scale : scale, scale);
    p.image(frame, -frame.width / 2, -frame.height);
    p.pop();
    return true;
  }

  // src/actor/actor.js
  var Actor = class {
    /**
     * What the actor is doing: `'idle'`, `'walk'` or `'talk'`.
     * @type {string}
     */
    mode = "idle";
    /**
     * The line being said, or `null`: `{ key, text, remaining }`.
     * @type {{key: string, text: string, remaining: number}|null}
     */
    speech = null;
    /**
     * How fast lines are read. Above `1` shortens them. The player's text speed setting changes it.
     * @type {number}
     */
    textSpeed = 1;
    /**
     * `true` during a skipped cutscene: walks jump to their end and lines are not shown.
     * @type {boolean}
     */
    skipping = false;
    #path = [];
    #walkDone = null;
    #sayDone = null;
    constructor({ id, x = 0, y = 0, navigator = null, speed = 120, directions = 8, animations = {}, translate = (k) => k }) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.navigator = navigator;
      this.speed = speed;
      this.directions = directions;
      this.translate = translate;
      this.anim = new AnimationState(animations);
    }
    /**
     * How big the actor is where it stands: `1` is full size, smaller further away (set by the walkable area's `scale` stops).
     * @type {number}
     */
    get scale() {
      return this.navigator?.scaleAt(this.x, this.y) ?? 1;
    }
    /**
     * The y position of its feet, which decides who stands in front of whom.
     * @type {number}
     */
    get baseline() {
      return this.y;
    }
    /**
     * The direction it faces: `'up'`, `'right'`, `'down'`, `'left'` (and `'up_right'` and so on with 8 directions).
     * @type {string}
     */
    get dir() {
      return this.anim.dir;
    }
    /**
     * `true` while a `walkTo` is under way.
     * @type {boolean}
     */
    get walking() {
      return this.#walkDone !== null;
    }
    /**
     * Jumps to a place and cancels any walk.
     * @param {number} x
     * @param {number} y
     * @example
     * hero.teleport(50, 300);
     */
    teleport(x, y) {
      this.#endWalk(false);
      this.x = x;
      this.y = y;
    }
    /**
     * Turns to face a direction.
     * @param {string} dir `'up'`, `'right'`, `'down'`, `'left'` (and `'up_right'` and so on with 8 directions).
     * @example
     * hero.face('left');
     */
    face(dir) {
      this.anim.face(dir);
    }
    /**
     * Turns to face a point. Does nothing when already standing on it.
     * @param {number} x
     * @param {number} y
     */
    faceTowards(x, y) {
      if (x === this.x && y === this.y) return;
      this.face(directionFromVector(x - this.x, y - this.y, this.directions));
    }
    /**
     * Walks to a point, around obstacles. A new `walkTo` (or `stop`) interrupts the one before.
     * @param {WalkTarget} target Where to go. `dir` turns the actor that way on arrival.
     * @returns {Promise<boolean>} `true` on arrival, `false` when interrupted or when there is no route.
     * @example
     * const arrived = await hero.walkTo({ x: 400, y: 300, dir: 'up' });
     */
    walkTo(target) {
      this.#endWalk(false);
      const path = this.navigator ? this.navigator.findPath(this, target) : [{ x: target.x, y: target.y }];
      if (!path || path.length === 0) return Promise.resolve(false);
      if (this.skipping) {
        this.#jumpTo(path.at(-1));
        if (target.dir) this.face(target.dir);
        return Promise.resolve(true);
      }
      this.#path = path;
      this.mode = this.speech ? "talk" : "walk";
      return new Promise((resolve) => {
        this.#walkDone = (arrived) => {
          if (arrived && target.dir) this.face(target.dir);
          resolve(arrived);
        };
      });
    }
    /**
     * Shows a line above the actor. A newer line ends the previous one. The default time is
     * about 60 ms per character, at least 1.2 seconds.
     * @param {string} key A text key, translated with the actor's `translate`.
     * @param {Object} [options]
     * @param {number} [options.ms] How long to show it, in milliseconds.
     * @param {boolean} [options.literal=false] `true` shows `key` as it is, with no translation (for text from a dialogue file).
     * @returns {Promise<boolean>} Resolves when the line ends or is skipped.
     * @example
     * await hero.say('door.locked');
     */
    say(key, { ms, literal = false } = {}) {
      this.#endSay();
      if (this.skipping) return Promise.resolve(true);
      const text = literal ? key : this.translate(key);
      this.speech = { key, text, remaining: ms ?? Math.max(1200, text.length * 60) };
      this.mode = "talk";
      return new Promise((resolve) => {
        this.#sayDone = resolve;
      });
    }
    /**
     * Ends the line being said, as if its time had run out.
     */
    skipSpeech() {
      this.#endSay();
    }
    /**
     * Cutscene fast-forward. Turning it on completes the current walk and line; while it is on, walks
     * jump to their end and lines are not shown. {@link Game#cutscene} uses it for Skip.
     * @param {boolean} on
     */
    setSkipping(on) {
      this.skipping = on;
      if (!on) return;
      if (this.#path.length) {
        this.#jumpTo(this.#path.at(-1));
        this.#endWalk(true);
      }
      this.#endSay();
    }
    /**
     * Stops walking and talking. A pending `walkTo` resolves `false`.
     */
    stop() {
      this.#endWalk(false);
      this.#endSay();
    }
    /**
     * Moves the actor along its path and advances its line and animation. A game calls it every frame.
     * @param {number} dt Milliseconds since the last step.
     */
    update(dt) {
      if (this.speech && (this.speech.remaining -= dt * this.textSpeed) <= 0) this.#endSay();
      if (this.#path.length) this.#step(dt);
      this.anim.set(this.speech ? "talk" : this.#path.length ? "walk" : "idle");
      this.anim.update(dt);
    }
    /**
     * What a save keeps: where the actor stands and which way it faces.
     * @returns {{x: number, y: number, dir: string}}
     */
    toJSON() {
      return { x: this.x, y: this.y, dir: this.dir };
    }
    /**
     * Puts the actor back where {@link Actor#toJSON} said.
     * @param {WalkTarget} saved
     */
    fromJSON({ x, y, dir }) {
      this.teleport(x, y);
      if (dir) this.face(dir);
    }
    #jumpTo(point) {
      this.faceTowards(point.x, point.y);
      this.x = point.x;
      this.y = point.y;
    }
    #step(dt) {
      let budget = this.speed * this.scale * dt / 1e3;
      while (budget > 0 && this.#path.length) {
        const next = this.#path[0];
        const d = dist(this, next);
        this.faceTowards(next.x, next.y);
        if (d <= budget) {
          this.x = next.x;
          this.y = next.y;
          budget -= d;
          this.#path.shift();
        } else {
          this.x += (next.x - this.x) / d * budget;
          this.y += (next.y - this.y) / d * budget;
          budget = 0;
        }
      }
      if (!this.#path.length) this.#endWalk(true);
    }
    #endWalk(arrived) {
      this.#path = [];
      const done = this.#walkDone;
      this.#walkDone = null;
      if (!this.speech) this.mode = "idle";
      done?.(arrived);
    }
    #endSay() {
      const done = this.#sayDone;
      this.#sayDone = null;
      this.speech = null;
      this.mode = this.#path.length ? "walk" : "idle";
      done?.(true);
    }
  };

  // src/actor/sheet.js
  function spriteFrames(sheet, frameWidth, frameHeight, { count } = {}) {
    if (!(frameWidth > 0) || !(frameHeight > 0)) throw new RangeError(`spriteFrames needs a frame size above 0, got ${frameWidth} x ${frameHeight}`);
    const columns = Math.floor(sheet.width / frameWidth);
    const rows = Math.floor(sheet.height / frameHeight);
    const total = Math.min(count ?? columns * rows, columns * rows);
    const frames = [];
    for (let i = 0; i < total; i++) {
      frames.push(sheet.get(i % columns * frameWidth, Math.floor(i / columns) * frameHeight, frameWidth, frameHeight));
    }
    return frames;
  }

  // src/interact/inventory.js
  var Inventory = class {
    constructor({ state, events, items = {}, recipes = [] }) {
      this.state = state;
      this.events = events;
      this.items = items;
      this.recipes = recipes;
    }
    /**
     * The ids of the items carried, in the order they were picked up.
     * @type {string[]}
     */
    get list() {
      return this.state.get("inventory", []);
    }
    /**
     * Asks whether an item is carried.
     * @param {string} id
     * @returns {boolean}
     */
    has(id) {
      return this.list.includes(id);
    }
    /**
     * The definition of an item.
     * @param {string} id
     * @returns {{name: string}}
     * @throws {Error} For an id that is not in `items`.
     */
    define(id) {
      if (!(id in this.items)) throw new Error(`unknown item "${id}"`);
      return this.items[id];
    }
    /**
     * Puts an item in the inventory.
     * @param {string} id An id from `items`.
     * @returns {boolean} `true`, or `false` when it was already carried.
     * @example
     * inventory.give('stick');
     */
    give(id) {
      this.define(id);
      if (this.has(id)) return false;
      this.state.set("inventory", [...this.list, id]);
      this.events?.emit("inventory:add", { id });
      return true;
    }
    /**
     * Takes an item out of the inventory.
     * @param {string} id
     * @returns {boolean} `true`, or `false` when it was not carried.
     */
    remove(id) {
      if (!this.has(id)) return false;
      this.state.set("inventory", this.list.filter((i) => i !== id));
      this.events?.emit("inventory:remove", { id });
      return true;
    }
    /**
     * Looks up the recipe for two items, in either order. Does not check what is carried.
     * @param {string} a
     * @param {string} b
     * @returns {Object|null} The recipe, or `null` when the two do not combine.
     */
    recipeFor(a, b) {
      return this.recipes.find((r) => r.a === a && r.b === b || r.a === b && r.b === a) ?? null;
    }
    /**
     * Combines two carried items: removes the ingredients the recipe uses up and gives the result.
     * @param {string} a
     * @param {string} b
     * @returns {Object|null} The recipe used, or `null` when there is none or either item is not carried.
     * @example
     * inventory.combine('stick', 'string'); // now carrying 'pole'
     */
    combine(a, b) {
      if (a === b || !this.has(a) || !this.has(b)) return null;
      const recipe = this.recipeFor(a, b);
      if (!recipe) return null;
      const used = { [recipe.a]: "a", [recipe.b]: "b" };
      const consume = recipe.consume ?? ["a", "b"];
      for (const id of [a, b]) if (consume.includes(used[id])) this.remove(id);
      this.give(recipe.result);
      return recipe;
    }
  };

  // src/interact/interactor.js
  var Interactor = class {
    /**
     * The inventory item being held (clicked in the bar), or `null`.
     * @type {string|null}
     */
    held = null;
    /**
     * In `'verbs'` mode, the verb the next click uses: `'interact'`, `'look'`, `'use'` or `'walk'`. Set it from your own buttons.
     * @type {string}
     */
    verb = "interact";
    /**
     * What is happening: `'idle'`, `'walk'` (walking to a hotspot) or `'act'` (a handler is running).
     * @type {string}
     */
    phase = "idle";
    /**
     * Called with the error when a handler throws. Default: `console.error`.
     * @type {function(Error): void}
     */
    onError = (err) => console.error(err);
    #token = 0;
    constructor({ hero, state, events, inventory, hover, cutscenes = null, dialogue = null, audio = null, mode = "smart", defaults = {} }) {
      this.hero = hero;
      this.state = state;
      this.events = events;
      this.inventory = inventory;
      this.hover = hover;
      this.cutscenes = cutscenes;
      this.dialogue = dialogue;
      this.audio = audio;
      this.mode = mode;
      this.defaults = {
        interact: "default.interact",
        look: "default.look",
        use: "default.use",
        combine: "default.combine",
        ...defaults
      };
      this.handlers = /* @__PURE__ */ new Map();
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
      return this.phase === "act" || this.locked;
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
      this.events?.emit("inventory:select", { id: item });
    }
    // ---- entry points used by the pointer controller (all return promises) ----
    /**
     * A click on a hotspot: walks to its `walkTo`, then runs `onInteract` (or `onUse` when an item is held).
     * @param {Hotspot} hotspot
     * @returns {Promise<boolean>} `false` when input is being ignored.
     */
    clickHotspot(hotspot) {
      if (this.busy) return Promise.resolve(false);
      if (this.mode === "verbs") {
        if (this.verb === "walk" && hotspot.walkTo) return this.clickGround(hotspot.walkTo);
        if (this.verb === "look") return this.lookHotspot(hotspot);
        if (this.verb === "use" && !this.held) return this.#say("use");
      }
      return this.#onHotspot(hotspot, this.held ? "use" : "interact", this.held);
    }
    /**
     * A right-click or long press on a hotspot: walks to it and runs `onLook`.
     * @param {Hotspot} hotspot
     * @returns {Promise<boolean>}
     */
    lookHotspot(hotspot) {
      return this.#onHotspot(hotspot, "look", null);
    }
    /**
     * A click on an item in the bar: holds it; or, while another item is held, tries to combine the two.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    clickItem(id) {
      if (this.busy) return Promise.resolve(false);
      if (this.mode === "verbs" && this.verb === "look") return this.lookItem(id);
      if (this.held === null) {
        this.select(id);
        return Promise.resolve(true);
      }
      if (this.held === id) {
        this.select(null);
        return Promise.resolve(true);
      }
      return this.#combine(this.held, id);
    }
    /**
     * A right-click or long press on an item in the bar: runs its `onLook`.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    lookItem(id) {
      if (this.busy) return Promise.resolve(false);
      return this.#perform(null, "look", { id, hotspot: null, itemUsed: null }, "item");
    }
    /**
     * A click on the floor: the hero walks there.
     * @param {{x: number, y: number}} point
     * @returns {Promise<boolean>} `true` on arrival.
     */
    async clickGround(point) {
      if (this.busy) return false;
      const token = ++this.#token;
      this.phase = "walk";
      try {
        return await this.hero.walkTo(point);
      } finally {
        if (token === this.#token) this.phase = "idle";
      }
    }
    // ---- internals ----
    #onHotspot(hotspot, verb, item) {
      if (this.busy) return Promise.resolve(false);
      return this.#perform(hotspot.walkTo ?? null, verb, { id: hotspot.id, hotspot, item: null, itemUsed: item }, "hotspot");
    }
    async #perform(walkTo, verb, target, kind) {
      const token = ++this.#token;
      try {
        if (walkTo) {
          this.phase = "walk";
          const arrived = await this.hero.walkTo(walkTo);
          if (!arrived || token !== this.#token) return false;
        }
        this.phase = "act";
        const ctx = this.context(target, verb);
        const handler = this.handlers.get(target.id)?.[{ interact: "onInteract", look: "onLook", use: "onUse" }[verb]];
        const handled = handler ? await handler(ctx) !== false : false;
        if (!handled) await this.#say(verb);
        this.events?.emit("action", { verb, id: target.id, kind, item: target.itemUsed, handled });
        if (this.held && !this.inventory.has(this.held)) this.select(null);
        return handled;
      } catch (err) {
        this.onError(err);
        return false;
      } finally {
        if (token === this.#token) this.phase = "idle";
      }
    }
    async #combine(a, b) {
      const token = ++this.#token;
      this.phase = "act";
      try {
        const recipe = this.inventory.combine(a, b);
        this.select(null);
        await this.#say(recipe ? recipe.say : "combine", Boolean(recipe));
        this.events?.emit("action", { verb: "combine", id: b, kind: "item", item: a, handled: Boolean(recipe) });
        return Boolean(recipe);
      } catch (err) {
        this.onError(err);
        return false;
      } finally {
        if (token === this.#token) this.phase = "idle";
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
        setEnabled: (hotspotId, enabled) => this.setHotspotEnabled(hotspotId, enabled)
      };
    }
    /**
     * Switches a hotspot on or off. A hotspot that is off cannot be clicked and is not drawn. The
     * choice is saved with the game (`ctx.setEnabled` calls this).
     * @param {string} hotspotId
     * @param {boolean} enabled
     * @param {string} [roomId] Default: the current room.
     */
    setHotspotEnabled(hotspotId, enabled, roomId = this.state.get("currentRoom")) {
      this.state.set(`rooms.${roomId}.hotspots.${hotspotId}.enabled`, enabled);
      const live = this.hover?.hotspots.find((h) => h.id === hotspotId);
      if (live) live.enabled = enabled;
    }
  };
  function applyHotspotState(state, roomId, hotspots) {
    for (const h of hotspots) {
      h.enabled = state.get(`rooms.${roomId}.hotspots.${h.id}.enabled`, true);
    }
  }

  // src/interact/pointer-controller.js
  var PointerController = class {
    /**
     * Touch: the hotspot waiting for its second tap.
     * @type {Hotspot|null}
     */
    highlighted = null;
    // touch: hotspot waiting for its second tap
    /**
     * The inventory item under the pointer.
     * @type {string|null}
     */
    hoveredItem = null;
    /**
     * The last screen position, for drawing the label.
     * @type {{x: number, y: number}|null}
     */
    pointer = null;
    // last screen position, for drawing the label
    #press = null;
    #timer = null;
    constructor({ interactor, hover, camera, bar, scheduler, longPressMs = 500, moveTolerance = 12 }) {
      Object.assign(this, { interactor, hover, camera, bar, scheduler, longPressMs, moveTolerance });
      this.onError = (err) => console.error(err);
    }
    /**
     * The pointer moved.
     * @param {{x: number, y: number}} position In screen (logical canvas) coordinates.
     */
    move({ x, y }) {
      this.pointer = { x, y };
      if (this.#press && Math.hypot(x - this.#press.x, y - this.#press.y) > this.moveTolerance) this.#cancelPress();
      if (this.#press?.pointerType === "touch") return;
      this.#updateHover(x, y);
    }
    /**
     * The pointer left the game.
     */
    leave() {
      this.pointer = null;
      this.hoveredItem = null;
      this.#cancelPress();
      this.hover.clear();
    }
    /**
     * A press began.
     * @param {Object} event
     * @param {number} event.x
     * @param {number} event.y
     * @param {string} [event.pointerType='mouse'] `'mouse'`, `'touch'` or `'pen'`.
     * @param {number} [event.button=0] `2` is a right-click, which looks.
     */
    down({ x, y, pointerType = "mouse", button = 0 }) {
      this.pointer = { x, y };
      this.#cancelPress();
      if (this.interactor.locked) return;
      if (button === 2) {
        this.#run(this.#look(x, y));
        return;
      }
      this.#press = { x, y, pointerType, consumed: false };
      const press = this.#press;
      this.#timer = this.scheduler.after(this.longPressMs, () => {
        press.consumed = true;
        this.#run(this.#look(x, y));
      });
    }
    /**
     * The press ended; a short press is a click or tap.
     * @param {{x: number, y: number}} [position]
     */
    up({ x, y } = this.#press ?? {}) {
      const press = this.#press;
      if (!press) return;
      this.#cancelPress();
      if (press.consumed) return;
      this.#run(this.#tap(x ?? press.x, y ?? press.y, press.pointerType));
    }
    /**
     * Cancels a pending press, for example when a cutscene starts.
     */
    cancel() {
      this.#cancelPress();
      this.highlighted = null;
    }
    // ---- internals ----
    #cancelPress() {
      this.#timer?.cancel();
      this.#timer = null;
      this.#press = null;
    }
    #run(promise) {
      promise?.catch?.((err) => this.onError(err));
    }
    #worldAt(x, y) {
      return this.camera.screenToWorld(x, y);
    }
    #updateHover(x, y) {
      const item = this.bar.contains(x, y) ? this.bar.itemAt(x, y, this.interactor.inventory.list) : null;
      this.hoveredItem = item;
      if (this.bar.contains(x, y)) {
        this.hover.clear();
        return;
      }
      const w = this.#worldAt(x, y);
      this.hover.update(w.x, w.y);
    }
    #look(x, y) {
      if (this.bar.contains(x, y)) {
        const item = this.bar.itemAt(x, y, this.interactor.inventory.list);
        return item ? this.interactor.lookItem(item) : null;
      }
      const world = this.#worldAt(x, y);
      const hit = this.hover.update(world.x, world.y);
      return hit ? this.interactor.lookHotspot(hit) : null;
    }
    #tap(x, y, pointerType) {
      if (this.bar.contains(x, y)) {
        this.highlighted = null;
        const item = this.bar.itemAt(x, y, this.interactor.inventory.list);
        return item ? this.interactor.clickItem(item) : null;
      }
      const world = this.#worldAt(x, y);
      const hit = this.hover.update(world.x, world.y);
      if (!hit) {
        this.highlighted = null;
        return this.interactor.clickGround(world);
      }
      if (pointerType === "touch" && this.highlighted !== hit) {
        this.highlighted = hit;
        return null;
      }
      this.highlighted = null;
      return this.interactor.clickHotspot(hit);
    }
  };

  // src/interact/label.js
  function hoverLabel({ hotspot = null, item = null, held = null, inventory, mode = "smart", verb = "interact", t }) {
    const itemName = (id) => t(inventory.define(id).name);
    if (item) {
      if (held && held !== item) return t("ui.use_on", { item: itemName(held), target: itemName(item) });
      return itemName(item);
    }
    if (!hotspot) return held ? t("ui.use_item", { item: itemName(held) }) : "";
    const name = t(hotspot.name);
    if (held) return t("ui.use_on", { item: itemName(held), target: name });
    return mode === "verbs" ? `${t(`verb.${verb}`)} ${name}` : name;
  }

  // src/interact/strings.js
  var defaultStrings = {
    "default.interact": "That won't do anything.",
    "default.look": "Nothing special.",
    "default.use": "I can't use that.",
    "default.combine": "Those don't go together.",
    "ui.use_on": "Use {item} with {target}",
    "ui.use_item": "Use {item} with...",
    "verb.interact": "Use",
    "verb.look": "Look at",
    "verb.use": "Use",
    "verb.walk": "Walk to"
  };

  // src/script/cutscene.js
  var Cutscenes = class {
    /** `true` while a cutscene is running. @type {boolean} */
    active = false;
    /** `true` once the running (or last) cutscene was skipped. @type {boolean} */
    skipped = false;
    /** `false` for a cutscene that cannot be skipped. @type {boolean} */
    skippable = true;
    #depth = 0;
    #skipTarget = null;
    #fastForward = false;
    constructor({ events, scheduler, targets = [] }) {
      this.events = events;
      this.scheduler = scheduler;
      this.targets = [...targets];
      if (scheduler && !this.targets.includes(scheduler)) this.targets.push(scheduler);
    }
    /**
     * Adds things that should fast-forward when a cutscene is skipped, such as another actor.
     * @param {...Object} targets Objects with `setSkipping(bool)`.
     */
    add(...targets) {
      for (const t of targets) if (!this.targets.includes(t)) this.targets.push(t);
    }
    /**
     * `true` while fast-forwarding.
     * @type {boolean}
     */
    get skipping() {
      return this.#fastForward;
    }
    /**
     * Runs a cutscene. A cutscene started inside another one just runs inline.
     * @param {function({label: function(string): void, wait: function(number): Promise<void>, skipped: boolean, skipping: function(): boolean}): Promise<*>} script
     * It receives `cs`: `cs.label(name)` marks a place to skip to, `cs.wait(ms)` waits in game time, and `cs.skipped` tells whether the player skipped.
     * @param {Object} [options]
     * @param {boolean} [options.skippable=true] `false` hides the Skip button.
     * @returns {Promise<*>} The script's result.
     */
    async run(script, { skippable = true } = {}) {
      if (this.#depth > 0) return script(this.#api());
      this.#depth++;
      this.active = true;
      this.skipped = false;
      this.skippable = skippable;
      this.#skipTarget = null;
      for (const t of this.targets) t.stop?.();
      this.events?.emit("cutscene:start");
      try {
        return await script(this.#api());
      } finally {
        this.#depth--;
        this.#setSkipping(false);
        this.active = false;
        this.events?.emit("cutscene:end", { skipped: this.skipped });
      }
    }
    /**
     * Skips the running cutscene: the Skip button and Escape call this.
     * @param {string} [toLabel] Skip only as far as `cs.label(toLabel)`, then play normally.
     * @returns {boolean} `false` when there is nothing to skip.
     */
    skip(toLabel = null) {
      if (!this.active || !this.skippable) return false;
      this.skipped = true;
      this.#skipTarget = toLabel;
      this.#setSkipping(true);
      return true;
    }
    /**
     * Marks a point in the script: fast-forward aimed at this label stops here.
     * @param {string} name
     */
    label(name) {
      if (this.#fastForward && this.#skipTarget === name) {
        this.#skipTarget = null;
        this.#setSkipping(false);
      }
    }
    #setSkipping(on) {
      this.#fastForward = on;
      for (const t of this.targets) t.setSkipping?.(on);
    }
    #api() {
      const self = this;
      return {
        label: (name) => this.label(name),
        wait: (ms) => this.scheduler.wait(ms),
        get skipped() {
          return self.skipped;
        },
        skipping: () => this.#fastForward
      };
    }
  };

  // src/script/scripts.js
  var Scripts = class {
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
  };

  // src/script/helpers.js
  async function once(ctx, key, fn) {
    const path = `flags.once.${ctx.id}.${String(key).replaceAll(".", "_")}`;
    if (ctx.state.get(path, false)) return false;
    ctx.state.set(path, true);
    await fn(ctx);
    return true;
  }
  var firstLook = (ctx, fn) => once(ctx, "look", fn);
  var firstInteract = (ctx, fn) => once(ctx, "interact", fn);
  var firstUse = (ctx, fn) => once(ctx, `use:${ctx.item}`, fn);

  // src/dialogue/common.js
  function splitSpeaker(line) {
    const m = /^([A-Za-z][\w .'-]{0,29}):\s+(.*)$/s.exec(line);
    return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line };
  }
  function parseTags(list) {
    const tags = {};
    for (const raw of list) {
      const i = raw.indexOf(":");
      if (i === -1) tags[raw.trim()] = true;
      else tags[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
    }
    return tags;
  }
  function createVars(state = null, initial2 = {}) {
    if (!state) return { ...initial2 };
    for (const [k, v] of Object.entries(initial2)) if (state.get(`vars.${k}`) === void 0) state.set(`vars.${k}`, v);
    return new Proxy({}, {
      get: (_, k) => typeof k === "string" ? state.get(`vars.${k}`) : void 0,
      set: (_, k, v) => {
        state.set(`vars.${k}`, v);
        return true;
      },
      has: (_, k) => state.get(`vars.${String(k)}`) !== void 0
    });
  }
  function parseValue(text) {
    const t = text.trim();
    if (t === "true") return true;
    if (t === "false") return false;
    if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
    const q = /^(["'])(.*)\1$/s.exec(t);
    return q ? q[2] : t;
  }
  function applySet(vars, { name, op, value }) {
    const cur = vars[name];
    if (op === "+=") vars[name] = (cur ?? 0) + value;
    else if (op === "-=") vars[name] = (cur ?? 0) - value;
    else vars[name] = value;
  }
  var COMPARE = {
    "==": (a, b) => a === b,
    "!=": (a, b) => a !== b,
    "<": (a, b) => a < b,
    ">": (a, b) => a > b,
    "<=": (a, b) => a <= b,
    ">=": (a, b) => a >= b
  };
  function evalCondition(cond, vars) {
    if (!cond) return true;
    const v = vars[cond.name];
    const result = cond.op ? Boolean(COMPARE[cond.op](v, cond.value)) : Boolean(v);
    return cond.negate ? !result : result;
  }
  function parseCondition(text) {
    const m = /^\s*(!)?\s*(\w+)\s*(?:(==|!=|<=|>=|<|>)\s*(.+?))?\s*$/.exec(text);
    if (!m) throw new Error(`bad condition "{${text}}"`);
    return { negate: Boolean(m[1]), name: m[2], op: m[3] ?? null, value: m[4] === void 0 ? void 0 : parseValue(m[4]) };
  }
  function interpolate(text, vars, pattern) {
    return text.replace(pattern, (whole, name) => vars[name] === void 0 ? whole : String(vars[name]));
  }

  // src/dialogue/graph.js
  var GraphRunner = class {
    #section = null;
    #index = 0;
    #options = [];
    #done = false;
    constructor(program, { vars, placeholder }) {
      this.program = program;
      this.vars = vars;
      this.placeholder = placeholder;
      this.#enter(program.start);
    }
    /**
     * `true` once nothing more can happen. Like Ink, this is known as soon as the last line has been returned.
     * @type {boolean}
     */
    get done() {
      this.#peekEnd();
      return this.#done;
    }
    /**
     * The next line.
     * @returns {DialogueLine|null} `null` when the runner is waiting for a choice or has finished.
     */
    next() {
      for (let guard = 0; guard < 1e4; guard++) {
        if (this.#done || this.#options.length) return null;
        const { statements, end } = this.#section;
        if (this.#index < statements.length) {
          const s = statements[this.#index++];
          if (s.type === "set") {
            applySet(this.vars, s);
            continue;
          }
          if (!evalCondition(s.cond, this.vars)) continue;
          return { speaker: s.speaker, text: interpolate(s.text, this.vars, this.placeholder), tags: { ...s.tags } };
        }
        if (end?.type === "goto") this.#enter(end.target);
        else this.#peekEnd();
        if (!end || end.type === "choices") return null;
      }
      throw new Error("conversation loops without showing anything");
    }
    // When every statement of the section has run, settle how it ends. This has no
    // side effects, so choices (and done) can be read right after the last line.
    #peekEnd() {
      if (this.#done || this.#options.length || this.#index < this.#section.statements.length) return;
      const { end } = this.#section;
      if (end === null || end.type === "goto" && end.target === "END") this.#done = true;
      else if (end.type === "choices") {
        this.#options = end.options.filter((o) => evalCondition(o.cond, this.vars));
        if (!this.#options.length) this.#done = true;
      }
    }
    /**
     * The options to choose from.
     * @returns {Array<{index: number, text: string}>} Empty when not waiting for a choice.
     */
    choices() {
      this.#peekEnd();
      return this.#options.map((o, index) => ({ index, text: interpolate(o.text, this.vars, this.placeholder) }));
    }
    /**
     * Picks an option. Call `next()` again afterwards.
     * @param {number} i The `index` of the option.
     * @throws {RangeError} For an index that is not offered.
     */
    choose(i) {
      const option = this.#options[i];
      if (!option) throw new RangeError(`no choice ${i}`);
      this.#options = [];
      this.#enter(option.target);
    }
    #enter(target) {
      if (target === "END") {
        this.#done = true;
        return;
      }
      this.#section = this.program.sections.get(target);
      this.#index = 0;
    }
  };
  function checkTargets(program, describe = (n) => `section "${n}"`) {
    const known = (t) => t === "END" || program.sections.has(t);
    if (!known(program.start)) throw new Error(`start ${describe(program.start)} does not exist`);
    for (const [name, { end }] of program.sections) {
      const targets = end?.type === "goto" ? [end.target] : end?.type === "choices" ? end.options.map((o) => o.target) : [];
      for (const t of targets) if (!known(t)) throw new Error(`${describe(name)} leads to missing ${describe(t)}`);
    }
  }

  // src/dialogue/markdown.js
  function parseMarkdown(source) {
    const sections = /* @__PURE__ */ new Map();
    let current = null;
    let start = null;
    const open = (name, lineNo) => {
      if (sections.has(name)) throw new Error(`line ${lineNo}: duplicate section "${name}"`);
      current = { statements: [], end: null };
      sections.set(name, current);
      start ??= name;
    };
    source.replaceAll("\r", "").split("\n").forEach((raw, i) => {
      const lineNo = i + 1;
      const line = raw.trim();
      if (line === "" || line.startsWith("//")) return;
      const fail = (msg) => {
        throw new Error(`line ${lineNo}: ${msg}`);
      };
      const header = /^#\s*([\w-]+)$/.exec(line);
      if (header) {
        open(header[1], lineNo);
        return;
      }
      if (!current) open("start", lineNo);
      const isChoice = line.startsWith("*");
      if (current.end && !(isChoice && current.end.type === "choices")) fail("nothing can follow choices or a jump in the same section");
      if (line.startsWith("->")) {
        const target = line.slice(2).trim();
        if (!/^[\w-]+$/.test(target)) fail(`bad jump "${line}"`);
        current.end = { type: "goto", target };
      } else if (isChoice) {
        const m = /^\*\s*(?:\{([^}]*)\}\s*)?(.*?)\s*->\s*([\w-]+)$/.exec(line);
        if (!m) fail(`a choice needs "-> section": "${line}"`);
        let cond;
        try {
          cond = m[1] === void 0 ? void 0 : parseCondition(m[1]);
        } catch (e) {
          fail(e.message);
        }
        const option = { text: m[2], target: m[3], cond };
        if (current.end) current.end.options.push(option);
        else current.end = { type: "choices", options: [option] };
      } else if (line.startsWith("~")) {
        const m = /^~\s*(\w+)\s*(=|\+=|-=)\s*(.+)$/.exec(line);
        if (!m) fail(`bad assignment "${line}"`);
        current.statements.push({ type: "set", name: m[1], op: m[2], value: parseValue(m[3]) });
      } else {
        let body = line;
        let cond;
        const c = /^\{([^}]*)\}\s+(.*)$/.exec(body);
        if (c) {
          try {
            cond = parseCondition(c[1]);
          } catch (e) {
            fail(e.message);
          }
          body = c[2];
        }
        const tagged = /^(.*?)\s+#\s*(\S.*)$/.exec(body);
        const tags = tagged ? parseTags(tagged[2].split(/\s+#\s*/)) : {};
        const { speaker, text } = splitSpeaker(tagged ? tagged[1] : body);
        current.statements.push({ type: "line", cond, speaker, text, tags });
      }
    });
    if (start === null) throw new Error("the conversation is empty");
    const program = { start, sections };
    checkTargets(program);
    return program;
  }
  function createMarkdownRunner(source, { state = null, vars = {}, start } = {}) {
    const program = parseMarkdown(source);
    if (start) {
      if (!program.sections.has(start)) throw new Error(`no section "${start}"`);
      program.start = start;
    }
    return new GraphRunner(program, { vars: createVars(state, vars), placeholder: /\{(\w+)\}/g });
  }

  // src/dialogue/twine.js
  var SPECIAL = /* @__PURE__ */ new Set(["StoryTitle", "StoryData", "StoryInit"]);
  function parseTwee(source) {
    const passages = [];
    let current = null;
    let data = {};
    for (const raw of source.replaceAll("\r", "").split("\n")) {
      const header = raw.startsWith("::") && /^::\s*([^[{]*?)\s*(?:\[([^\]]*)\])?\s*(?:\{.*\})?\s*$/.exec(raw);
      if (header) {
        current = { name: header[1], tags: (header[2] ?? "").split(/\s+/).filter(Boolean), text: [] };
        passages.push(current);
      } else if (current) current.text.push(raw);
    }
    for (const p of passages) p.text = p.text.join("\n").trim();
    const storyData = passages.find((p) => p.name === "StoryData");
    if (storyData) {
      try {
        data = JSON.parse(storyData.text);
      } catch {
        throw new Error("StoryData is not valid JSON");
      }
    }
    return { passages: passages.filter((p) => !SPECIAL.has(p.name)), start: data.start };
  }
  function parseTwison(json) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    if (!Array.isArray(data?.passages)) throw new Error("Twison needs a passages array");
    const passages = data.passages.map((p) => ({ name: p.name, tags: p.tags ?? [], text: String(p.text ?? ""), pid: String(p.pid) }));
    const startPassage = passages.find((p) => p.pid === String(data.startnode));
    return { passages, start: startPassage?.name };
  }
  function parseLink(inner) {
    let m;
    if (m = /^(.*)->(.*)$/s.exec(inner)) return { text: m[1].trim(), target: m[2].trim() };
    if (m = /^(.*?)<-(.*)$/s.exec(inner)) return { text: m[2].trim(), target: m[1].trim() };
    if (m = /^(.*)\|(.*)$/s.exec(inner)) return { text: m[1].trim(), target: m[2].trim() };
    return { text: inner.trim(), target: inner.trim() };
  }
  function compilePassage(passage) {
    const statements = [];
    const options = [];
    for (const raw of passage.text.split("\n")) {
      let line = raw.replace(/\[\[(.+?)\]\]/g, (_, inner) => {
        options.push(parseLink(inner));
        return "";
      });
      const sets = [];
      line = line.replace(/<<\s*(\w+)\b([^>]*)>>/g, (whole, macro, args) => {
        if (macro.toLowerCase() !== "set") throw new Error(`passage "${passage.name}": unsupported macro <<${macro}>> (only <<set>> is supported)`);
        const m = /^\s*\$(\w+)\s*(to|=|\+=|-=)\s*(.+?)\s*$/i.exec(args);
        if (!m) throw new Error(`passage "${passage.name}": cannot read ${whole}`);
        sets.push({ type: "set", name: m[1], op: m[2].toLowerCase() === "to" ? "=" : m[2], value: parseValue(m[3]) });
        return "";
      });
      line = line.trim();
      if (line) statements.push({ type: "line", ...splitSpeaker(line), tags: {} });
      statements.push(...sets);
    }
    return { statements, end: options.length ? { type: "choices", options } : null };
  }
  function compileTwine({ passages, start }) {
    const sections = /* @__PURE__ */ new Map();
    for (const p of passages) {
      if (sections.has(p.name)) throw new Error(`duplicate passage "${p.name}"`);
      sections.set(p.name, compilePassage(p));
    }
    const first = start ?? (sections.has("Start") ? "Start" : passages[0]?.name);
    if (first === void 0) throw new Error("the story has no passages");
    const program = { start: first, sections };
    checkTargets(program, (n) => `passage "${n}"`);
    return program;
  }
  function createTwineRunner(source, { state = null, vars = {} } = {}) {
    const isTwee = typeof source === "string" && !source.trimStart().startsWith("{");
    const parsed = isTwee ? parseTwee(source) : parseTwison(source);
    return new GraphRunner(compileTwine(parsed), { vars: createVars(state, vars), placeholder: /\$(\w+)/g });
  }

  // src/dialogue/ink.js
  var attached = /* @__PURE__ */ new WeakMap();
  function createInkRunner(story, { state = null, sync = [], externals = {}, reset = true } = {}) {
    attached.get(story)?.dispose();
    if (reset) story.ResetState();
    const cleanups = [];
    for (const [name, fn] of Object.entries(externals)) {
      try {
        story.UnbindExternalFunction(name);
      } catch {
      }
      story.BindExternalFunction(name, fn);
      cleanups.push(() => {
        try {
          story.UnbindExternalFunction(name);
        } catch {
        }
      });
    }
    const ink = story.variablesState;
    if (state) {
      for (const name of sync) {
        const saved = state.get(`vars.${name}`);
        if (saved !== void 0) ink[name] = saved;
        else state.set(`vars.${name}`, ink[name]);
        const observer = (_, value) => {
          if (state.get(`vars.${name}`) !== value) state.set(`vars.${name}`, value);
        };
        story.ObserveVariable(name, observer);
        cleanups.push(() => story.RemoveVariableObserver(observer, name));
        cleanups.push(state.watch(`vars.${name}`, (value) => {
          if (value !== void 0 && ink[name] !== value) ink[name] = value;
        }));
      }
    }
    const vars = new Proxy({}, {
      get: (_, k) => typeof k === "string" ? ink[k] : void 0,
      set: (_, k, v) => {
        ink[k] = v;
        return true;
      },
      has: (_, k) => ink[String(k)] !== void 0
    });
    const runner = {
      vars,
      story,
      // Detach from the story and the state store. Called automatically when a newer
      // runner is created for the same story.
      dispose() {
        for (const undo of cleanups.splice(0)) undo();
        if (attached.get(story) === runner) attached.delete(story);
      },
      get done() {
        return !story.canContinue && story.currentChoices.length === 0;
      },
      next() {
        while (story.canContinue) {
          const text = story.Continue().trim();
          const tags = parseTags(story.currentTags ?? []);
          if (!text && Object.keys(tags).length === 0) continue;
          let speaker = tags.speaker ?? null;
          delete tags.speaker;
          let body = text;
          if (speaker === null) ({ speaker, text: body } = splitSpeaker(text));
          return { speaker, text: body, tags };
        }
        return null;
      },
      choices() {
        return story.currentChoices.map((c) => ({ index: c.index, text: c.text }));
      },
      choose(i) {
        if (!Number.isInteger(i) || i < 0 || i >= story.currentChoices.length) throw new RangeError(`no choice ${i}`);
        story.ChooseChoiceIndex(i);
      }
    };
    attached.set(story, runner);
    return runner;
  }
  function inkExternals({ inventory, state }) {
    return {
      giveItem: (id) => {
        inventory.give(id);
      },
      setFlag: (name) => {
        state.set(`flags.${name}`, true);
      }
    };
  }

  // src/dialogue/session.js
  var DialogueSession = class {
    /** `true` while a conversation is playing. @type {boolean} */
    active = false;
    constructor({ events, subtitles, menu }) {
      this.events = events;
      this.subtitles = subtitles;
      this.menu = menu;
    }
    /**
     * Plays a conversation from its first line to its end.
     * @param {DialogueRunner} runner
     * @param {Object} [options]
     * @param {AbortSignal} [options.signal] Cuts the conversation short; `play` then rejects with the signal's reason.
     * @returns {Promise<DialogueRunner>} The runner, so you can read its `vars` afterwards.
     * @throws {Error} When a conversation is already running.
     */
    async play(runner, { signal } = {}) {
      if (this.active) throw new Error("a conversation is already running");
      this.active = true;
      this.events?.emit("dialogue:start");
      try {
        for (; ; ) {
          const line = runner.next();
          if (line) {
            for (const [key, value] of Object.entries(line.tags ?? {})) this.events?.emit("dialogue:tag", { key, value, line });
            if (line.text) {
              this.events?.emit("dialogue:line", line);
              await this.subtitles.show(line, signal);
            }
            continue;
          }
          const choices = runner.choices();
          if (choices.length === 0) break;
          const index = await this.menu.ask(choices, signal);
          this.events?.emit("dialogue:choose", { index, text: choices.find((c) => c.index === index)?.text });
          runner.choose(index);
        }
      } finally {
        this.subtitles.hide();
        this.menu.close();
        this.active = false;
        this.events?.emit("dialogue:end");
      }
      return runner;
    }
  };

  // src/ui/scaling.js
  function fitLetterbox(containerWidth, containerHeight, logicalWidth, logicalHeight, { integer = false, maxScale = Infinity } = {}) {
    if (!(containerWidth > 0) || !(containerHeight > 0)) {
      return { scale: 0, width: 0, height: 0, offsetX: 0, offsetY: 0 };
    }
    let scale = Math.min(containerWidth / logicalWidth, containerHeight / logicalHeight, maxScale);
    if (integer && scale >= 1) scale = Math.floor(scale);
    const width = logicalWidth * scale;
    const height = logicalHeight * scale;
    return { scale, width, height, offsetX: (containerWidth - width) / 2, offsetY: (containerHeight - height) / 2 };
  }
  var LetterboxScaler = class {
    /** The latest layout: `{ scale, width, height, offsetX, offsetY }`. @type {Object|null} */
    layout = null;
    #observer = null;
    #onWindowResize = () => this.update();
    constructor({ canvas, container, width, height, integer = false, maxScale = Infinity, onResize = null }) {
      Object.assign(this, { canvas, container, width, height, integer, maxScale, onResize });
    }
    /**
     * Measures the container, then sizes and positions the canvas.
     * @returns {Object} The layout.
     */
    update() {
      const layout = fitLetterbox(this.container.clientWidth, this.container.clientHeight, this.width, this.height, this);
      const style = this.canvas.style;
      style.position = "absolute";
      style.left = `${layout.offsetX}px`;
      style.top = `${layout.offsetY}px`;
      style.width = `${layout.width}px`;
      style.height = `${layout.height}px`;
      this.layout = layout;
      this.onResize?.(layout);
      return layout;
    }
    /**
     * Starts watching the window and the container, and fits the canvas now.
     * @returns {LetterboxScaler} Itself.
     */
    start() {
      if (this.container.style && !this.container.style.position) this.container.style.position = "relative";
      globalThis.addEventListener?.("resize", this.#onWindowResize);
      globalThis.addEventListener?.("orientationchange", this.#onWindowResize);
      if (typeof ResizeObserver !== "undefined") {
        this.#observer = new ResizeObserver(() => this.update());
        this.#observer.observe(this.container);
      }
      this.update();
      return this;
    }
    /**
     * Stops watching.
     */
    stop() {
      globalThis.removeEventListener?.("resize", this.#onWindowResize);
      globalThis.removeEventListener?.("orientationchange", this.#onWindowResize);
      this.#observer?.disconnect();
      this.#observer = null;
    }
    /**
     * Maps a browser pointer position to a logical game position. It works on the bars too: the result is simply outside the game.
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{x: number, y: number}}
     */
    toLogical(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / rect.width * this.width,
        y: (clientY - rect.top) / rect.height * this.height
      };
    }
    /**
     * Asks whether a logical point is on the game rather than on a bar.
     * @param {{x: number, y: number}} point
     * @returns {boolean}
     */
    inside({ x, y }) {
      return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }
  };

  // src/audio/audio.js
  var AudioManager = class {
    /**
     * The registered sounds by id: `{ url, buffer }`. The buffer is `null` until loaded.
     * @type {Map<string, {url: string, buffer: (AudioBuffer|null)}>}
     */
    sounds = /* @__PURE__ */ new Map();
    // id -> { url, buffer }
    #music = null;
    #warned = /* @__PURE__ */ new Set();
    constructor({ context = new globalThis.AudioContext(), settings = null, loadBuffer = null } = {}) {
      this.context = context;
      this.settings = settings;
      this.loadBuffer = loadBuffer ?? ((url) => this.#fetchBuffer(url));
      this.master = context.createGain();
      this.master.connect(context.destination);
      this.buses = {};
      for (const name of ["music", "sfx", "voice"]) {
        this.buses[name] = context.createGain();
        this.buses[name].connect(this.master);
      }
      this.applyVolumes();
      this.stopListening = settings?.onChange(() => this.applyVolumes()) ?? (() => {
      });
    }
    /**
     * The id of the music playing now, or `null`.
     * @type {string|null}
     */
    get musicId() {
      return this.#music && !this.#music.fading ? this.#music.id : null;
    }
    /**
     * Sets the four volumes from the settings. It runs by itself when a setting changes.
     */
    applyVolumes() {
      const s = this.settings;
      const set = (gain, value) => gain.gain.setValueAtTime(value, this.context.currentTime);
      set(this.master, s?.get("masterVolume") ?? 1);
      set(this.buses.music, s?.get("musicVolume") ?? 1);
      set(this.buses.sfx, s?.get("sfxVolume") ?? 1);
      set(this.buses.voice, s?.get("voiceVolume") ?? 1);
    }
    // ---- loading ----
    /**
     * Tells the manager which sounds exist. Nothing is loaded yet.
     * @param {Object<string, string>} map Sound id to file: `{ theme: 'theme.ogg' }`.
     */
    register(map) {
      for (const [id, url] of Object.entries(map)) this.sounds.set(id, { url, buffer: null });
    }
    /**
     * Loads and decodes one sound.
     * @param {string} id
     * @returns {Promise<AudioBuffer>}
     * @throws {Error} For an id that was not registered.
     */
    async load(id) {
      const sound = this.#sound(id);
      sound.buffer ??= await this.loadBuffer(sound.url);
      return sound.buffer;
    }
    /**
     * Loads every registered sound. A game does this in `start()`.
     * @returns {Promise<AudioBuffer[]>}
     */
    loadAll() {
      return Promise.all([...this.sounds.keys()].map((id) => this.load(id)));
    }
    /**
     * Starts the audio context. Browsers allow that only after a click or key press.
     * @returns {Promise<void>}
     */
    unlock() {
      return this.context.state === "running" ? Promise.resolve() : this.context.resume();
    }
    /**
     * Unlocks audio at the first click, key press or touch.
     * @param {EventTarget} [target] Default: the window.
     */
    unlockOnGesture(target = globalThis) {
      const go = () => {
        this.unlock();
        for (const type of ["pointerdown", "keydown", "touchend"]) target.removeEventListener(type, go);
      };
      for (const type of ["pointerdown", "keydown", "touchend"]) target.addEventListener(type, go);
    }
    // ---- playing ----
    /**
     * Plays a loaded sound effect once. Playing a sound that is unknown or not loaded yet is silent (with one console warning), never an error.
     * @param {string} id
     * @param {Object} [options]
     * @param {number} [options.volume=1]
     * @param {boolean} [options.loop=false]
     * @returns {{stop: function(): void}|null} A handle to stop it, or `null` if it was not played.
     */
    playSfx(id, options = {}) {
      return this.#play(id, "sfx", options);
    }
    /**
     * Plays a loaded voice line on the voice bus. Like {@link AudioManager#playSfx}.
     * @param {string} id
     * @param {Object} [options]
     * @param {number} [options.volume=1]
     * @returns {{stop: function(): void}|null}
     */
    playVoice(id, options = {}) {
      return this.#play(id, "voice", options);
    }
    /**
     * Starts a music track, fading the old one out and the new one in. Asking for the track that is already playing does nothing.
     * @param {string} id
     * @param {Object} [options]
     * @param {number} [options.fadeMs=1000] Length of the crossfade.
     * @param {boolean} [options.loop=true]
     * @param {number} [options.volume=1]
     */
    playMusic(id, { fadeMs = 1e3, loop = true, volume = 1 } = {}) {
      if (this.#music?.id === id && !this.#music.fading) return this.#music;
      const buffer = this.#loaded(id);
      if (!buffer) return null;
      const now = this.context.currentTime;
      const fade = fadeMs / 1e3;
      this.#fadeOutMusic(fade);
      const track = this.#startSource(buffer, this.buses.music, { loop, volume, initial: fade > 0 ? 0 : volume });
      track.id = id;
      track.fading = false;
      if (fade > 0) track.gain.gain.linearRampToValueAtTime(volume, now + fade);
      this.#music = track;
      return track;
    }
    /**
     * Fades the music out.
     * @param {number} [fadeMs=1000]
     */
    stopMusic(fadeMs = 1e3) {
      this.#fadeOutMusic(fadeMs / 1e3);
      this.#music = null;
    }
    // ---- wiring to the game ----
    /**
     * Connects sound to the game's events: entering a room plays its `music` (omitted keeps the current
     * music, `null` is silence); a dialogue tag `# sfx:name` plays that sound; and `sfx` maps an event name
     * to a sound id, or to a function `(eventData) => id | { id, volume } | null`. The `sfx` option of
     * {@link createGame} does this.
     * @param {EventBus} events
     * @param {Object} [options]
     * @param {boolean} [options.roomMusic=true]
     * @param {boolean} [options.dialogueSfx=true]
     * @param {Object<string, (string|Function)>} [options.sfx] `{ 'inventory:add': 'pickup' }`
     * @param {number} [options.fadeMs=1000]
     * @returns {function(): void} A function that disconnects it.
     */
    attach(events, { roomMusic = true, dialogueSfx = true, sfx = {}, fadeMs = 1e3 } = {}) {
      const offs = [];
      if (roomMusic) {
        offs.push(events.on("room:enter", ({ room }) => {
          if (room.music === void 0) return;
          if (room.music === null) this.stopMusic(fadeMs);
          else this.playMusic(room.music, { fadeMs });
        }));
      }
      if (dialogueSfx) {
        offs.push(events.on("dialogue:tag", ({ key, value }) => {
          if (key === "sfx") this.playSfx(value);
        }));
      }
      for (const [event, sound] of Object.entries(sfx)) {
        offs.push(events.on(event, (data) => {
          const pick = typeof sound === "function" ? sound(data) : sound;
          if (!pick) return;
          if (typeof pick === "string") this.playSfx(pick);
          else this.playSfx(pick.id, { volume: pick.volume });
        }));
      }
      return () => offs.forEach((off) => off());
    }
    /**
     * Stops listening and closes the audio context.
     */
    dispose() {
      this.stopListening();
      this.stopMusic(0);
      this.context.close?.();
    }
    // ---- internals ----
    #sound(id) {
      const sound = this.sounds.get(id);
      if (!sound) throw new Error(`unknown sound "${id}" (register it first)`);
      return sound;
    }
    // The decoded buffer, or null (with one console warning) when the sound is unknown or not
    // loaded yet. A missing sound must never break the game, so playing it is just silent.
    #loaded(id) {
      const sound = this.sounds.get(id);
      if (sound?.buffer) return sound.buffer;
      if (!this.#warned.has(id)) {
        this.#warned.add(id);
        console.warn(sound ? `sound "${id}" is not loaded yet: await audio.load("${id}") or audio.loadAll() first` : `unknown sound "${id}": register it with audio.register({ ${id}: 'file' }); playing nothing`);
      }
      return null;
    }
    #play(id, bus, { volume = 1, loop = false } = {}) {
      const buffer = this.#loaded(id);
      if (!buffer) return null;
      const track = this.#startSource(buffer, this.buses[bus], { loop, volume });
      return { stop: () => track.source.stop(this.context.currentTime) };
    }
    #startSource(buffer, bus, { loop, volume, initial: initial2 = volume }) {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = loop;
      gain.gain.setValueAtTime(initial2, this.context.currentTime);
      source.connect(gain);
      gain.connect(bus);
      source.onended = () => {
        source.disconnect?.();
        gain.disconnect?.();
      };
      source.start(this.context.currentTime);
      return { source, gain };
    }
    #fadeOutMusic(seconds) {
      const old = this.#music;
      if (!old || old.fading) return;
      old.fading = true;
      const now = this.context.currentTime;
      const g = old.gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + seconds);
      old.source.stop(now + seconds);
    }
    async #fetchBuffer(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`);
      return this.context.decodeAudioData(await response.arrayBuffer());
    }
  };

  // src/ui/subtitles.js
  var SubtitleBar = class {
    /** `false` hides the bar (the player's subtitles setting). Lines still pace and resolve. @type {boolean} */
    enabled = true;
    /** Multiplies reveal and reading speed (the player's text speed setting). @type {number} */
    speed = 1;
    /** How fast the text is revealed. @type {number} */
    charsPerSecond = 40;
    /** Reading time after the text is shown, whatever its length, in milliseconds. @type {number} */
    baseHoldMs = 700;
    /** Extra reading time for each character, in milliseconds. @type {number} */
    holdMsPerChar = 25;
    /** The line on show, or `null`. @type {DialogueLine|null} */
    line = null;
    #elapsed = 0;
    #resolve = null;
    #reject = null;
    /**
     * `true` while a line is on show.
     * @type {boolean}
     */
    get active() {
      return this.line !== null;
    }
    /**
     * `true` once all of the line's text is revealed.
     * @type {boolean}
     */
    get fullyShown() {
      return this.line !== null && this.visibleCount >= this.line.text.length;
    }
    /**
     * How many characters of the line are revealed.
     * @type {number}
     */
    get visibleCount() {
      if (!this.line) return 0;
      return Math.min(this.line.text.length, Math.floor(this.#elapsed * this.charsPerSecond * this.speed / 1e3));
    }
    /**
     * The part of the line revealed so far.
     * @type {string}
     */
    get visibleText() {
      return this.line ? this.line.text.slice(0, this.visibleCount) : "";
    }
    /**
     * Milliseconds of reading time after the text is fully shown.
     * @type {number}
     */
    get holdMs() {
      return (this.baseHoldMs + this.line.text.length * this.holdMsPerChar) / this.speed;
    }
    /**
     * Shows a line.
     * @param {DialogueLine} line
     * @param {AbortSignal} [signal] Rejects when aborted.
     * @returns {Promise<void>} Resolves when the line has been read.
     */
    show(line, signal) {
      this.#finish();
      if (signal?.aborted) return Promise.reject(signal.reason);
      this.line = line;
      this.#elapsed = 0;
      return new Promise((resolve, reject) => {
        this.#resolve = resolve;
        this.#reject = reject;
        signal?.addEventListener("abort", () => this.#abort(signal.reason), { once: true });
      });
    }
    /**
     * Moves the reveal and the reading time forward. A game does this every frame.
     * @param {number} dt Milliseconds.
     */
    update(dt) {
      if (!this.line) return;
      this.#elapsed += dt;
      const revealMs = this.line.text.length * 1e3 / (this.charsPerSecond * this.speed);
      if (this.#elapsed >= revealMs + this.holdMs) this.#finish();
    }
    /**
     * A click or tap: shows the rest of the line, or moves on when it is all there.
     */
    advance() {
      if (!this.line) return;
      if (this.fullyShown) this.#finish();
      else this.#elapsed = this.line.text.length * 1e3 / (this.charsPerSecond * this.speed);
    }
    /**
     * Moves on at once.
     */
    skip() {
      this.#finish();
    }
    /**
     * Takes the line away without resolving it.
     */
    hide() {
      this.#abort(null);
    }
    #finish() {
      const resolve = this.#resolve;
      this.line = null;
      this.#resolve = null;
      this.#reject = null;
      resolve?.();
    }
    #abort(reason) {
      const reject = this.#reject;
      this.line = null;
      this.#resolve = null;
      this.#reject = null;
      if (reason !== null) reject?.(reason);
    }
    /**
     * Draws the bar: a box above the inventory bar. Browser only.
     * @param {Object} p The p5 sketch.
     * @param {Object} [options]
     * @param {number} [options.bottom=70] How far above the bottom of the screen the box ends.
     * @param {number} [options.margin=16] The space at the sides.
     */
    draw(p, { bottom = 70, margin = 16 } = {}) {
      if (!this.enabled || !this.line) return;
      const w = p.width - margin * 2;
      const h = 56;
      const y = p.height - bottom - h;
      p.noStroke();
      p.fill(0, 0, 0, 190);
      p.rect(margin, y, w, h, 6);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(15);
      let top = y + 8;
      if (this.line.speaker) {
        p.fill(255, 214, 120);
        p.text(this.line.speaker, margin + 10, top);
        top += 18;
      }
      p.fill(255);
      p.text(this.visibleText, margin + 10, top, w - 20, h - (top - y) - 4);
    }
  };

  // src/ui/choice-menu.js
  var ChoiceMenu = class {
    /** The choices on show: `{ index, text }`. Empty when closed. @type {Array<{index: number, text: string}>} */
    options = [];
    /** The row under the pointer, or `null`. @type {number|null} */
    hovered = null;
    #resolve = null;
    #reject = null;
    constructor({ viewWidth, viewHeight, rowHeight = 26, bottom = 70, margin = 16 }) {
      Object.assign(this, { viewWidth, viewHeight, rowHeight, bottom, margin });
    }
    /**
     * `true` while a question is on show.
     * @type {boolean}
     */
    get open() {
      return this.options.length > 0;
    }
    /**
     * Shows choices and waits for the player.
     * @param {Array<{index: number, text: string}>} choices
     * @param {AbortSignal} [signal] Rejects when aborted.
     * @returns {Promise<number>} The `index` of the choice made.
     */
    ask(choices, signal) {
      this.#close();
      if (signal?.aborted) return Promise.reject(signal.reason);
      this.options = choices;
      return new Promise((resolve, reject) => {
        this.#resolve = resolve;
        this.#reject = reject;
        signal?.addEventListener("abort", () => this.close(signal.reason), { once: true });
      });
    }
    /**
     * The screen rectangle of a row.
     * @param {number} i
     * @returns {{x: number, y: number, w: number, h: number}}
     */
    rowRect(i) {
      const top = this.viewHeight - this.bottom - this.options.length * this.rowHeight;
      return { x: this.margin, y: top + i * this.rowHeight, w: this.viewWidth - this.margin * 2, h: this.rowHeight };
    }
    /**
     * Which row is at a screen position.
     * @param {number} x
     * @param {number} y
     * @returns {number|null}
     */
    itemAt(x, y) {
      for (let i = 0; i < this.options.length; i++) {
        const r = this.rowRect(i);
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
      }
      return null;
    }
    /**
     * Moves the pointer, for the row highlight.
     * @param {number} x
     * @param {number} y
     */
    move(x, y) {
      this.hovered = this.itemAt(x, y);
    }
    /**
     * A press at a screen position.
     * @param {number} x
     * @param {number} y
     * @returns {boolean} `true` when it was on a row, and chose it.
     */
    click(x, y) {
      const i = this.itemAt(x, y);
      if (i === null) return false;
      this.pick(i);
      return true;
    }
    /**
     * Chooses a row. The number keys use it: key `1` picks row 0.
     * @param {number} i
     * @returns {boolean} `false` when no question is open or there is no such row.
     */
    pick(i) {
      if (!this.open || i < 0 || i >= this.options.length) return false;
      const resolve = this.#resolve;
      const choice = this.options[i];
      this.#close();
      resolve?.(choice.index ?? i);
      return true;
    }
    /**
     * Abandons the question.
     * @param {*} [reason] When given, the pending `ask()` rejects with it.
     */
    close(reason = null) {
      const reject = this.#reject;
      this.#close();
      if (reason !== null) reject?.(reason);
    }
    #close() {
      this.options = [];
      this.hovered = null;
      this.#resolve = null;
      this.#reject = null;
    }
    /**
     * Draws the rows. Browser only.
     * @param {Object} p The p5 sketch.
     */
    draw(p) {
      if (!this.open) return;
      p.textAlign(p.LEFT, p.CENTER);
      p.textSize(15);
      this.options.forEach((o, i) => {
        const r = this.rowRect(i);
        p.noStroke();
        p.fill(0, 0, 0, this.hovered === i ? 230 : 170);
        p.rect(r.x, r.y + 1, r.w, r.h - 2, 4);
        p.fill(this.hovered === i ? p.color(255, 220, 110) : p.color(235));
        p.text(`${i + 1}. ${o.text}`, r.x + 10, r.y + r.h / 2);
      });
    }
  };

  // src/ui/skip-button.js
  function skipButtonRect(viewWidth) {
    return { x: viewWidth - 74, y: 8, w: 66, h: 26 };
  }
  function hitSkipButton(x, y, viewWidth) {
    const r = skipButtonRect(viewWidth);
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
  function drawSkipButton(p, viewWidth) {
    const r = skipButtonRect(viewWidth);
    p.noStroke();
    p.fill(0, 0, 0, 170);
    p.rect(r.x, r.y, r.w, r.h, 4);
    p.fill(255);
    p.textSize(13);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Skip \xBB", r.x + r.w / 2, r.y + r.h / 2);
  }

  // src/ui/inventory-bar.js
  var InventoryBar = class {
    constructor({ viewWidth, viewHeight, slot = 40, gap = 4, margin = 6 }) {
      Object.assign(this, { viewWidth, viewHeight, slot, gap, margin });
    }
    /**
     * The y where the strip starts.
     * @type {number}
     */
    get top() {
      return this.viewHeight - this.slot - this.margin * 2;
    }
    /**
     * How many slots fit in the strip.
     * @type {number}
     */
    get perRow() {
      return Math.max(1, Math.floor((this.viewWidth - this.margin * 2 + this.gap) / (this.slot + this.gap)));
    }
    /**
     * The screen rectangle of slot `i`.
     * @param {number} i
     * @returns {{x: number, y: number, w: number, h: number}}
     */
    slotRect(i) {
      return { x: this.margin + i * (this.slot + this.gap), y: this.top + this.margin, w: this.slot, h: this.slot };
    }
    /**
     * Asks whether a screen point is on the strip, so clicks on it never fall through to the room.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    contains(x, y) {
      return y >= this.top && y <= this.viewHeight && x >= 0 && x <= this.viewWidth;
    }
    /**
     * Which item is at a screen point.
     * @param {number} x
     * @param {number} y
     * @param {string[]} items The ids of the items carried, in order.
     * @returns {string|null}
     */
    itemAt(x, y, items) {
      for (let i = 0; i < Math.min(items.length, this.perRow); i++) {
        const r = this.slotRect(i);
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return items[i];
      }
      return null;
    }
    /**
     * Draws the strip, with the held item outlined. Browser only.
     * @param {Object} p The p5 sketch.
     * @param {string[]} items The ids of the items carried.
     * @param {string|null} [held] The item being held.
     * @param {Object<string, Object>} [images] Loaded p5 images by item id.
     */
    draw(p, items, held = null, images = {}) {
      p.noStroke();
      p.fill(0, 0, 0, 150);
      p.rect(0, this.top, this.viewWidth, this.viewHeight - this.top);
      items.slice(0, this.perRow).forEach((id, i) => {
        const r = this.slotRect(i);
        p.stroke(id === held ? p.color(255, 220, 80) : p.color(120));
        p.strokeWeight(id === held ? 3 : 1);
        p.fill(30, 30, 40);
        p.rect(r.x, r.y, r.w, r.h, 4);
        p.noStroke();
        if (images[id]) p.image(images[id], r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        else {
          p.fill(230);
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(id, r.x + r.w / 2, r.y + r.h / 2);
        }
      });
    }
  };
  function drawHoverLabel(p, text, x, y) {
    if (!text) return;
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    const w = p.textWidth(text) + 12;
    const lx = Math.min(Math.max(x + 12, 2), p.width - w - 2);
    const ly = Math.max(y - 28, 2);
    p.noStroke();
    p.fill(0, 0, 0, 190);
    p.rect(lx, ly, w, 22, 4);
    p.fill(255);
    p.text(text, lx + 6, ly + 4);
  }

  // src/ui/pointer.js
  function clientToLogical(clientX, clientY, rect, logicalWidth, logicalHeight) {
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width * logicalWidth,
      y: (clientY - rect.top) / rect.height * logicalHeight
    };
  }

  // src/debug/overlay.js
  function drawDebugOverlay(p, { hotspots = [], room = null, camera, hovered = null }) {
    p.push();
    p.translate(-camera.x, -camera.y);
    p.strokeWeight(2);
    p.textSize(11);
    p.noFill();
    if (room) {
      p.stroke(80, 200, 255, 200);
      for (const area of room.walkable) {
        p.beginShape();
        for (const [x, y] of area.points) p.vertex(x, y);
        p.endShape(p.CLOSE);
      }
      p.stroke(120, 255, 120, 200);
      for (const o of room.obstacles) {
        p.beginShape();
        for (const [x, y] of o.points) p.vertex(x, y);
        p.endShape(p.CLOSE);
      }
    }
    for (const h of hotspots) {
      const hot = h === hovered;
      p.stroke(hot ? p.color(255, 255, 0) : p.color(255, 80, 80, 220));
      p.fill(255, 80, 80, hot ? 70 : 25);
      p.drawingContext.save();
      h.provider.debugDraw?.(p);
      p.drawingContext.restore();
    }
    p.pop();
    p.noStroke();
    p.fill(255, 255, 0);
    p.text(hovered ? `hover: ${hovered.id} (${hovered.provider.kind})` : "hover: -", 6, p.height - 8);
  }

  // src/debug/inspector.js
  function flatten(object, prefix = "") {
    const out = [];
    for (const [key, value] of Object.entries(object ?? {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) out.push(...flatten(value, path));
      else out.push([path, value]);
    }
    return out;
  }
  var StateInspector = class {
    #game;
    #doc;
    #maxEvents;
    #root = null;
    #refs = {};
    #stops = [];
    #log = [];
    constructor(game, { document: document2 = globalThis.document, maxEvents = 60 } = {}) {
      this.#game = game;
      this.#doc = document2;
      this.#maxEvents = maxEvents;
    }
    /**
     * `true` while the panel is open.
     * @type {boolean}
     */
    get visible() {
      return this.#root !== null;
    }
    /**
     * Everything the panel shows, as plain data (this is also handy in a test).
     * @returns {{room: (string|null), rooms: string[], hero: Object, state: Object, flags: Array<Array>, items: string[], carried: string[], events: Array<{type: string, data: string}>}}
     */
    snapshot() {
      const g = this.#game;
      const state = g.state.toJSON();
      return {
        room: g.room?.id ?? null,
        rooms: [...g.rooms.keys()],
        hero: g.hero.toJSON(),
        state,
        flags: flatten(state.flags),
        items: Object.keys(g.inventory.items),
        carried: g.inventory.list,
        events: [...this.#log]
      };
    }
    /**
     * Opens the panel and starts logging events.
     */
    show() {
      if (this.visible) return;
      this.#build();
      const { events, state } = this.#game;
      const emit = events.emit.bind(events);
      events.emit = (type, ...args) => {
        if (type !== "update") this.#record(type, args);
        return emit(type, ...args);
      };
      this.#stops.push(() => {
        delete events.emit;
      }, state.watch("", () => this.refresh()));
      this.refresh();
    }
    /**
     * Closes the panel and stops logging.
     */
    hide() {
      if (!this.visible) return;
      for (const stop of this.#stops.splice(0)) stop();
      this.#root.remove();
      this.#root = null;
      this.#refs = {};
    }
    /**
     * Opens the panel if it is closed, and closes it if it is open.
     */
    toggle() {
      if (this.visible) this.hide();
      else this.show();
    }
    /**
     * Redraws the panel from the game's current state. It does this by itself when the state changes.
     */
    refresh() {
      if (!this.visible) return;
      const snap = this.snapshot();
      const r = this.#refs;
      r.room.textContent = `room: ${snap.room}   hero: ${Math.round(snap.hero.x)}, ${Math.round(snap.hero.y)} facing ${snap.hero.dir}`;
      const roomsKey = `${snap.rooms.join()}|${snap.room}`;
      if (r.roomsKey !== roomsKey) {
        r.roomsKey = roomsKey;
        this.#fill(r.rooms, snap.rooms.map((id) => this.#option(id, id === snap.room)));
      }
      this.#fill(r.items, snap.items.map((id) => this.#row(id, snap.carried.includes(id), (on) => on ? this.#game.give(id) : this.#game.take(id))));
      this.#fill(r.flags, snap.flags.length ? snap.flags.map(([path, value]) => typeof value === "boolean" ? this.#row(path, value, (on) => this.#game.state.set(`flags.${path}`, on)) : this.#text(`${path} = ${JSON.stringify(value)}`)) : [this.#text("no flags yet")]);
      if (this.#doc.activeElement !== r.json) r.json.value = JSON.stringify(snap.state, null, 2);
      this.#fill(r.events, snap.events.slice(-12).reverse().map((e) => this.#text(`${e.type}  ${e.data}`)));
    }
    #record(type, args) {
      let data = "";
      try {
        data = JSON.stringify(args.length === 1 ? args[0] : args) ?? "";
      } catch {
        data = "(not shown)";
      }
      this.#log.push({ type, data: data.length > 80 ? `${data.slice(0, 77)}...` : data });
      if (this.#log.length > this.#maxEvents) this.#log.shift();
      this.refresh();
    }
    async #apply(reenter) {
      const r = this.#refs;
      try {
        this.#game.state.fromJSON(JSON.parse(r.json.value));
        r.message.textContent = "applied";
        if (reenter) await this.#game.scene.restore();
      } catch (err) {
        r.message.textContent = `not applied: ${err.message}`;
      }
    }
    #build() {
      const doc = this.#doc;
      const el = (tag, props = {}, ...kids) => {
        const node = doc.createElement(tag);
        const { style, on, ...rest } = props;
        Object.assign(node, rest);
        Object.assign(node.style, style);
        for (const [type, fn] of Object.entries(on ?? {})) node.addEventListener(type, fn);
        kids.forEach((k) => node.appendChild(k));
        return node;
      };
      const heading = (text) => el("div", { textContent: text, style: { margin: "10px 0 4px", color: "#8f98ad", textTransform: "uppercase", fontSize: "11px" } });
      const button = (text, fn) => el("button", { textContent: text, on: { click: fn }, style: { marginRight: "4px" } });
      const r = this.#refs;
      r.room = el("div");
      r.rooms = el("select");
      r.items = el("div");
      r.flags = el("div");
      r.json = el("textarea", { rows: 10, spellcheck: false, style: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "11px" } });
      r.message = el("div", { style: { color: "#ffd678" } });
      r.events = el("div", { style: { color: "#b4bccc" } });
      this.#root = el(
        "div",
        { style: {
          position: "fixed",
          top: "0",
          right: "0",
          bottom: "0",
          width: "320px",
          overflow: "auto",
          zIndex: "99999",
          padding: "8px 10px",
          background: "rgba(20,22,28,0.96)",
          color: "#e2e5ee",
          font: "12px/1.5 ui-monospace, Consolas, monospace",
          borderLeft: "1px solid #3a3f4c"
        } },
        el(
          "div",
          { style: { display: "flex", justifyContent: "space-between" } },
          el("b", { textContent: "State inspector" }),
          button("close", () => this.hide())
        ),
        r.room,
        heading("go to a room"),
        el("div", {}, r.rooms, button("go", () => this.#game.goTo(r.rooms.value))),
        heading("inventory"),
        r.items,
        heading("flags"),
        r.flags,
        heading("state (json)"),
        r.json,
        el("div", {}, button("apply", () => this.#apply(false)), button("apply + re-enter room", () => this.#apply(true))),
        r.message,
        heading("game"),
        el("div", {}, button("save", () => this.#game.save()), button("load", () => this.#game.load())),
        heading("events"),
        r.events
      );
      doc.body.appendChild(this.#root);
    }
    #fill(parent, nodes) {
      parent.textContent = "";
      nodes.forEach((n) => parent.appendChild(n));
    }
    #text(text) {
      const node = this.#doc.createElement("div");
      node.textContent = text;
      return node;
    }
    #option(value, selected) {
      const node = this.#doc.createElement("option");
      Object.assign(node, { value, textContent: value, selected });
      return node;
    }
    #row(label, checked, onChange) {
      const input = this.#doc.createElement("input");
      input.type = "checkbox";
      input.checked = checked;
      input.addEventListener("change", () => onChange(input.checked));
      const row = this.#doc.createElement("label");
      row.style.display = "block";
      row.appendChild(input);
      row.appendChild(this.#doc.createTextNode(` ${label}`));
      return row;
    }
  };

  // src/game/conversation.js
  var stories = /* @__PURE__ */ new WeakMap();
  var storiesByText = /* @__PURE__ */ new Map();
  var isRunner = (s) => s && typeof s.next === "function" && typeof s.choices === "function";
  var isInkStory = (s) => s && typeof s.Continue === "function" && "variablesState" in s;
  function inkStoryFrom(source, Story) {
    const StoryClass = Story ?? globalThis.inkjs?.Story;
    if (!StoryClass) {
      throw new Error('this is an Ink story: load ink.js first (<script src="ink.js">) or pass { Story } from inkjs');
    }
    if (typeof source === "string") {
      if (!storiesByText.has(source)) storiesByText.set(source, new StoryClass(source));
      return storiesByText.get(source);
    }
    if (!stories.has(source)) stories.set(source, new StoryClass(source));
    return stories.get(source);
  }
  function inkVariableNames(story) {
    const vars = story.variablesState?._globalVariables;
    return vars instanceof Map ? [...vars.keys()] : [];
  }
  function toRunner(source, { state, inventory, Story, sync, externals = {}, start } = {}) {
    if (isRunner(source)) return source;
    const looksLikeInk = isInkStory(source) || source && typeof source === "object" && "inkVersion" in source || typeof source === "string" && /^\s*\{\s*"inkVersion"/.test(source);
    if (looksLikeInk) {
      const story = isInkStory(source) ? source : inkStoryFrom(source, Story);
      return createInkRunner(story, {
        state,
        sync: sync ?? inkVariableNames(story),
        externals: { ...inkExternals({ inventory, state }), ...externals }
      });
    }
    if (source && typeof source === "object" && Array.isArray(source.passages)) return createTwineRunner(source, { state });
    if (typeof source !== "string") throw new TypeError("talk() needs dialogue text (Markdown or Twee), Twison, an Ink story or a runner");
    if (source.trimStart().startsWith("::")) return createTwineRunner(source, { state });
    return createMarkdownRunner(source, { state, start });
  }

  // src/game/options.js
  var GAME_DEFAULTS = {
    width: 640,
    height: 360,
    rooms: [],
    strings: {},
    language: "en",
    items: {},
    recipes: [],
    sounds: {},
    sfx: {},
    hero: {},
    mode: "smart",
    fadeMs: 300,
    followHero: true,
    debugKey: "d",
    inspectorKey: null,
    saveSlot: "game",
    storage: void 0,
    Story: void 0
  };

  // src/game/game.js
  var Game = class {
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
    images = /* @__PURE__ */ new Map();
    /**
     * The inventory pictures that are loaded, by item id (the `image` of an item).
     * @type {Object<string, Object>}
     */
    itemImages = {};
    roomURLs = /* @__PURE__ */ new Map();
    // room id -> URL of its file, so its pictures load relative to it
    /**
     * The files that hotspots need, loaded in `start()`: for a `colorMask` hotspot its mask picture's pixels,
     * for an `svg` hotspot with a file its text. Keys are `'<room id>:<name as the room writes it>'`, values
     * `{ pixels: { data, width, height } }` or `{ text }`. A game made with {@link createGame} fills it by
     * itself; fill it by hand when you use `new Game` with these hotspots.
     * @type {Map<string, Object>}
     */
    hotspotFiles = /* @__PURE__ */ new Map();
    #roomSources = [];
    #ready = null;
    constructor(options = {}) {
      const o = { ...GAME_DEFAULTS, ...options, hero: { ...GAME_DEFAULTS.hero, ...options.hero } };
      this.options = o;
      const core = createCore();
      this.core = core;
      this.events = core.events;
      this.state = core.state;
      this.scheduler = core.scheduler;
      this.i18n = core.i18n;
      this.i18n.language = o.language;
      this.i18n.add("en", defaultStrings);
      this.i18n.add(o.language, o.strings);
      this.rooms = /* @__PURE__ */ new Map();
      for (const source of Array.isArray(o.rooms) ? o.rooms : Object.values(o.rooms)) this.addRoom(source);
      this.scene = new SceneManager({
        ...core,
        viewWidth: o.width,
        viewHeight: o.height,
        fadeMs: o.fadeMs,
        loadRoom: async (id) => this.#room(id)
      });
      this.hero = new Actor({ id: "hero", speed: 150, directions: 4, ...o.hero, translate: (key) => this.i18n.t(key) });
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
        hero: this.hero,
        state: this.state,
        events: this.events,
        inventory: this.inventory,
        hover: this.hover,
        cutscenes: this.cutscenes,
        dialogue: this.dialogue,
        audio: this.audio,
        mode: o.mode
      });
      this.interactor.onError = (err) => console.error(err);
      this.scripts = new Scripts({ interactor: this.interactor });
      this.scene.scripts = this.scripts;
      this.bar = new InventoryBar({ viewWidth: o.width, viewHeight: o.height });
      this.pointer = new PointerController({
        interactor: this.interactor,
        hover: this.hover,
        camera: this.scene.camera,
        bar: this.bar,
        scheduler: this.scheduler
      });
      this.events.on("room:enter", ({ room, start }) => {
        const hotspots = createHotspots(room, this.#hotspotAssets(room));
        applyHotspotState(this.state, room.id, hotspots);
        this.hover.setHotspots(hotspots);
        this.hero.navigator = Navigator.fromRoom(room);
        const at = room.starts[start];
        this.hero.teleport(at.x, at.y);
        if (at.dir) this.hero.face(at.dir);
      });
      this.events.on("update", (dt) => {
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
      if (typeof source === "string") this.#roomSources.push({ url: source });
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
    async start(roomId, startName = "default") {
      await this.preload();
      const first = roomId ?? this.rooms.keys().next().value;
      if (first === void 0) throw new Error("add a room first: createGame({ rooms: [...] })");
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
    goTo(roomId, startName = "default") {
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
      if (value === void 0) return this.state.get(`flags.${name}`, false);
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
    give(item) {
      return this.inventory.give(item);
    }
    /**
     * Removes an item from the inventory.
     * @param {string} item An id from the `items` option.
     * @returns {boolean} `true`, or `false` if it was not carried.
     */
    take(item) {
      return this.inventory.remove(item);
    }
    /**
     * Asks whether an item is carried.
     * @param {string} item An id from the `items` option.
     * @returns {boolean}
     * @example
     * if (game.has('key')) await game.say('door.unlock');
     */
    has(item) {
      return this.inventory.has(item);
    }
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
      this.events.emit("update", step);
    }
    // ---- saving ----
    /**
     * Saves the game: the state (flags, inventory, current room) and where the hero stands.
     * @param {string} [slot] Default: the `saveSlot` option.
     * @example
     * game.save();
     */
    save(slot = this.options.saveSlot) {
      this.state.set("hero", this.hero.toJSON());
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
      const hero = this.state.get("hero");
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
      return { pixels: (name) => file(name, "the mask picture").pixels, text: (name) => file(name, "the svg file").text };
    }
    #storage() {
      return this.options.storage ?? globalThis.localStorage;
    }
    #room(id) {
      const room = this.rooms.get(id);
      if (!room) throw new Error(`no room "${id}" (rooms: ${[...this.rooms.keys()].join(", ") || "none"})`);
      return room;
    }
    // Items may be given as display text: { key: 'brass key' } becomes the text key "item.key".
    #items(items) {
      const defs = {};
      const strings = {};
      for (const [id, value] of Object.entries(items)) {
        if (typeof value === "string") {
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
        this.roomURLs.set(room.id, new URL(source.url, globalThis.document?.baseURI ?? "file:///").href);
        this.rooms.set(room.id, room);
      }
      await this.loadAssets?.();
      if (this.audio) {
        try {
          await this.audio.loadAll();
        } catch (err) {
          console.warn("some sounds could not be loaded:", err.message);
        }
      }
    }
  };

  // src/game/setup-driver.js
  function driveUntilDrawing(game, { request = globalThis.requestAnimationFrame?.bind(globalThis) } = {}) {
    if (!request) return () => {
    };
    let stopped = false;
    let last = null;
    const frame = (now) => {
      if (stopped || game.drawnByP5) return;
      game.update(last === null ? 0 : now - last);
      last = now;
      try {
        game.draw?.();
      } catch (err) {
        console.warn("p5.clickery: could not draw the game while setup() was running:", err.message);
        return;
      }
      request(frame);
    };
    request(frame);
    return () => {
      stopped = true;
    };
  }

  // src/game/p5-binding.js
  function attachP5(game, p, { canvas = true, parent = null, fit = true } = {}) {
    const { width, height } = game.options;
    game.p = p;
    const renderer = canvas ? p.createGameCanvas(width, height) : null;
    const el = renderer?.elt ?? p.canvas ?? p._renderer?.elt;
    if (parent && el) {
      const node = typeof parent === "string" ? el.ownerDocument.getElementById(parent) : parent;
      if (!node) throw new Error(`no element with id "${parent}" to put the game in`);
      node.appendChild(el);
    }
    if (fit && el) game.scaler = new LetterboxScaler({ canvas: el, container: prepareContainer(el, width, height), width, height }).start();
    if (el) bindInput(game, el);
    game.audio?.unlockOnGesture(globalThis.window ?? globalThis);
    game.loadAssets = () => loadImages(game, p);
    game.draw = () => drawGame(game, p);
    game.drawRoom ??= drawRoomShapes;
    game.drawHero ??= drawHeroDefault;
    game.drawSpeech ??= drawSpeechDefault;
    (p._clickeryGames ??= /* @__PURE__ */ new Set()).add(game);
    driveUntilDrawing(game);
    return game;
  }
  function prepareContainer(el, width, height) {
    const parent = el.parentElement;
    const doc = el.ownerDocument;
    const isPage = parent === doc.body || parent.tagName === "MAIN" && parent.parentElement === doc.body;
    if (isPage) {
      for (const node of [doc.documentElement, doc.body]) Object.assign(node.style, { height: "100%", margin: "0" });
      doc.body.style.overflow = "hidden";
      doc.body.style.background ||= "#000";
      if (parent !== doc.body) Object.assign(parent.style, { width: "100%", height: "100%" });
    } else if (parent.clientHeight === 0) {
      Object.assign(parent.style, { width: "100%", aspectRatio: `${width} / ${height}` });
    }
    el.style.touchAction = "none";
    return parent;
  }
  function bindInput(game, el) {
    const { width, height, debugKey, inspectorKey } = game.options;
    const { pointer, menu, subtitles, dialogue, cutscenes, scene } = game;
    const at = (e) => game.scaler ? game.scaler.toLogical(e.clientX, e.clientY) : clientToLogical(e.clientX, e.clientY, el.getBoundingClientRect(), width, height);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointermove", (e) => {
      const pt = at(e);
      if (menu.open) menu.move(pt.x, pt.y);
      pointer.move(pt);
    });
    el.addEventListener("pointerleave", () => pointer.leave());
    el.addEventListener("pointerdown", (e) => {
      const pt = at(e);
      if (dialogue.active) {
        if (menu.open) menu.click(pt.x, pt.y);
        else subtitles.advance();
        return;
      }
      if (cutscenes.active) {
        if (hitSkipButton(pt.x, pt.y, width)) cutscenes.skip();
        return;
      }
      if (!scene.busy) pointer.down({ ...pt, pointerType: e.pointerType, button: e.button });
    });
    el.addEventListener("pointerup", (e) => pointer.up(at(e)));
    el.addEventListener("pointercancel", () => pointer.cancel());
    el.ownerDocument.addEventListener("keydown", (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") {
        cutscenes.skip();
        subtitles.skip();
      } else if (/^[1-9]$/.test(e.key) && menu.open) menu.pick(Number(e.key) - 1);
      else if (debugKey && e.key.toLowerCase() === debugKey.toLowerCase()) game.debug = !game.debug;
      else if (inspectorKey && e.key.toLowerCase() === inspectorKey.toLowerCase()) {
        game.inspector ??= new StateInspector(game, { document: el.ownerDocument });
        game.inspector.toggle();
      }
    });
  }
  async function loadImages(game, p) {
    const base = globalThis.document?.baseURI;
    const load = async (name, relativeTo) => {
      try {
        return await p.loadImage(new URL(name, relativeTo ?? base).href);
      } catch {
        console.warn(`could not load the picture "${name}"`);
        return null;
      }
    };
    for (const [id, room] of game.rooms) {
      const names = [room.background, ...(room.layers ?? []).map((l) => l.image)].filter(Boolean);
      const images = game.images.get(id) ?? {};
      for (const name of names) images[name] ??= await load(name, game.roomURLs.get(id));
      game.images.set(id, images);
      await loadHotspotFiles(game, id, room, load);
    }
    for (const [id, item] of Object.entries(game.inventory.items)) {
      if (item.image && !game.itemImages[id]) game.itemImages[id] = await load(item.image);
    }
  }
  async function loadHotspotFiles(game, roomId, room, load) {
    for (const def of room.hotspots ?? []) {
      if (def.provider === "colorMask" && def.mask && !game.hotspotFiles.has(`${roomId}:${def.mask}`)) {
        const img = await load(def.mask, game.roomURLs.get(roomId));
        if (!img) continue;
        img.loadPixels();
        game.hotspotFiles.set(`${roomId}:${def.mask}`, { pixels: { data: img.pixels, width: img.width, height: img.height } });
      } else if (def.provider === "svg" && def.svg && !def.d && !game.hotspotFiles.has(`${roomId}:${def.svg}`)) {
        try {
          const url = new URL(def.svg, game.roomURLs.get(roomId) ?? globalThis.document?.baseURI).href;
          const response = await fetch(url);
          if (!response.ok) throw new Error(String(response.status));
          game.hotspotFiles.set(`${roomId}:${def.svg}`, { text: await response.text() });
        } catch (err) {
          console.warn(`could not load the svg file "${def.svg}": ${err.message}`);
        }
      }
    }
  }
  function drawGame(game, p) {
    const room = game.room;
    p.push();
    p.background(room?.color ?? 0);
    if (room) {
      const cam = game.scene.camera;
      const images = game.images.get(room.id) ?? {};
      drawBackground(p, room, cam, images);
      p.push();
      p.translate(-cam.x, -cam.y);
      game.drawRoom(p, room, game);
      const actors = [{ baseline: game.hero.baseline, draw: () => game.drawHero(p, game.hero, game) }, ...game.actors ?? []];
      for (const a of sortByBaseline(actors)) {
        p.push();
        a.draw(p);
        p.pop();
      }
      if (game.hero.speech) game.drawSpeech(p, game.hero, game);
      p.pop();
      drawForeground(p, room, cam, images);
    }
    p.push();
    game.subtitles.draw(p);
    p.pop();
    p.push();
    game.menu.draw(p);
    p.pop();
    p.push();
    game.bar.draw(p, game.inventory.list, game.interactor.held, game.itemImages);
    p.pop();
    if (game.cutscenes.active) {
      p.push();
      drawSkipButton(p, game.options.width);
      p.pop();
    }
    const { pointer } = game;
    if (pointer.pointer && !game.dialogue.active && !game.cutscenes.active) {
      const label = hoverLabel({
        hotspot: pointer.highlighted ?? game.hover.hovered,
        item: pointer.hoveredItem,
        held: game.interactor.held,
        inventory: game.inventory,
        mode: game.interactor.mode,
        verb: game.interactor.verb,
        t: (k, v) => game.i18n.t(k, v)
      });
      p.push();
      drawHoverLabel(p, label, pointer.pointer.x, pointer.pointer.y);
      p.pop();
    }
    if (game.debug && room) drawDebugOverlay(p, { hotspots: game.hover.hotspots, room, camera: game.scene.camera, hovered: game.hover.hovered });
    drawFade(p, game.scene.fade);
    p.pop();
  }
  function drawRoomShapes(p, room, game) {
    p.noStroke();
    const shapes = [...room.walkable, ...room.obstacles, ...room.hotspots.filter((h) => game.hotspot(h.id)?.enabled !== false)];
    for (const shape of shapes) {
      if (!shape.color || !shape.points) continue;
      p.fill(shape.color);
      p.beginShape();
      for (const [x, y] of shape.points) p.vertex(x, y);
      p.endShape(p.CLOSE);
    }
  }
  function drawHeroDefault(p, hero) {
    if (drawAnimation(p, hero.anim, hero.x, hero.y, hero.scale)) return;
    const s = hero.scale;
    p.noStroke();
    p.fill(240, 120, 90);
    p.rect(hero.x - 14 * s, hero.y - 70 * s, 28 * s, 70 * s, 6 * s);
    p.fill(255);
    const eye = hero.dir.includes("left") ? -9 : hero.dir.includes("right") ? 3 : -3;
    p.rect(hero.x + eye * s, hero.y - 62 * s, 6 * s, 6 * s);
  }
  function drawSpeechDefault(p, hero, game) {
    const { width } = game.options;
    const cam = game.scene.camera;
    const s = hero.scale;
    const x = Math.min(Math.max(hero.x, cam.x + 160), cam.x + width - 160);
    const y = hero.y - 78 * s;
    p.textSize(16);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.noStroke();
    p.fill(0);
    p.text(hero.speech.text, x - 150 + 1, y - 80 + 1, 300, 80);
    p.fill(255, 240, 160);
    p.text(hero.speech.text, x - 150, y - 80, 300, 80);
  }

  // src/index.js
  var VERSION = "0.1.0";
  function clickeryAddon(p52, fn, lifecycles) {
    p52.clickery = { ...p52.clickery, version: VERSION };
    fn.createGame = function(options = {}) {
      return attachP5(new Game(options), this, options);
    };
    if (lifecycles) {
      lifecycles.predraw = function() {
        for (const game of this._clickeryGames ?? []) {
          game.drawnByP5 = true;
          game.update(this.deltaTime);
        }
      };
    }
    fn.createGameCanvas = function(width, height) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        throw new RangeError(`createGameCanvas needs positive integer sizes, got ${width}x${height}`);
      }
      this.clickery = { ...this.clickery, logicalWidth: width, logicalHeight: height };
      return this.createCanvas(width, height);
    };
  }
  function registerClickery(p52) {
    p52.registerAddon(clickeryAddon);
  }

  // src/global.js
  var p5 = globalThis.p5;
  if (p5) {
    registerClickery(p5);
    Object.assign(p5.clickery, index_exports);
  } else {
    console.error("p5.clickery: load p5.js before p5.clickery.js");
  }
})();
