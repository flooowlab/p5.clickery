import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCore, Actor, Camera, HoverTracker, createHotspots, parseRoom, Inventory, Interactor,
  PointerController, InventoryBar, hoverLabel, defaultStrings, applyHotspotState, StateStore, EventBus,
} from '../../src/index.js';

const poly = (x, y) => [[x, y], [x + 40, y], [x + 40, y + 40], [x, y + 40]];

const ITEMS = {
  stick: { name: 'item.stick' }, string: { name: 'item.string' }, pole: { name: 'item.pole' }, key: { name: 'item.key' },
};
const RECIPES = [{ a: 'stick', b: 'string', result: 'pole', say: 'combine.pole' }];
const STRINGS = {
  ...defaultStrings,
  'item.stick': 'stick', 'item.string': 'string', 'item.pole': 'fishing pole', 'item.key': 'key',
  'obj.stick': 'Stick', 'obj.string': 'Ball of string', 'obj.grate': 'Grate',
  'got.stick': 'A sturdy stick.', 'got.string': 'Some string.', 'combine.pole': 'A fishing pole!', 'got.key': 'The key!',
};

// The three-object puzzle: pick up a stick and some string, combine them into
// a pole, use the pole to fish a key out of the grate.
function makeGame() {
  const core = createCore();
  core.i18n.add('en', STRINGS);
  core.state.set('currentRoom', 'r');
  const room = parseRoom({
    id: 'r', width: 640, height: 360, starts: { default: { x: 0, y: 0 } },
    hotspots: [
      { id: 'stick', name: 'obj.stick', provider: 'polygon', points: poly(100, 100), walkTo: { x: 120, y: 160 } },
      { id: 'string', name: 'obj.string', provider: 'polygon', points: poly(200, 100), walkTo: { x: 220, y: 160 } },
      { id: 'grate', name: 'obj.grate', provider: 'polygon', points: poly(300, 100), walkTo: { x: 320, y: 160 } },
    ],
  });
  const hero = new Actor({ id: 'hero', x: 20, y: 160, speed: 2000, translate: (k) => core.i18n.t(k) });
  const hover = new HoverTracker(core.events);
  hover.setHotspots(createHotspots(room));
  const inventory = new Inventory({ state: core.state, events: core.events, items: ITEMS, recipes: RECIPES });
  const interactor = new Interactor({ hero, state: core.state, events: core.events, inventory, hover });
  const errors = [];
  interactor.onError = (e) => errors.push(e);

  interactor.register('stick', { async onInteract(c) { c.inventory.give('stick'); c.setEnabled('stick', false); await c.say('got.stick'); } });
  interactor.register('string', { async onInteract(c) { c.inventory.give('string'); c.setEnabled('string', false); await c.say('got.string'); } });
  interactor.register('grate', {
    async onUse(c) {
      if (c.item !== 'pole') return false;
      c.inventory.remove('pole');
      c.inventory.give('key');
      await c.say('got.key');
    },
  });

  const camera = new Camera(640, 360);
  const bar = new InventoryBar({ viewWidth: 640, viewHeight: 360 });
  const pointer = new PointerController({ interactor, hover, camera, bar, scheduler: core.scheduler });
  pointer.onError = (e) => errors.push(e);

  const tick = (dt = 20) => { core.scheduler.update(dt); hero.update(dt); core.events.emit('update', dt); };
  const settle = async (limit = 2000) => {
    for (let i = 0; i < limit; i++) {
      await new Promise((r) => setImmediate(r));
      tick();
      if (interactor.phase === 'idle') { await new Promise((r) => setImmediate(r)); return; }
    }
    throw new Error('action never finished');
  };
  const said = [];
  const origSay = hero.say.bind(hero);
  hero.say = (key, o) => { said.push(key); return origSay(key, o); };
  const click = async (x, y, extra = {}) => { pointer.down({ x, y, ...extra }); pointer.up({ x, y }); await settle(); };
  const slot = (i) => { const r = bar.slotRect(i); return [r.x + 5, r.y + 5]; };
  return { core, hero, hover, inventory, interactor, pointer, bar, tick, settle, said, click, slot, errors };
}

