import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Story, Compiler } from 'inkjs/full';
import { Game, attachP5, clickeryAddon } from '../../src/index.js';

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};
const box = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const yard = (extra = {}) => ({
  id: 'yard', width: 640, height: 360, color: '#223344',
  starts: { default: { x: 80, y: 300, dir: 'right' }, back: { x: 600, y: 300 } },
  walkable: [{ id: 'floor', points: box(0, 250, 640, 340) }],
  hotspots: [
    { id: 'sign', name: 'obj.sign', provider: 'polygon', points: box(300, 170, 380, 250), walkTo: { x: 340, y: 290, dir: 'up' }, color: '#963' },
    { id: 'key', name: 'obj.key', provider: 'polygon', points: box(100, 260, 130, 280), walkTo: { x: 115, y: 300 } },
  ],
  ...extra,
});

const frames = async (game, promise, { choose = 0, limit = 3000 } = {}) => {
  let done = false;
  promise.then(() => { done = true; }, () => { done = true; });
  for (let i = 0; i < limit && !done; i++) {
    await new Promise((r) => setImmediate(r));
    game.update(20);
    if (game.menu.open) game.menu.pick(choose);
    else if (game.subtitles.active) { game.subtitles.advance(); game.subtitles.advance(); }
  }
  assert.ok(done, 'never finished');
  return promise;
};

describe('Game: defaults', () => {
  it('a game is just rooms and strings; everything else is wired with defaults', async () => {
    const game = new Game({ rooms: [yard()], strings: { 'obj.sign': 'Sign' } });
    await frames(game, game.start());
    assert.equal(game.room.id, 'yard');
    assert.deepEqual([game.hero.x, game.hero.y, game.hero.dir], [80, 300, 'right']);
    assert.deepEqual(game.hover.hotspots.map((h) => h.id), ['sign', 'key']);
    assert.ok(game.hero.navigator, 'the hero walks on the room floor');
    assert.equal(game.i18n.t('obj.sign'), 'Sign');
    assert.equal(game.i18n.t('default.use'), "I can't use that.", 'built-in strings are included');
    assert.equal(game.options.width, 640);
    assert.equal(game.audio, null, 'no sounds asked for (and no AudioContext in Node)');
  });

  it('options override the defaults', () => {
    const game = new Game({ rooms: [yard()], width: 320, height: 180, mode: 'verbs', fadeMs: 0, hero: { speed: 99, directions: 8 } });
    assert.equal(game.interactor.mode, 'verbs');
    assert.equal(game.hero.speed, 99);
    assert.equal(game.hero.directions, 8);
    assert.equal(game.bar.viewWidth, 320);
    assert.equal(game.scene.fadeMs, 0);
  });

  it('rooms can be a list or an object, and added later; start() defaults to the first', async () => {
    const game = new Game({ rooms: { a: yard({ id: 'a' }) } });
    game.addRoom(yard({ id: 'b' }));
    await frames(game, game.start());
    assert.equal(game.room.id, 'a');
    await frames(game, game.goTo('b', 'back'));
    assert.deepEqual([game.room.id, game.hero.x], ['b', 600]);
  });

  it('explains what is missing', async () => {
    await assert.rejects(new Game().start(), /add a room first/);
    await assert.rejects(new Game({ rooms: [yard()] }).start('cellar'), /no room "cellar" \(rooms: yard\)/);
  });

  it('room files are fetched by URL, and their pictures are resolved relative to them', async () => {
    const fetched = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => { fetched.push(String(url)); return { ok: true, json: async () => yard({ background: 'yard.png' }) }; };
    try {
      const game = new Game({ rooms: ['https://example.com/game/rooms/yard.json'] });
      await frames(game, game.start());
      assert.deepEqual(fetched, ['https://example.com/game/rooms/yard.json']);
      assert.equal(game.room.background, 'yard.png');
      assert.equal(game.roomURLs.get('yard'), 'https://example.com/game/rooms/yard.json');
    } finally { globalThis.fetch = realFetch; }
  });

  it('items can be given as display text; text keys are made for them', () => {
    const game = new Game({ items: { key: 'brass key', map: { text: 'old map', image: 'map.png' }, coin: { name: 'item.money' } } });
    assert.deepEqual(game.inventory.items.key, { name: 'item.key' });
    assert.equal(game.i18n.t('item.key'), 'brass key');
    assert.equal(game.i18n.t('item.map'), 'old map');
    assert.equal(game.inventory.items.map.image, 'map.png');
    assert.equal(game.inventory.items.coin.name, 'item.money');
  });
});

