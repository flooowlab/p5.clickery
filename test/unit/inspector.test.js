import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, StateInspector, EventBus } from '../../src/index.js';
import { flatten } from '../../src/debug/inspector.js';

// The smallest DOM the inspector needs.
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.listeners = {}; this._text = ''; this.parent = null; }
  get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text; }
  set textContent(value) { this.children = []; this._text = value; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  fire(type) { for (const fn of this.listeners[type] ?? []) fn(); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
  find(test) {
    if (test(this)) return this;
    for (const c of this.children) { const found = c.find(test); if (found) return found; }
    return null;
  }
}
const fakeDocument = () => ({
  body: new El('body'),
  activeElement: null,
  createElement: (tag) => new El(tag),
  createTextNode: (text) => Object.assign(new El('#text'), { _text: text }),
});
const button = (doc, text) => doc.body.find((n) => n.tag === 'button' && n.textContent === text);
const checkbox = (doc, label) => doc.body.find((n) => n.tag === 'label' && n.textContent.trim() === label)?.children[0];

const room = (id, x) => ({
  id, width: 640, height: 360, color: '#222',
  starts: { default: { x, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
  hotspots: [],
});
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

async function setup(options = {}) {
  const game = new Game({ rooms: [room('yard', 80), room('hall', 200)], items: { key: 'brass key', coin: 'coin' }, storage: memory(), ...options });
  await game.start();
  const doc = fakeDocument();
  const inspector = new StateInspector(game, { document: doc, ...options.inspector });
  return { game, doc, inspector };
}

test('flatten turns nested objects into dotted paths', () => {
  assert.deepEqual(flatten({ a: true, b: { c: 1, d: { e: 'x' } }, f: [1, 2] }), [['a', true], ['b.c', 1], ['b.d.e', 'x'], ['f', [1, 2]]]);
  assert.deepEqual(flatten(undefined), []);
});

test('snapshot is plain data about the room, the hero, the flags and the inventory', async () => {
  const { game, inspector } = await setup();
  game.flag('doorOpen', true);
  game.state.set('flags.once.statue.look', true);
  game.give('key');
  const snap = inspector.snapshot();
  assert.equal(snap.room, 'yard');
  assert.deepEqual(snap.rooms, ['yard', 'hall']);
  assert.deepEqual(snap.flags, [['doorOpen', true], ['once.statue.look', true]]);
  assert.deepEqual(snap.items, ['key', 'coin']);
  assert.deepEqual(snap.carried, ['key']);
  assert.equal(snap.hero.x, 80);
  assert.equal(snap.state.currentRoom, 'yard');
});

test('showing builds the panel once, and hiding removes it', async () => {
  const { doc, inspector } = await setup();
  assert.equal(inspector.visible, false);
  inspector.show();
  inspector.show();
  assert.equal(inspector.visible, true);
  assert.equal(doc.body.children.length, 1);
  assert.match(doc.body.children[0].textContent, /State inspector/);
  assert.match(doc.body.children[0].textContent, /room: yard/);
  inspector.hide();
  assert.equal(doc.body.children.length, 0);
  inspector.toggle();
  assert.equal(doc.body.children.length, 1);
  inspector.toggle();
  assert.equal(inspector.visible, false);
});

test('while open it logs events (not update), keeps the newest, and hiding restores the event bus', async () => {
  const { game, doc, inspector } = await setup({ inspector: { maxEvents: 3 } });
  assert.equal(Object.hasOwn(game.events, 'emit'), false);
  inspector.show();
  game.update(16);
  game.give('key');
  assert.deepEqual(inspector.snapshot().events.map((e) => e.type), ['inventory:add']);
  assert.match(doc.body.children[0].textContent, /inventory:add {2}{"id":"key"}/);
  for (let i = 0; i < 5; i++) game.events.emit('ping', i);
  assert.deepEqual(inspector.snapshot().events.map((e) => e.data), ['2', '3', '4']);
  inspector.hide();
  assert.equal(Object.hasOwn(game.events, 'emit'), false);
  assert.equal(game.events.emit, EventBus.prototype.emit);
  game.events.emit('after', 1);
  assert.equal(inspector.snapshot().events.length, 3);
});

test('the panel follows the state, and flag and inventory boxes change it', async () => {
  const { game, doc, inspector } = await setup();
  game.flag('doorOpen', true);
  inspector.show();
  assert.equal(checkbox(doc, 'doorOpen').checked, true);
  assert.equal(checkbox(doc, 'key').checked, false);

  game.flag('lampLit', true);
  assert.equal(checkbox(doc, 'lampLit').checked, true, 'refreshes when the state changes');

  const door = checkbox(doc, 'doorOpen');
  door.checked = false;
  door.fire('change');
  assert.equal(game.flag('doorOpen'), false);

  const key = checkbox(doc, 'key');
  key.checked = true;
  key.fire('change');
  assert.equal(game.has('key'), true);
  key.checked = false;
  key.fire('change');
  assert.equal(game.has('key'), false);
});

test('the json can be edited and applied, and a mistake says so without changing anything', async () => {
  const { game, doc, inspector } = await setup();
  inspector.show();
  const json = doc.body.find((n) => n.tag === 'textarea');
  assert.equal(JSON.parse(json.value).currentRoom, 'yard');

  json.value = JSON.stringify({ flags: { solved: true }, inventory: ['coin'] });
  button(doc, 'apply').fire('click');
  assert.equal(game.flag('solved'), true);
  assert.deepEqual(game.inventory.list, ['coin']);
  assert.match(doc.body.textContent, /applied/);

  json.value = '{ not json';
  button(doc, 'apply').fire('click');
  assert.match(doc.body.textContent, /not applied/);
  assert.equal(game.flag('solved'), true);
});

test('apply + re-enter room puts the room back from the edited state', async () => {
  const { game, doc, inspector } = await setup();
  inspector.show();
  const json = doc.body.find((n) => n.tag === 'textarea');
  json.value = JSON.stringify({ currentRoom: 'hall', rooms: { hall: { visited: true } } });
  button(doc, 'apply + re-enter room').fire('click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.room.id, 'hall');
});

test('the room list jumps to a room, and a choice in it survives events', async () => {
  const { game, doc, inspector } = await setup();
  inspector.show();
  const select = doc.body.find((n) => n.tag === 'select');
  assert.deepEqual(select.children.map((o) => o.value), ['yard', 'hall']);
  select.value = 'hall';
  game.events.emit('hover', { id: null }); // an event refreshes the panel
  assert.equal(select.value, 'hall', 'the list is not rebuilt while the room is the same');

  button(doc, 'go').fire('click');
  for (let i = 0; i < 20 && game.room.id !== 'hall'; i++) {
    game.update(100);
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(game.room.id, 'hall');
  assert.match(doc.body.textContent, /room: hall/);
});

test('save and load buttons use the game', async () => {
  const { game, doc, inspector } = await setup();
  inspector.show();
  game.give('coin');
  button(doc, 'save').fire('click');
  game.take('coin');
  button(doc, 'load').fire('click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.has('coin'), true);
});

test('the inspectorKey option exists and is off by default', async () => {
  const { game } = await setup();
  assert.equal(game.options.inspectorKey, null);
  assert.equal(game.inspector, null);
});
