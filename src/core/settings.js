// Player settings: text speed, subtitles on/off and audio volumes. They belong
// to the player, not to a save game, so they live in their own storage key and
// are not part of the state store.
const RANGES = {
  textSpeed: [0.25, 4],
  masterVolume: [0, 1],
  musicVolume: [0, 1],
  sfxVolume: [0, 1],
  voiceVolume: [0, 1],
};
const DEFAULTS = {
  textSpeed: 1,
  subtitles: true,
  masterVolume: 1,
  musicVolume: 0.7,
  sfxVolume: 1,
  voiceVolume: 1,
};

/**
 * The player's settings: `textSpeed` (0.25 to 4), `subtitles` (on or off) and the volumes
 * `masterVolume`, `musicVolume`, `sfxVolume` and `voiceVolume` (0 to 1). They belong to the
 * player, not to a saved game, so they are kept under their own storage key. A game has one:
 * `game.settings`.
 *
 * @example
 * game.settings.set('musicVolume', 0.4);   // clamped to its range, saved, listeners told
 * game.settings.onChange((name, value) => console.log(name, value));
 *
 * @param {Object} [options]
 * @param {Storage} [options.storage] Default: `localStorage`.
 * @param {string} [options.key='p5.clickery:settings'] The storage key.
 * @param {Object} [options.defaults] Overrides for the default values.
 */
export class Settings {
  #values;
  #listeners = new Set();

  constructor({ storage = globalThis.localStorage, key = 'p5.clickery:settings', defaults = {} } = {}) {
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
      try { this.set(name, value); } catch { /* keep the default */ }
    }
    return true;
  }

  /**
   * Writes the settings to storage. `set` does it for you; in a private window it quietly does nothing.
   */
  save() {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.#values));
    } catch { /* private mode or full storage: settings just last for this session */ }
  }

  #check(name) {
    if (!(name in this.defaults)) throw new Error(`unknown setting "${name}"`);
  }

  #clean(name, value) {
    if (typeof this.defaults[name] === 'boolean') {
      if (typeof value !== 'boolean') throw new TypeError(`${name} must be true or false`);
      return value;
    }
    if (typeof value !== 'number' || Number.isNaN(value)) throw new TypeError(`${name} must be a number`);
    const [lo, hi] = RANGES[name] ?? [-Infinity, Infinity];
    return Math.min(hi, Math.max(lo, value));
  }
}

/**
 * Applies the text speed and subtitle settings to a subtitle bar and to actors, now and whenever
 * they change. A game does this for its hero and subtitles.
 * @param {Settings} settings
 * @param {Object} [targets]
 * @param {SubtitleBar} [targets.subtitles]
 * @param {Actor[]} [targets.actors]
 * @returns {function(): void} A function that stops it.
 */
export function bindTextSettings(settings, { subtitles = null, actors = [] } = {}) {
  const apply = () => {
    if (subtitles) {
      subtitles.speed = settings.get('textSpeed');
      subtitles.enabled = settings.get('subtitles');
    }
    for (const actor of actors) actor.textSpeed = settings.get('textSpeed');
  };
  apply();
  return settings.onChange(apply);
}