describe('Inventory', () => {
  const make = () => {
    const events = new EventBus();
    const state = new StateStore();
    const log = [];
    events.on('inventory:add', (e) => log.push(`+${e.id}`));
    events.on('inventory:remove', (e) => log.push(`-${e.id}`));
    return { inv: new Inventory({ state, events, items: ITEMS, recipes: [...RECIPES, { a: 'key', b: 'pole', result: 'string', consume: ['b'] }] }), state, log };
  };

  it('gives once, removes, and stores the list in state', () => {
    const { inv, state, log } = make();
    assert.equal(inv.give('stick'), true);
    assert.equal(inv.give('stick'), false);
    assert.deepEqual(state.get('inventory'), ['stick']);
    assert.equal(inv.remove('stick'), true);
    assert.equal(inv.remove('stick'), false);
    assert.deepEqual(log, ['+stick', '-stick']);
    assert.throws(() => inv.give('unicorn'), /unknown item/);
  });

  it('combines in either order, consuming ingredients', () => {
    const { inv } = make();
    inv.give('string');
    inv.give('stick');
    assert.equal(inv.combine('string', 'stick').result, 'pole');
    assert.deepEqual(inv.list, ['pole']);
  });

  it('keeps ingredients that are not consumed; refuses without both or a recipe', () => {
    const { inv } = make();
    inv.give('key');
    assert.equal(inv.combine('key', 'pole'), null);
    inv.give('pole');
    assert.equal(inv.combine('pole', 'key').result, 'string');
    assert.deepEqual(inv.list.sort(), ['key', 'string']);
    assert.equal(inv.combine('key', 'key'), null);
    assert.equal(inv.combine('key', 'string'), null);
  });
});

