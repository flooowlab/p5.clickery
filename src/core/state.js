// The single state store. Everything in it is plain JSON data, so save/load is
// a dump and restore. Paths are dot-separated: "flags.doorOpen", "rooms.cellar.lit".
const initial = () => ({ flags: {}, vars: {}, inventory: [], rooms: {}, currentRoom: null });

export class StateStore {
  #data = initial();
  #watchers = new Map();

  get(path, fallback) {
    if (path === undefined || path === '') return this.toJSON();
    const value = getIn(this.#data, path);
    return value === undefined ? fallback : clone(value);
  }

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

  // Calls fn(newValue, oldValue, path) when the value at `path` changes, including
  // changes made to a parent or child path. Returns an unsubscribe function.
  watch(path, fn) {
    if (!this.#watchers.has(path)) this.#watchers.set(path, new Set());
    this.#watchers.get(path).add(fn);
    return () => this.#watchers.get(path)?.delete(fn);
  }

  toJSON() {
    return clone(this.#data);
  }

  // Replaces all state. Missing top-level keys get their defaults.
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
