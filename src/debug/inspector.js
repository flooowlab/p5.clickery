// The state inspector: a panel beside the running game that shows its memory live (flags, variables,
// the inventory, the current room), lets you change it to test a puzzle without replaying it, and
// logs the events as they happen. The DOM is built by hand so it needs no library, and it is only
// built while the panel is open.

/** Flattens `{ a: { b: true } }` into `[['a.b', true]]`. */
export function flatten(object, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(object ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) out.push(...flatten(value, path));
    else out.push([path, value]);
  }
  return out;
}

/**
 * A panel beside the running game that shows its memory live: the current room, the flags (click to
 * switch one), the inventory (tick to give or take an item), the whole state as editable JSON, and
 * a log of the events as they happen. Change something to test a puzzle without replaying it, or
 * jump to any room. Browser only. A game opens one with the `inspectorKey` option (for example
 * `inspectorKey: 'i'`); `game.inspector` is it.
 *
 * @example
 * const game = createGame({ rooms, inspectorKey: 'i' });  // press I while playing
 * game.inspector.show();                                  // or open it from code
 *
 * @param {Game} game
 * @param {Object} [options]
 * @param {Document} [options.document] Default: the page's.
 * @param {number} [options.maxEvents=60] How many events the log keeps.
 */
export class StateInspector {
  #game;
  #doc;
  #maxEvents;
  #root = null;
  #refs = {};
  #stops = [];
  #log = [];

  constructor(game, { document = globalThis.document, maxEvents = 60 } = {}) {
    this.#game = game;
    this.#doc = document;
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
      events: [...this.#log],
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
      if (type !== 'update') this.#record(type, args);
      return emit(type, ...args);
    };
    this.#stops.push(() => { delete events.emit; }, state.watch('', () => this.refresh()));
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
    const roomsKey = `${snap.rooms.join()}|${snap.room}`; // rebuilding the list would undo a choice the user is making
    if (r.roomsKey !== roomsKey) {
      r.roomsKey = roomsKey;
      this.#fill(r.rooms, snap.rooms.map((id) => this.#option(id, id === snap.room)));
    }
    this.#fill(r.items, snap.items.map((id) => this.#row(id, snap.carried.includes(id), (on) => (on ? this.#game.give(id) : this.#game.take(id)))));
    this.#fill(r.flags, snap.flags.length
      ? snap.flags.map(([path, value]) => (typeof value === 'boolean'
        ? this.#row(path, value, (on) => this.#game.state.set(`flags.${path}`, on))
        : this.#text(`${path} = ${JSON.stringify(value)}`)))
      : [this.#text('no flags yet')]);
    if (this.#doc.activeElement !== r.json) r.json.value = JSON.stringify(snap.state, null, 2);
    this.#fill(r.events, snap.events.slice(-12).reverse().map((e) => this.#text(`${e.type}  ${e.data}`)));
  }

  #record(type, args) {
    let data = '';
    try { data = JSON.stringify(args.length === 1 ? args[0] : args) ?? ''; } catch { data = '(not shown)'; }
    this.#log.push({ type, data: data.length > 80 ? `${data.slice(0, 77)}...` : data });
    if (this.#log.length > this.#maxEvents) this.#log.shift();
    this.refresh();
  }

  async #apply(reenter) {
    const r = this.#refs;
    try {
      this.#game.state.fromJSON(JSON.parse(r.json.value));
      r.message.textContent = 'applied';
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
    const heading = (text) => el('div', { textContent: text, style: { margin: '10px 0 4px', color: '#8f98ad', textTransform: 'uppercase', fontSize: '11px' } });
    const button = (text, fn) => el('button', { textContent: text, on: { click: fn }, style: { marginRight: '4px' } });
    const r = this.#refs;
    r.room = el('div');
    r.rooms = el('select');
    r.items = el('div');
    r.flags = el('div');
    r.json = el('textarea', { rows: 10, spellcheck: false, style: { width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '11px' } });
    r.message = el('div', { style: { color: '#ffd678' } });
    r.events = el('div', { style: { color: '#b4bccc' } });
    this.#root = el('div', { style: {
      position: 'fixed', top: '0', right: '0', bottom: '0', width: '320px', overflow: 'auto', zIndex: '99999', padding: '8px 10px',
      background: 'rgba(20,22,28,0.96)', color: '#e2e5ee', font: '12px/1.5 ui-monospace, Consolas, monospace', borderLeft: '1px solid #3a3f4c',
    } },
    el('div', { style: { display: 'flex', justifyContent: 'space-between' } },
      el('b', { textContent: 'State inspector' }), button('close', () => this.hide())),
    r.room,
    heading('go to a room'),
    el('div', {}, r.rooms, button('go', () => this.#game.goTo(r.rooms.value))),
    heading('inventory'), r.items,
    heading('flags'), r.flags,
    heading('state (json)'), r.json,
    el('div', {}, button('apply', () => this.#apply(false)), button('apply + re-enter room', () => this.#apply(true))),
    r.message,
    heading('game'),
    el('div', {}, button('save', () => this.#game.save()), button('load', () => this.#game.load())),
    heading('events'), r.events);
    doc.body.appendChild(this.#root);
  }

  #fill(parent, nodes) {
    parent.textContent = '';
    nodes.forEach((n) => parent.appendChild(n));
  }

  #text(text) {
    const node = this.#doc.createElement('div');
    node.textContent = text;
    return node;
  }

  #option(value, selected) {
    const node = this.#doc.createElement('option');
    Object.assign(node, { value, textContent: value, selected });
    return node;
  }

  #row(label, checked, onChange) {
    const input = this.#doc.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const row = this.#doc.createElement('label');
    row.style.display = 'block';
    row.appendChild(input);
    row.appendChild(this.#doc.createTextNode(` ${label}`));
    return row;
  }
}