describe('puzzle with the mouse', () => {
  it('pick, combine, use', async () => {
    const g = makeGame();
    const [stickX, stickY] = [120, 120];
    await g.click(stickX, stickY);
    assert.deepEqual([g.hero.x, g.hero.y], [120, 160], 'hero walked to the stick');
    assert.deepEqual(g.inventory.list, ['stick']);
    assert.equal(g.hover.hotspots.find((h) => h.id === 'stick').enabled, false);
    assert.equal(g.core.state.get('rooms.r.hotspots.stick.enabled'), false);

    await g.click(220, 120);
    assert.deepEqual(g.inventory.list, ['stick', 'string']);

    await g.click(...g.slot(0));
    assert.equal(g.interactor.held, 'stick');
    await g.click(...g.slot(1));
    assert.deepEqual(g.inventory.list, ['pole']);
    assert.equal(g.interactor.held, null);
    assert.ok(g.said.includes('combine.pole'));

    await g.click(...g.slot(0));
    await g.click(320, 120);
    assert.deepEqual(g.inventory.list, ['key']);
    assert.equal(g.interactor.held, null, 'a used-up item is deselected');
    assert.deepEqual(g.said, ['got.stick', 'got.string', 'combine.pole', 'got.key']);
    assert.deepEqual(g.errors, []);
  });

  it('falls back to default responses', async () => {
    const g = makeGame();
    await g.click(320, 120);
    assert.equal(g.said.at(-1), 'default.interact');
    g.pointer.down({ x: 320, y: 120, button: 2 });
    await g.settle();
    assert.equal(g.said.at(-1), 'default.look');
    await g.click(120, 120);
    await g.click(...g.slot(0));
    await g.click(320, 120);
    assert.equal(g.said.at(-1), 'default.use', 'wrong item on the grate');
    assert.equal(g.interactor.held, 'stick', 'still holding it');
    await g.click(...g.slot(0));
    assert.equal(g.interactor.held, null, 'tapping the held item again puts it away');
    assert.deepEqual(g.inventory.list, ['stick'], 'the string was never picked up while holding the stick');
    assert.deepEqual(g.errors, []);
  });

  it('items with no recipe answer with the combine default; items can be looked at', async () => {
    const g = makeGame();
    g.inventory.give('stick');
    g.inventory.give('key');
    g.interactor.select('stick');
    await g.click(...g.slot(1));
    assert.equal(g.said.at(-1), 'default.combine');
    assert.deepEqual(g.inventory.list, ['stick', 'key']);
    g.pointer.down({ x: g.slot(0)[0], y: g.slot(0)[1], button: 2 });
    await g.settle();
    assert.equal(g.said.at(-1), 'default.look');
  });

  it('a click while walking redirects; a click during a handler is ignored', async () => {
    const g = makeGame();
    g.hero.speed = 100;
    g.pointer.down({ x: 320, y: 120 });
    g.pointer.up({ x: 320, y: 120 });
    for (let i = 0; i < 5; i++) { await new Promise((r) => setImmediate(r)); g.tick(); }
    assert.equal(g.interactor.phase, 'walk');
    await g.click(400, 250); // the floor
    assert.deepEqual(g.said, [], 'the grate was never reached');
    assert.equal(g.interactor.phase, 'idle');

    g.hero.speed = 2000;
    g.pointer.down({ x: 120, y: 120 });
    g.pointer.up({ x: 120, y: 120 });
    for (let i = 0; i < 20 && g.interactor.phase !== 'act'; i++) { await new Promise((r) => setImmediate(r)); g.tick(); }
    assert.equal(g.interactor.phase, 'act');
    g.pointer.down({ x: 400, y: 250 });
    g.pointer.up({ x: 400, y: 250 });
    await g.settle();
    assert.deepEqual([g.hero.x, g.hero.y], [120, 160], 'ignored while the line was playing');
  });

  it('a handler that throws is reported and does not wedge input', async () => {
    const g = makeGame();
    g.interactor.register('grate', { onInteract() { throw new Error('script bug'); } });
    await g.click(320, 120);
    assert.equal(g.errors.length, 1);
    assert.equal(g.interactor.phase, 'idle');
  });

  it('disabled hotspots stop reacting, and the flag survives save/load', async () => {
    const g = makeGame();
    await g.click(120, 120);
    assert.equal(g.hover.at(120, 120), null);
    const saved = g.core.state.toJSON();
    const state = new StateStore();
    state.fromJSON(saved);
    const fresh = createHotspots(parseRoom({
      id: 'r', width: 640, height: 360, starts: { default: { x: 0, y: 0 } },
      hotspots: [{ id: 'stick', provider: 'polygon', points: poly(100, 100) }, { id: 'grate', provider: 'polygon', points: poly(300, 100) }],
    }));
    applyHotspotState(state, 'r', fresh);
    assert.deepEqual(fresh.map((h) => h.enabled), [false, true]);
    assert.deepEqual(state.get('inventory'), ['stick']);
  });
});

describe('puzzle with touch', () => {
  const tap = async (g, x, y) => {
    g.pointer.down({ x, y, pointerType: 'touch' });
    g.pointer.up({ x, y });
    await g.settle();
  };

  it('first tap highlights, second tap acts', async () => {
    const g = makeGame();
    await tap(g, 120, 120);
    assert.equal(g.pointer.highlighted?.id, 'stick');
    assert.equal(g.hover.hovered.id, 'stick');
    assert.deepEqual(g.inventory.list, []);
    assert.equal(g.hero.x, 20);
    await tap(g, 120, 120);
    assert.deepEqual(g.inventory.list, ['stick']);
    assert.equal(g.pointer.highlighted, null);
  });

  it('tapping a different hotspot moves the highlight; tapping the floor walks straight away', async () => {
    const g = makeGame();
    await tap(g, 120, 120);
    await tap(g, 220, 120);
    assert.equal(g.pointer.highlighted.id, 'string');
    assert.deepEqual(g.inventory.list, []);
    await tap(g, 400, 250);
    assert.equal(g.pointer.highlighted, null);
    assert.deepEqual([g.hero.x, g.hero.y], [400, 250]);
  });

  it('long press looks without acting on release; moving away cancels it', async () => {
    const g = makeGame();
    g.pointer.down({ x: 120, y: 120, pointerType: 'touch' });
    for (let i = 0; i < 30; i++) g.tick(20);
    g.pointer.up({ x: 120, y: 120 });
    await g.settle();
    assert.equal(g.said.at(-1), 'default.look');
    assert.deepEqual(g.inventory.list, []);
    assert.equal(g.said.length, 1);

    g.pointer.down({ x: 120, y: 120, pointerType: 'touch' });
    g.pointer.move({ x: 200, y: 200 });
    for (let i = 0; i < 40; i++) g.tick(20);
    g.pointer.up({ x: 200, y: 200 });
    await g.settle();
    assert.equal(g.said.length, 1, 'dragging cancelled both the look and the tap');
  });

  it('touch does not change hover while a finger is down', () => {
    const g = makeGame();
    g.pointer.down({ x: 120, y: 120, pointerType: 'touch' });
    g.pointer.move({ x: 122, y: 121 });
    assert.equal(g.hover.hovered, null);
  });
});

