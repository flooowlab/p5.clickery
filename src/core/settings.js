// Player settings: text speed, subtitles on/off and audio volumes. They belong
// to the player, not to a save game, so they live in their own storage key and
// are not part of the state store.
//
//   settings.set('musicVolume', 0.4);        // clamped to its range, saved, listeners told
//   settings.onChange((name, value) => ...);
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

export class Settings {
  #values;
  #listeners = new Set();

  constructor({ storage = globalThis.localStorage, key = 'p5.clickery:settings', defaults = {} } = {}) {
    this.storage = storage;
    this.key = key;
    this.defaults = { ...DEFAULTS, ...defaults };
    this.#values = { ...this.defaults };
  }

  get all() {
    return { ...this.#values };
  }

  get(name) {
    this.#check(name);
    return this.#values[name];
  }

  set(name, value) {
    this.#check(name);
    const next = this.#clean(name, value);
    if (next === this.#values[name]) return next;
    this.#values[name] = next;
    this.save();
    for (const fn of [...this.#listeners]) fn(name, next, this.all);
    return next;
  }

  // Returns a function that stops listening.
  onChange(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  reset() {
    for (const [name, value] of Object.entries(this.defaults)) this.set(name, value);
  }

  // Reads saved settings; unknown or invalid entries are ignored. Returns false when nothing was saved.
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

// Applies text speed and subtitle settings to a SubtitleBar and any actors,
// now and whenever they change. Returns a function that stops it.
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