describe('Game: playing', () => {
  it('on() scripts objects; flag, give, take and has are shortcuts', async () => {
    const game = new Game({ rooms: [yard()], items: { key: 'key' } });
    game.on('key', { async onInteract(c) { game.give('key'); c.setEnabled('key', false); game.flag('gotKey', true); } });
    await frames(game, game.start());
    await frames(game, game.interactor.clickHotspot(game.hotspot('key')));
    assert.ok(game.has('key'));
    assert.equal(game.flag('gotKey'), true);
    assert.equal(game.flag('nothing'), false);
    assert.equal(game.hotspot('key').enabled, false);
    assert.ok(game.take('key'));
    assert.equal(game.has('key'), false);
  });

  it('say() and cutscene()', async () => {
    const game = new Game({ rooms: [yard()], strings: { hello: 'Hello' } });
    await frames(game, game.start());
    const run = game.cutscene(async () => {
      assert.ok(game.interactor.locked);
      await game.say('hello');
    });
    assert.equal(game.hero.speech.text, 'Hello');
    await frames(game, run);
    assert.equal(game.interactor.locked, false);
  });

  it('update() clamps big steps and the camera follows the hero in a wide room', async () => {
    const game = new Game({ rooms: [yard({ width: 1600, walkable: [{ id: 'f', points: box(0, 250, 1600, 340) }] })], fadeMs: 0 });
    await frames(game, game.start());
    const walk = game.hero.walkTo({ x: 1500, y: 300 });
    game.update(10_000);
    assert.ok(game.hero.x < 200, 'one huge step is clamped to 100 ms');
    await frames(game, walk);
    for (let i = 0; i < 200; i++) game.update(20);
    assert.ok(game.scene.camera.x > 800, `camera followed (x=${game.scene.camera.x})`);
    const fixed = new Game({ rooms: [yard({ width: 1600 })], followHero: false, fadeMs: 0 });
    await frames(fixed, fixed.start());
    fixed.hero.teleport(1500, 300);
    for (let i = 0; i < 50; i++) fixed.update(20);
    assert.equal(fixed.scene.camera.x, 0);
  });

  it('save() and load() keep the state and where the hero stands', async () => {
    const storage = memoryStorage();
    const a = new Game({ rooms: [yard()], storage, items: { key: 'key' } });
    await frames(a, a.start());
    a.give('key');
    a.flag('door', true);
    a.hero.teleport(222, 300);
    a.save();
    const b = new Game({ rooms: [yard()], storage, items: { key: 'key' } });
    assert.equal(await b.load(), true);
    assert.ok(b.has('key') && b.flag('door'));
    assert.equal(b.hero.x, 222);
    assert.equal(await new Game({ rooms: [yard()], storage: memoryStorage() }).load(), false);
  });
});

