// The single state store. Everything in it is plain JSON data, so save/load is
// a dump and restore. Paths are dot-separated: "flags.doorOpen", "rooms.cellar.lit".
const initial = () => ({ flags: {}, vars: {}, inventory: [], rooms: {}, currentRoom: null });

/**
 * The game's memory: flags, variables, the inventory, per-room facts and the current room, all
 * plain data, so saving and loading is a dump and a restore. A game has one: `game.state`.
 *
 * Paths are dot-separated: `'flags.doorOpen'`, `'rooms.cellar.lit'`. By convention `flags.*` holds
 * yes/no facts, `vars.*` numbers and text, and `rooms.<id>.*` things about one room. The library
 * itself uses `inventory`, `currentRoom` and `rooms.<id>.visited`.
 *
 * Values must be JSON data (numbers, text, true/false, arrays, objects); functions and `undefined`
 * are rejected, so use `null` for "nothing". `get` returns a copy, so always change things with `set`.
 *
 * @example
 * game.state.set('flags.doorOpen', true);
 * game.state.get('flags.doorOpen');        // true
 * game.state.get('flags.missing', false);  // false: the second argument is the fallback
 * game.state.watch('flags.doorOpen', (now, before) => console.log(before, '->', now));
 */
export class StateStore {
  #data = initial();
  #watchers = new Map();

  /**
   * Reads a value.
   * @param {string} [path] A dotted path. Without one, the whole state.
   * @param {*} [fallback] Returned when nothing is stored at the path.
   * @returns {*} A copy of the value.
   */
  get(path, fallback) {
    if (path === undefined || path === '') return this.toJSON();
    const value = getIn(this.#data, path);
    return value === undefined ? fallback : clone(value);
  }

  /**
   * Stores a value, creating the path as needed, and tells whoever is watching it.
   * @param {string} path A dotted path.
   * @param {*} value JSON data. `undefined` is rejected: use `null`.
   */
  set(path, value) {
    const keys = split(path);
    if (keys.length === 0) throw new Error('set() needs a path');
    if (value === undefined) throw new TypeError('state values cannot be undefined, use null');
    const stored = clone(value);
    const before = this.toJSON();
    let node = this.#data;
    for (const key of keys.slice(0, -1)) {
      if (node[key] === null || typeof node[key] !== 'object') node[key] = {};
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
    if (!this.#watchers.has(path)) this.#watchers.set(path, new Set());
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
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
      throw new TypeError('fromJSON needs an object');
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
}

function split(path) {
  return String(path).split('.').filter(Boolean);
}

function getIn(data, path) {
  let node = data;
  for (const key of split(path)) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, key)) return undefined;
    node = node[key];
  }
  return node;
}

// Deep copy that rejects anything JSON cannot represent faithfully.
function clone(value) {
  if (value === undefined) return undefined;
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError(`state values must be JSON-serialisable, got ${typeof value}`);
  return JSON.parse(json);
}
