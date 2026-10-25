---
title: Scripts
blurb: What a handler receives, doing things once, and verbs.
---
<!-- page: What a handler gets -->
<!-- covers: ScriptContext, Interactor#register, Interactor#setHotspotEnabled -->
Every handler (`onInteract`, `onLook`, `onUse`) is called with a **context**, usually named `ctx`. It tells you what happened (`ctx.verb`, `ctx.id`, `ctx.hotspot`, and `ctx.item` for `onUse`) and hands you the parts you need: `ctx.hero`, `ctx.state`, `ctx.inventory`, `ctx.say(key)` and `ctx.setEnabled(id, on)`, which switches a hotspot off or on for good (it is saved with the game).

`game.on(id, handlers)` is a short way to call `game.interactor.register(id, handlers)`. Click, right-click and use something on the crate: one handler answers all three.

```js
let game;

async function setup() {
  game = createGame({
    items: { coin: 'gold coin' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'coinspot', name: 'obj.coin', provider: 'polygon', color: '#e0c050',
          points: [[200, 275], [230, 275], [230, 295], [200, 295]], walkTo: { x: 215, y: 315 } },
        { id: 'crate', name: 'obj.crate', provider: 'polygon', color: '#96643c',
          points: [[400, 200], [480, 200], [480, 260], [400, 260]], walkTo: { x: 440, y: 300, dir: 'up' } },
      ],
    }],
    strings: { 'obj.coin': 'Gold coin', 'obj.crate': 'Crate' },
  });

  game.interactor.register('coinspot', {
    onInteract: (ctx) => {
      ctx.inventory.give('coin');
      ctx.setEnabled('coinspot', false);
    },
  });

  game.on('crate', {
    onInteract: (ctx) => ctx.hero.say(`${ctx.verb} on ${ctx.id}`, { literal: true }),
    onLook: (ctx) => ctx.hero.say(`${ctx.verb} on ${ctx.id}`, { literal: true }),
    onUse: (ctx) => ctx.hero.say(`${ctx.verb} ${ctx.item} on ${ctx.id}`, { literal: true }),
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: Only once -->
<!-- covers: once, firstLook, firstInteract, firstUse -->
Often something should happen the first time and never again: a long description, a greeting, a discovery. The helpers `firstLook`, `firstInteract` and `firstUse` run a function once per object (`firstUse` once per item used on it), and `once(ctx, 'name', fn)` does it for anything you name. They return `true` when the function ran, so you can stop there and let the later times fall through to the short answer.

The memory is in the saved state, so after loading a game the statue is not "new" again. The helpers are on `p5.clickery`.

```js
const { once, firstLook } = p5.clickery;
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'statue', name: 'obj.statue', provider: 'polygon', color: '#9aa0aa',
        points: [[300, 150], [360, 150], [360, 250], [300, 250]], walkTo: { x: 330, y: 295, dir: 'up' },
      }],
    }],
    strings: {
      'obj.statue': 'Statue',
      'statue.look.first': 'A statue of a lighthouse keeper. He looks tired.',
      'statue.look': 'Still tired.',
      'statue.hello': 'I said hello to him. He did not reply.',
      'statue.again': 'No need to say hello twice.',
    },
  });

  game.on('statue', {
    onLook: async (ctx) => {
      if (await firstLook(ctx, () => ctx.say('statue.look.first'))) return;
      await ctx.say('statue.look');
    },
    onInteract: async (ctx) => {
      if (await once(ctx, 'hello', () => ctx.say('statue.hello'))) return;
      await ctx.say('statue.again');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: A verb list -->
<!-- covers: Interactor#mode, Interactor#verb -->
By default one click does the obvious thing (the **smart** mode). If you prefer the classic verb list, set the option `mode: 'verbs'`. Then `game.interactor.verb` decides what the next click does: `'interact'`, `'look'`, `'use'` or `'walk'`. Build your own buttons and set it from them; here the keys do.

Click the picture, press **L** and click the sign to look at it, **I** to use it, **W** to walk to it.

```js
let game;

async function setup() {
  game = createGame({
    mode: 'verbs',
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'sign', name: 'obj.sign', provider: 'polygon', color: '#96643c',
        points: [[400, 170], [480, 170], [480, 250], [400, 250]], walkTo: { x: 440, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.sign': 'Sign', 'sign.look': 'It says: "Verbs!"', 'sign.use': 'I poke the sign.' },
  });

  game.on('sign', {
    onLook: (ctx) => ctx.say('sign.look'),
    onInteract: (ctx) => ctx.say('sign.use'),
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text(`mode: ${game.interactor.mode}   verb: ${game.interactor.verb}   (L look, I use, W walk)`, 10, 22);
}

function keyPressed() {
  if (key === 'l') game.interactor.verb = 'look';
  if (key === 'i') game.interactor.verb = 'interact';
  if (key === 'w') game.interactor.verb = 'walk';
}
```

<!-- page: Hold an item -->
<!-- covers: Interactor#select, Interactor#held -->
When the player clicks an item in the bar it is **held**: `game.interactor.held` is its id, and the next click uses it on whatever is clicked. `game.interactor.select('key')` does the same from code, and `select(null)` puts the item away. It throws for an item that is not carried.

Here the key is selected for you once you pick it up, so a single click on the door tries it.

```js
let game;

async function setup() {
  game = createGame({
    items: { key: 'brass key' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'keyspot', name: 'obj.key', provider: 'polygon', color: '#e0c050',
          points: [[200, 275], [240, 275], [240, 295], [200, 295]], walkTo: { x: 220, y: 315 } },
        { id: 'door', name: 'obj.door', provider: 'polygon', color: '#6b4a2f',
          points: [[500, 120], [580, 120], [580, 250], [500, 250]], walkTo: { x: 540, y: 290, dir: 'up' } },
      ],
    }],
    strings: { 'obj.key': 'Brass key', 'obj.door': 'Door', 'door.opens': 'It opens.' },
  });

  game.on('keyspot', {
    onInteract: (ctx) => {
      game.give('key');
      ctx.setEnabled('keyspot', false);
      game.interactor.select('key');
    },
  });

  game.on('door', {
    onUse: async (ctx) => {
      if (ctx.item !== 'key') return false;
      game.interactor.select(null);
      await ctx.say('door.opens');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('held: ' + game.interactor.held, 10, 22);
}
```

<!-- page: Is the game busy -->
<!-- covers: Interactor#busy, Interactor#locked, Interactor#phase, Interactor#onError -->
While a handler runs, a cutscene plays or a conversation is open, clicks are ignored. `game.interactor.busy` tells you, `locked` is the cutscene-or-conversation part, and `phase` is `'idle'`, `'walk'` (on the way to a hotspot) or `'act'` (a handler is running).

If a handler throws, the error goes to `game.interactor.onError`, which logs it by default. Replace it to show your own message. Click the broken lever to see it.

```js
let game;
let lastError = 'none';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'sign', name: 'obj.sign', provider: 'polygon', color: '#96643c',
          points: [[300, 170], [380, 170], [380, 250], [300, 250]], walkTo: { x: 340, y: 290, dir: 'up' } },
        { id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
          points: [[500, 200], [530, 200], [530, 250], [500, 250]], walkTo: { x: 515, y: 290, dir: 'up' } },
      ],
    }],
    strings: { 'obj.sign': 'Sign', 'obj.lever': 'Broken lever', 'sign.look': 'Take your time reading.' },
  });

  game.interactor.onError = (err) => { lastError = err.message; };

  game.on('sign', { onInteract: (ctx) => ctx.say('sign.look') });
  game.on('lever', { onInteract: () => { throw new Error('the lever came off in my hand'); } });

  await game.start();
}

function draw() {
  game.draw();
  const i = game.interactor;
  fill(255);
  textSize(14);
  text(`busy: ${i.busy}   locked: ${i.locked}   phase: ${i.phase}`, 10, 22);
  text('last error: ' + lastError, 10, 42);
}
```