describe('Game: talk() takes any dialogue format', () => {
  const lines = (game) => {
    const out = [];
    game.events.on('dialogue:line', (l) => out.push(l.text));
    return out;
  };
  const inkSource = fs.readFileSync(new URL('../fixtures/guard.ink', import.meta.url), 'utf8');

  it('Markdown text', async () => {
    const game = new Game();
    const heard = lines(game);
    await frames(game, game.talk('Guard: Halt!\n* Friend -> f\n# f\nGuard: Pass.\n~ passed = true'));
    assert.deepEqual(heard, ['Halt!', 'Pass.']);
    assert.equal(game.state.get('vars.passed'), true, 'variables are kept with the game');
  });

  it('Twee text and Twison', async () => {
    const game = new Game();
    const heard = lines(game);
    await frames(game, game.talk(':: Start\nGuard: Hi\n[[Bye->end]]\n:: end\nGuard: Bye.'));
    await frames(game, game.talk({ startnode: '1', passages: [{ pid: '1', name: 'A', text: 'Guard: Twison' }] }));
    assert.deepEqual(heard, ['Hi', 'Bye.', 'Twison']);
  });

  it('compiled Ink JSON or a Story: every Ink variable is saved, giveItem / setFlag work', async () => {
    const json = new Compiler(inkSource).Compile().ToJson();
    const game = new Game({ items: { badge: 'badge' }, Story });
    const heard = lines(game);
    await frames(game, game.talk(json), { choose: 0 });
    assert.deepEqual(heard, ['Halt! Who goes there?', 'Pass, friend.']);
    assert.ok(game.has('badge'), 'EXTERNAL giveItem is bound');
    assert.equal(game.state.get('vars.passed'), true, 'the Ink variable was saved without listing it');
    await frames(game, game.talk(json), { choose: 1 });
    assert.equal(heard.at(-1), 'Then be off!', 'the same text again reuses its story and starts fresh');

    const story = new Story(json);
    await frames(game, game.talk(story), { choose: 1 });
    assert.equal(heard.at(-1), 'Then be off!');
  });

  it('Ink without inkjs loaded explains what to do; a runner is used as it is', async () => {
    const game = new Game();
    assert.throws(() => game.talk({ inkVersion: 21, root: [] }), /load ink\.js first/);
    let asked = false;
    const runner = { next: () => null, choices: () => { asked = true; return []; }, choose() {}, done: true, vars: {} };
    await frames(game, game.talk(runner));
    assert.ok(asked);
    assert.throws(() => game.talk(42), TypeError);
  });
});

// ---- a stand-in for a p5 sketch and the page around it ----
function fakeSketch() {
  const listeners = {};
  const docListeners = {};
  const doc = { documentElement: { style: {} }, body: { style: {} }, addEventListener: (t, fn) => { docListeners[t] = fn; } };
  const parent = { tagName: 'MAIN', style: {}, clientWidth: 1280, clientHeight: 720, parentElement: doc.body };
  const el = {
    style: {}, parentElement: parent, ownerDocument: doc,
    addEventListener: (t, fn) => { listeners[t] = fn; },
    getBoundingClientRect() { return { left: parseFloat(this.style.left) || 0, top: parseFloat(this.style.top) || 0, width: parseFloat(this.style.width) || 640, height: parseFloat(this.style.height) || 360 }; },
  };
  const calls = [];
  const base = {
    width: 640, height: 360, deltaTime: 16, CENTER: 'center', LEFT: 'left', TOP: 'top', BOTTOM: 'bottom', CLOSE: 'close',
    createGameCanvas: (w, h) => { calls.push(['createGameCanvas', w, h]); return { elt: el }; },
    textWidth: () => 40,
    drawingContext: { save() {}, restore() {}, stroke() {} },
    loadImage: async (url) => ({ url, width: 10, height: 10 }),
  };
  const p = new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string' || prop.startsWith('_')) return undefined; // the sketch's own fields
      return (...args) => { calls.push([prop, ...args]); return 0; };
    },
  });
  // Pointer events as the browser would send them, at logical coordinates (the canvas is scaled 2x).
  const send = (type, x, y, extra = {}) => {
    const r = el.getBoundingClientRect();
    listeners[type]?.({ clientX: r.left + x * r.width / 640, clientY: r.top + y * r.height / 360, pointerType: 'mouse', button: 0, ...extra });
  };
  const key = (k) => docListeners.keydown?.({ key: k, target: { closest: () => null } });
  return { p, el, parent, doc, calls, send, key };
}