describe('mouse hover', () => {
  it('hover follows the pointer, and the bar swallows clicks aimed at items', async () => {
    const g = makeGame();
    g.pointer.move({ x: 120, y: 120 });
    assert.equal(g.hover.hovered.id, 'stick');
    g.inventory.give('key');
    g.pointer.move({ x: g.slot(0)[0], y: g.slot(0)[1] });
    assert.equal(g.hover.hovered, null);
    assert.equal(g.pointer.hoveredItem, 'key');
    g.pointer.leave();
    assert.equal(g.pointer.hoveredItem, null);
    await g.click(300, 330); // empty part of the bar
    assert.equal(g.hero.x, 20, 'no walk');
  });
});

describe('verbs mode', () => {
  it('uses the chosen verb', async () => {
    const g = makeGame();
    g.interactor.mode = 'verbs';
    g.interactor.verb = 'look';
    await g.click(120, 120);
    assert.equal(g.said.at(-1), 'default.look');
    assert.deepEqual(g.inventory.list, [], 'looking did not pick it up');
    g.interactor.verb = 'interact';
    await g.click(120, 120);
    assert.deepEqual(g.inventory.list, ['stick']);
    g.interactor.verb = 'walk';
    await g.click(220, 120);
    assert.deepEqual([g.hero.x, g.hero.y], [220, 160]);
    assert.equal(g.inventory.has('string'), false);
    g.interactor.verb = 'use';
    await g.click(220, 120);
    assert.equal(g.said.at(-1), 'default.use');
  });
});

describe('hoverLabel', () => {
  const g = makeGame();
  const t = (k, v) => g.core.i18n.t(k, v);
  const stick = g.hover.hotspots[0];
  const label = (o) => hoverLabel({ inventory: g.inventory, t, ...o });

  it('names things, and describes using a held item', () => {
    assert.equal(label({ hotspot: stick }), 'Stick');
    assert.equal(label({ hotspot: stick, held: 'key' }), 'Use key with Stick');
    assert.equal(label({ held: 'key' }), 'Use key with...');
    assert.equal(label({}), '');
    assert.equal(label({ item: 'pole' }), 'fishing pole');
    assert.equal(label({ item: 'pole', held: 'key' }), 'Use key with fishing pole');
    assert.equal(label({ item: 'key', held: 'key' }), 'key');
  });

  it('shows the verb in verbs mode', () => {
    assert.equal(label({ hotspot: stick, mode: 'verbs', verb: 'look' }), 'Look at Stick');
  });
});

describe('InventoryBar', () => {
  const bar = new InventoryBar({ viewWidth: 640, viewHeight: 360 });

  it('hit-tests slots and the strip', () => {
    const items = ['a', 'b'];
    const r1 = bar.slotRect(1);
    assert.equal(bar.itemAt(r1.x + 1, r1.y + 1, items), 'b');
    assert.equal(bar.itemAt(r1.x + r1.w + 1, r1.y + 1, items), null, 'in the gap');
    assert.equal(bar.itemAt(bar.slotRect(2).x + 1, r1.y + 1, items), null, 'empty slot');
    assert.ok(bar.contains(5, 350));
    assert.ok(!bar.contains(5, 100));
  });
});