describe('createGame: the p5 side', () => {
  it('creates the canvas and fits it into the page with letterbox bars', () => {
    const s = fakeSketch();
    const game = attachP5(new Game({ rooms: [yard()] }), s.p);
    assert.deepEqual(s.calls.find((c) => c[0] === 'createGameCanvas'), ['createGameCanvas', 640, 360]);
    assert.equal(s.doc.body.style.overflow, 'hidden', 'the page became full-window');
    assert.equal(s.el.style.width, '1280px');
    assert.equal(game.scaler.layout.scale, 2);
  });

  it('mouse input reaches the game, scaled back to logical coordinates', async () => {
    const s = fakeSketch();
    const game = attachP5(new Game({ rooms: [yard()], fadeMs: 0 }), s.p);
    let looked = false;
    game.on('sign', { onLook: () => { looked = true; } });
    await frames(game, game.start());
    s.send('pointermove', 340, 200);
    assert.equal(game.hover.hovered?.id, 'sign');
    s.send('pointerdown', 340, 200, { button: 2 });
    for (let i = 0; i < 200 && !looked; i++) { await new Promise((r) => setImmediate(r)); game.update(20); }
    assert.ok(looked, 'right-click looked at the sign');
  });

  it('keys: Escape skips, digits choose, the debug key toggles outlines', async () => {
    const s = fakeSketch();
    const game = attachP5(new Game({ rooms: [yard()], fadeMs: 0 }), s.p);
    await frames(game, game.start());
    s.key('d');
    assert.equal(game.debug, true);
    const talk = game.talk('Who?\n* Me -> a\n* You -> b\n# a\nA\n# b\nB');
    for (let i = 0; i < 400 && !game.menu.open; i++) { await new Promise((r) => setImmediate(r)); game.update(20); game.subtitles.advance(); game.subtitles.advance(); }
    const chosen = [];
    game.events.on('dialogue:choose', (c) => chosen.push(c.index));
    s.key('2');
    await new Promise((r) => setImmediate(r)); // the choice is reported once the menu's promise settles
    assert.deepEqual(chosen, [1]);
    await frames(game, talk);
    const run = game.cutscene(() => game.scheduler.wait(60_000));
    s.key('Escape');
    await frames(game, run);
  });

  it('draw() draws the whole game; its parts can be replaced and draw in room coordinates', async () => {
    const s = fakeSketch();
    const game = attachP5(new Game({ rooms: [yard({ width: 1600, walkable: [{ id: 'f', points: box(0, 250, 1600, 340) }] })], fadeMs: 0 }), s.p);
    game.draw(); // before any room: just a background
    await frames(game, game.start());
    game.hero.teleport(1500, 300);
    for (let i = 0; i < 200; i++) game.update(20);
    game.draw();
    assert.ok(s.calls.some((c) => c[0] === 'vertex'), 'hotspots with a colour are drawn');
    const seen = [];
    game.drawHero = (p, hero) => seen.push(['hero', hero.x]);
    game.drawRoom = (p, room) => seen.push(['room', room.id]);
    s.calls.length = 0;
    game.say('hello');
    game.debug = true;
    game.draw();
    assert.deepEqual(seen, [['room', 'yard'], ['hero', 1500]]);
    const translate = s.calls.find((c) => c[0] === 'translate');
    assert.equal(translate[1], -game.scene.camera.x, 'drawn through the camera');
    assert.ok(s.calls.some((c) => c[0] === 'text' && c[1] === '[hello]'), 'the speech line is drawn');
  });

  it('pictures of rooms and items are loaded by start()', async () => {
    const s = fakeSketch();
    globalThis.document = { baseURI: 'https://example.com/game/' };
    try {
      const game = attachP5(new Game({ rooms: [yard({ background: 'yard.png', layers: [{ image: 'fog.png', depth: 'fg' }] })], items: { key: { text: 'key', image: 'img/key.png' } } }), s.p);
      await frames(game, game.start());
      assert.deepEqual(Object.keys(game.images.get('yard')), ['yard.png', 'fog.png']);
      assert.equal(game.images.get('yard')['yard.png'].url, 'https://example.com/game/yard.png');
      assert.equal(game.itemImages.key.url, 'https://example.com/game/img/key.png');
    } finally { delete globalThis.document; }
  });

  it('the addon adds createGame() to sketches and moves every game forward each frame', async () => {
    const fn = {};
    const lifecycles = {};
    clickeryAddon({}, fn, lifecycles);
    const s = fakeSketch();
    const sketch = Object.assign(Object.create(s.p), { deltaTime: 40 });
    // createGame is called on the sketch, exactly as `createGame(...)` in global mode
    const game = fn.createGame.call(new Proxy(sketch, { get: (t, k) => (k in t ? t[k] : s.p[k]) }), { rooms: [yard()] });
    assert.ok(game instanceof Game);
    let stepped = 0;
    game.update = (dt) => { stepped += dt; };
    lifecycles.predraw.call({ _clickeryGames: new Set([game]), deltaTime: 40 });
    assert.equal(stepped, 40);
  });
});
