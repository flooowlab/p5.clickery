# p5.clickery

A library for making point-and-click adventure games with [p5.js](https://p5js.org) 2.x.

You describe your game with plain data (rooms, clickable areas, items) and small scripts, and the library takes care of walking, clicking, inventory, cutscenes, dialogue and saving.

**Learn by doing:** the [website](https://flooowlab.github.io/p5.clickery/) has short lessons with a live, editable game on every page, the full reference for every function (generated from the source), and the tools described below. This README is the written guide.

This guide is for people who already know a little p5.js (`setup`, `draw`, drawing shapes). It explains how to *use* the library. You do not need to know anything about adventure-game engines.

**Contents**

1. [What you get](#what-you-get)
2. [Running the examples](#running-the-examples)
3. [Your first game](#your-first-game) and [the game object](#the-game-object) (and the [format reference](docs/reference.md))
4. [Words you will see](#words-you-will-see)
5. [Guide: the parts](#guide)
   [Setup](#1-setup) · [Events, timers and state](#2-events-timers-and-state) · [Text](#3-text-everything-is-a-key) · [Rooms](#4-rooms) · [Hotspots](#5-hotspots-clickable-areas) · [Walking and actors](#6-walking-and-actors) · [Items and actions](#7-items-and-actions) · [Scripts and cutscenes](#8-scripts-and-cutscenes) · [Dialogue](#9-dialogue) · [Saving](#10-saving-and-loading) · [Fitting the window](#11-fitting-the-window) · [Sound](#12-sound-and-music) · [Settings](#13-player-settings) · [Debugging](#14-debugging)
6. [Making rooms with the editor](#making-rooms-with-the-editor)
7. [Recipes](#recipes)
8. [Troubleshooting](#troubleshooting)
9. [Cheat sheet](#cheat-sheet)
10. [Good to know](#good-to-know)

---

## What you get

| You want to... | Write |
| --- | --- |
| Rooms, scrolling, fades between rooms | `createGame({ rooms })`, `game.goTo('cellar')` |
| Click on things in the picture | `hotspots` in the room data, `game.on('door', { onInteract })` |
| A character who walks around obstacles | `walkable` and `obstacles` in the room data |
| Pick up, combine and use items | `items`, `recipes`, `game.give()` / `take()` / `has()` |
| Mouse and touch both working | nothing: built in |
| A cutscene the player can skip | `game.cutscene(async (cs) => { ... })` |
| Conversations (Markdown, Twine or Ink) | `game.talk(conversation)` |
| Save and load | `game.save()`, `game.load()` |
| Fit any window or phone, music and sound, player settings | built in; `sounds`, a room's `music`, `game.settings` |
| Draw rooms with the mouse instead of typing coordinates | the [room editor](#making-rooms-with-the-editor) |

Each of these is made of smaller parts that you can also use on their own; the [Guide](#guide) explains them.

It does **not** use p5.play and has no physics. You draw everything with normal p5.js calls; the library tells you *where* things are and *what happened*.

---

## Running the examples

Everything you can open in a browser is in the [examples](examples) folder, one folder per example, in learning order. The quick start runs by opening its file; the others load files (rooms, sounds, dialogue) or ES modules, which browsers only allow from a web server. Serve the **repository folder** with any local web server, for example:

```
python -m http.server 8000
```

then visit `http://localhost:8000/examples/quickstart/` (or `adventure`, `lighthouse`). The [website](https://flooowlab.github.io/p5.clickery/examples/) shows them inside its own pages, with a short description of each.

| Example | What it shows |
| --- | --- |
| [examples/quickstart](examples/quickstart/index.html) | The smallest working game: one room, a hero, one sign. **Start here.** |
| [examples/adventure](examples/adventure/index.html) | A puzzle with items and combining, an opening cutscene, a guard to talk to, two rooms with music, sound effects, a settings panel, and scaling to any window or phone. Add `?adapter=ink` or `?adapter=twine` to change the dialogue format |
| [examples/lighthouse](examples/lighthouse/index.html) | **A complete small game**: three rooms, a puzzle, an Ink conversation, a skippable ending, save and load. Read its source to see how a game is organised (its logic is in `game.js`, with no drawing code) |
| [tools/editor](tools/editor/index.html) | The room editor: load a picture, draw hotspots and floors, export the room JSON, preview it |

The parts that `createGame` puts together (the game loop, timers, state, rooms, hotspots, navigation) each have lessons with live code in [Learn](https://flooowlab.github.io/p5.clickery/learn/): the Core, Rooms, Hotspots and Navigation topics.

**How the repository is organised**

| Folder | Contains |
| --- | --- |
| `dist/` | **The files to use**: `p5.clickery.min.js` (a `<script>` tag after p5), `p5.clickery.js` (the same, readable) and `p5.clickery.esm.js` (for `import`). Built from `src/`; never edit them by hand. |
| `src/` | The library's source. `src/index.js` exports everything. |
| `examples/` | Runnable examples (each folder has an `index.html`), plus `assets/` shared by them (generated sounds). |
| `tools/` | The room editor (`tools/editor/`), the dialogue and animation previewers (`tools/dialogue/`, `tools/animation/`) and Node scripts: `check-rooms.mjs`, `find-keys.mjs`, `compile-ink.mjs` (Ink to JSON), `build.mjs` (builds `dist/`), `build-site.mjs` (the website), `make-example-audio.mjs` and `make-sample-room.mjs` (regenerate example assets). See [Tools](#tools). |
| `site/` | The website's lessons (`site/learn/`), tool pages (`site/tools/`) and styles. The reference pages are generated from the JSDoc comments in `src/`. |
| `docs/` | The [format reference](docs/reference.md). |
| `test/` | Automated tests, run with `npm test`: `unit/` has one file per `src/` folder, `tools/` tests the editor, `integration/` plays the Lighthouse from start to finish, `release/` checks the package and the documentation links, `fixtures/` holds test data. |

---

## Your first game

This is [examples/quickstart](examples/quickstart/index.html), explained. It is a normal p5.js sketch in global mode: `setup()` and `draw()`.

### 1. Load p5 and p5.clickery

```html
<script src="p5.min.js"></script>
<script src="p5.clickery.min.js"></script>
```

That is the whole installation: `p5.clickery.min.js` is one file, in the [dist](dist) folder. It must come *after* p5. Adding it gives every sketch a new function, `createGame()`. (In the p5.js web editor, upload the file to your project and add the second line to `index.html`.)

### 2. Create the game

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'sign', name: 'obj.sign', provider: 'polygon', color: '#96643c',
        points: [[300, 170], [380, 170], [380, 250], [300, 250]],
        walkTo: { x: 340, y: 290, dir: 'up' },
      }],
    }],
    strings: {
      'obj.sign': 'Wooden sign',
      'sign.look': 'It says: "Welcome to p5.clickery!"',
      'sign.use': 'I could read it again, but I will not.',
    },
  });
```

`createGame` makes the canvas (640 × 360 unless you say otherwise), scales it to fit the window, and sets up the hero, mouse and touch input, the inventory bar, subtitles, saving and more.

You give it two things:
* **rooms**: a room is plain data: its size, where the hero starts, the floor (`walkable`), and the clickable areas (`hotspots`). A `color` fills a shape so you can play before there is any art. You can also give the URL of a room file instead, such as one made with the [room editor](#making-rooms-with-the-editor).
* **strings**: the text the player sees. Code refers to text by a short **key** like `'sign.look'`, so the game can be translated later.

### 3. Say what happens

```js
  game.on('sign', {
    onLook: (ctx) => ctx.say('sign.look'),     // right-click, or hold a finger on it
    onInteract: (ctx) => ctx.say('sign.use'),  // click or tap
  });
```

`'sign'` is the hotspot's `id`. The hero first walks to the hotspot's `walkTo` point, then the function runs. `ctx.say(key)` makes the hero speak.

### 4. Start, and draw every frame

```js
  await game.start();
}

function draw() {
  game.draw();
}
```

`game.start()` loads anything given by URL and enters the first room. `game.draw()` draws the whole game. That is all: click the floor to walk, right-click the sign to read it.

### 5. Make it yours

Draw your own art by replacing parts of `game.draw()`. They draw in room coordinates (the camera is already applied), and anything you leave alone keeps its default:

```js
let heroImg;

async function setup() {
  heroImg = await loadImage('hero.png');
  game = createGame({ /* ... */ });
  game.drawHero = (p, hero) => image(heroImg, hero.x - 16, hero.y - 64);   // feet at (hero.x, hero.y)
  game.drawRoom = (p, room) => { /* draw the room's details */ };
  await game.start();
}
```

Or give the room a `background` picture, and the hero `animations` (see [Drawing an actor](#6-walking-and-actors)), and the default drawing uses them.

Change any default with an option, for example `createGame({ width: 320, height: 180, mode: 'verbs', fadeMs: 600 })`. [The game object](#the-game-object) lists them all.

**Running it.** A sketch like this one, with everything in the page, runs by just opening the HTML file. As soon as the game loads files (room JSON, pictures, sounds), the browser needs a local web server; see [Running the examples](#running-the-examples).

---

## The game object

`createGame(options)` returns the game. Everything has a default; pass only what you need.

**Options**

| Option | Default | Meaning |
| --- | --- | --- |
| `rooms` | `[]` | Room objects, or URLs of room JSON files (pictures named in a room file load relative to it). A list, or an object `{ id: room }`. |
| `strings` | `{}` | Text keys and their text. The built-in answers ("I can't use that.") are already included. |
| `items` | `{}` | Inventory items: `{ key: 'brass key' }`, or `{ key: { text: 'brass key', image: 'key.png' } }`. |
| `recipes` | `[]` | Items that combine: `[{ a: 'stick', b: 'string', result: 'pole' }]` (see [Items and actions](#7-items-and-actions)). |
| `sounds` | `{}` | Sound id → file: `{ theme: 'theme.ogg', click: 'click.wav' }`. A room's `music` field plays one. |
| `sfx` | `{}` | Sounds for events: `{ 'inventory:add': 'pickup' }` (see [Sound and music](#12-sound-and-music)). |
| `width`, `height` | `640`, `360` | The game's fixed size. The canvas is scaled to fit, never stretched. |
| `hero` | `{}` | The hero's options: `speed` (150), `directions` (4 or 8), `animations`. |
| `mode` | `'smart'` | `'verbs'` for a verb list (Look at / Use / Walk to). |
| `fadeMs` | `300` | Length of the fade between rooms. |
| `followHero` | `true` | In rooms wider than the screen, the camera follows the hero. |
| `debugKey` | `'d'` | Toggles outlines of hotspots and floors. `null` turns it off. |
| `parent` | the page | An element (or its id) to put the game in. The game fills it. |
| `fit` | `true` | Scale the canvas to fill its parent. `false` leaves it at its size. |
| `canvas` | `true` | `false` uses a canvas you created yourself. |
| `language` | `'en'` | The language of `strings`. |
| `saveSlot` | `'game'` | Where `save()` and `load()` keep the game. |
| `Story` | — | inkjs's `Story` class, if you import inkjs instead of loading `ink.js` with a script tag. |

**Methods**

| Method | Does |
| --- | --- |
| `game.on(id, { onInteract, onLook, onUse, ... })` | The script of a hotspot, item or room. |
| `await game.start(room?, startName?)` | Loads what is needed and enters a room (default: the first). |
| `game.goTo(room, startName?)` | Changes room, with a fade. |
| `game.say(key)` | The hero says a line. Resolves when it is over. |
| `game.talk(conversation)` | Plays a conversation: Markdown or Twee text, Twison, compiled Ink JSON, or an Ink story. Ink variables are saved with the game; Ink can call `giveItem("key")` and `setFlag("name")`. |
| `game.cutscene(async (cs) => { ... })` | A cutscene: input is locked, the player can skip it. |
| `game.flag(name)` / `game.flag(name, value)` | Reads or sets a yes/no fact (saved). |
| `game.give(item)`, `game.take(item)`, `game.has(item)` | The inventory. |
| `game.save()`, `await game.load()` | Save and load (also where the hero stands). |
| `game.draw()` | Draws everything. Call it in `draw()`. |
| `game.hotspot(id)` | The live hotspot (`.enabled` switches it off). |
| `game.addRoom(room or URL)` | Adds a room later. |

**Parts of `game.draw()` you can replace:** `game.drawRoom(p, room)`, `game.drawHero(p, hero)`, `game.drawSpeech(p, hero)`. They draw in room coordinates. The defaults are on `p5.clickery` as `drawRoomShapes`, `drawHeroDefault` and `drawSpeechDefault`, so a replacement can call the default and add to it. Extra things to draw in depth order with the hero go in `game.actors` as `{ baseline, draw(p) }`.

**What it sets up for you:** the canvas and scaling, mouse/touch/keyboard (Escape skips a cutscene or a line, 1–9 pick a dialogue choice), moving the game forward every frame (it pauses with `noLoop()`), entering rooms (hotspots, floor, the hero at the start), the camera, the inventory bar and hover labels, subtitles and dialogue choices, the Skip button, player settings (`game.settings`), and sound (`game.audio`, when you give `sounds`).

**Every part is reachable** for when you need more control: `game.scene`, `game.hero`, `game.inventory`, `game.interactor`, `game.cutscenes`, `game.dialogue`, `game.subtitles`, `game.menu`, `game.bar`, `game.pointer`, `game.hover`, `game.settings`, `game.audio`, `game.scaler`, `game.events`, `game.state`, `game.i18n`, `game.scheduler`. The [Guide](#guide) explains each of them.

**Instance mode and modules.** In instance mode call `p.createGame(...)` and `p.draw = () => game.draw()`. With ES modules, `import { registerClickery } from './p5.clickery.esm.js'` and call `registerClickery(p5)` once before `new p5(...)`. `new Game(options)` makes the same game without p5 at all (for tests, or a game's logic in its own module: see [examples/lighthouse](examples/lighthouse)); `attachP5(game, p)` connects it to a sketch later.

---

## Words you will see

| Word | Meaning |
| --- | --- |
| **Room** | One screen (or one wide, scrolling screen) of the game |
| **Hotspot** | A clickable area in a room: a door, a lamp, a character |
| **Walkable area** | The part of the floor the hero may stand on |
| **Obstacle** | A hole in the walkable area, such as a table |
| **Actor** | Anything that walks and talks: the hero, other characters |
| **Handler / script** | A small function that runs when the player does something |
| **Key** | A short text id like `'sign.look'` that stands for the real text |
| **State** | The saved memory of the game: flags, variables, inventory |
| **Logical size** | The fixed canvas size you design for (for example 640 × 360), whatever the real window size |
| **Cutscene** | A scripted scene where the player cannot act, but can skip |
| **Baseline** | The y position of an object's feet, used to decide who stands in front |

**Coordinates.** `x` grows to the right and `y` grows *down*, as in p5.js. Everything uses the logical size. A room can be wider than the screen; room coordinates start at the room's top-left, and the camera decides which part is visible.

---

## Guide

`createGame()` puts together everything in this guide, so you only need it to change how something works or to use a part on its own. With the script tag, every part is on `p5.clickery` (`const { Navigator } = p5.clickery;`); with modules, import it by name. Inside a game, each part is a property: `game.scene`, `game.hero`, `game.inventory` and so on ([the list](#the-game-object)).

### 1. Setup

The script tag registers p5.clickery with p5 by itself. With ES modules, register it once:

```js
import { registerClickery } from './p5.clickery.esm.js';
registerClickery(p5);                    // once, before `new p5(...)`

new p5((p) => {
  p.setup = () => {
    p.createGameCanvas(640, 360);        // a normal canvas, plus remembers the logical size
  };
});
```

Whole-number sizes only; anything else throws a clear error. If your `setup` loads images, make it `async` and `await p.loadImage(...)` (p5 2.x has no `preload`).

### 2. Events, timers and state

`createCore()` gives you all three. You can also create them separately: `new EventBus()`, `new Scheduler()`, `new StateStore()`, `new GameLoop({...})`.

**Events**

```js
const off = core.events.on('room:enter', (info) => { /* ... */ });   // returns a function to stop listening
core.events.once('cutscene:end', () => {});
core.events.emit('my-event', 1, 2);                                  // your own events are fine too
core.events.off('room:enter', handler);
```

Events the library sends:

| Event | When | Data |
| --- | --- | --- |
| `update` | Every frame | `dt` in milliseconds |
| `room:enter` | A room is entered (screen still black) | `{ room, start, firstVisit, ... }` |
| `room:entered` | After the fade-in | same |
| `room:exit` | Leaving a room | `{ room }` |
| `hover` | The hovered hotspot changed | `{ id, hotspot }` (`id` is `null` when none) |
| `action` | An action finished | `{ verb, id, kind, item, handled }` |
| `inventory:add` / `inventory:remove` | Item gained or lost | `{ id }` |
| `inventory:select` | Held item changed | `{ id }` (`null` when put away) |
| `cutscene:start` / `cutscene:end` | Cutscene | `end`: `{ skipped }` |
| `dialogue:start` / `dialogue:end` | Conversation | |
| `dialogue:line` | A line is shown | `{ speaker, text, tags }` |
| `dialogue:tag` | A line has a tag such as `sfx` | `{ key, value, line }` |
| `dialogue:choose` | The player chose | `{ index, text }` |

**The game loop**

A game made with `createGame()` needs none of this: it moves forward with p5's own frames (and pauses with `noLoop()`). Use the loop when you build a game from the parts yourself, without p5 driving it:

```js
core.loop.start();        // begins running; calls scheduler and sends `update`
core.loop.pause();        // timers and `update` stop
core.loop.resume();
```

The loop uses its own clock (not p5's `draw`) and limits each step to 100 ms, so a hidden browser tab does not make the game jump.

**Timers**

Timers use *game time*, so they stop when the game is paused.

```js
core.scheduler.after(2000, () => console.log('two seconds later'));
const t = core.scheduler.every(500, () => console.log('tick'));
t.cancel();
await core.scheduler.wait(1000);          // inside an async function: pause here for a second
```

**State: the game's memory**

```js
core.state.set('flags.doorOpen', true);
core.state.get('flags.doorOpen');                 // true
core.state.get('flags.missing', false);           // second argument is the fallback
core.state.set('rooms.cellar.lightOn', true);
core.state.watch('flags.doorOpen', (now, before) => console.log(before, '->', now));
```

Rules to remember:

* Paths are dot-separated: `'flags.doorOpen'`. Do not put dots in ids.
* Values must be plain data (numbers, text, true/false, arrays, objects). Functions and `undefined` are rejected. Use `null` for "nothing".
* `get` returns a copy: changing it does not change the state. Always use `set`.
* By convention: `flags.*` for yes/no facts, `vars.*` for numbers and text, `rooms.<id>.*` for things about one room. The library itself uses `inventory`, `currentRoom` and `rooms.<id>.visited`.

### 3. Text: everything is a key

```js
core.i18n.add('en', { 'door.look': 'A heavy door.', 'hello': 'Hello, {name}!' });
core.i18n.t('door.look');                          // 'A heavy door.'
core.i18n.t('hello', { name: 'Ada' });             // 'Hello, Ada!'
core.i18n.t('oops');                               // '[oops]'  (a missing key is easy to spot)
core.i18n.language = 'it';                         // switch language; missing keys fall back to 'en'
```

`defaultStrings` contains the built-in answers (`default.interact`, `default.look`, `default.use`, `default.combine`) and a few label texts. Add them once with `core.i18n.add('en', defaultStrings)` and override any you like.

To make an actor use your translations: `new Actor({ ..., translate: (key) => core.i18n.t(key) })`.

### 4. Rooms

**Room format**

```js
{
  id: 'hall',
  width: 960, height: 360,                  // can be wider than the screen
  background: 'hall.png',                   // an image name, or use color: '#223344'
  layers: [
    { image: 'far.png',    depth: 'bg', parallax: 0.5 },   // scrolls slower: looks far away
    { image: 'pillar.png', depth: 'fg' },                  // drawn in front of the hero
  ],
  starts: { default: { x: 100, y: 300 }, fromCellar: { x: 880, y: 300 } },
  walkable: [{ id: 'floor', points: [[0,250],[960,250],[960,360],[0,360]], scale: [[250, 0.6], [360, 1]] }],
  obstacles: [{ id: 'table', points: [[520,285],[660,285],[660,335],[520,335]] }],
  hotspots: [ /* see section 5 */ ],
}
```

`parallax` is 1 for "moves with the room" and 0 for "stays fixed on the screen". `starts` are named places the hero can appear; you must have at least one.

**Moving between rooms**

```js
const scene = new SceneManager({
  ...core,                                  // gives it state and events
  viewWidth: 640, viewHeight: 360,
  loadRoom: async (id) => (await fetch(`rooms/${id}.json`)).json(),
  fadeMs: 300,
});

await scene.goTo('cellar');                 // fade out, switch, fade in
await scene.goTo('hall', 'fromCellar');     // ...and appear at a named start
scene.room;                                 // the current room
scene.busy;                                 // true while changing
await scene.restore();                      // re-enter the room saved in state (after loading a game)
```

While a change is running, a second `goTo` throws. The state remembers `currentRoom`, `rooms.<id>.visited`, and everything else you stored under `rooms.<id>`, so a room is as you left it when you come back. In the `room:enter` event, `firstVisit` is `true` only the first time.

**The camera**

```js
const cam = scene.camera;
cam.centerOn(hero.x, hero.y);               // jump
cam.follow(hero.x, hero.y, p.deltaTime);    // ease towards the hero, call every frame
cam.moveTo(200, 0);                         // set the top-left corner (it never leaves the room)
cam.worldToScreen(x, y);  cam.screenToWorld(x, y);
```

**Drawing a room**

Call these inside `p.draw`. Draw your own things between them.

```js
drawBackground(p, scene.room, scene.camera, images);   // background colour/image and "bg" layers
// ...your objects and actors...
drawForeground(p, scene.room, scene.camera, images);   // "fg" layers, in front of everything
drawFade(p, scene.fade);                               // the black fade, draw last
```

`images` maps the file names you used in the room to loaded p5 images:

```js
p.setup = async () => {
  images['hall.png'] = await p.loadImage('art/hall.png');
};
```

When you draw your own things, subtract the camera: `p.rect(x - cam.x, y - cam.y, w, h)`.

**Room scripts**

```js
scripts.add('hall', {
  onEnter:   (ctx) => {},                   // screen is still black
  onEntered: async (ctx) => {},             // after the fade-in: good for an opening cutscene
  onExit:    (ctx) => {},
});
```

(See [Scripts and cutscenes](#8-scripts-and-cutscenes) for `scripts`.)

### 5. Hotspots (clickable areas)

Hotspots are listed in the room. After a room is entered, turn them into live objects:

```js
core.events.on('room:enter', ({ room }) => {
  const hotspots = createHotspots(room, assets);
  applyHotspotState(core.state, room.id, hotspots);   // remembers which ones were switched off
  hover.setHotspots(hotspots);
});
```

Every hotspot has an `id`, a `name` (a text key shown on hover), a `provider` that decides its shape, and optionally `z` (higher is on top) and `walkTo`.

**Three kinds of shape**

```js
// 1. polygon: the simplest. Click the corners.
{ id: 'door', provider: 'polygon', points: [[860,120],[940,120],[940,250],[860,250]] }

// 2. svg: a path, e.g. exported from Inkscape. Inline...
{ id: 'crate', provider: 'svg', d: 'M180 200 L280 200 L280 260 L180 260 Z' }
// ...or from an SVG file: finds the <path> whose id (or Inkscape label) is `crate`
{ id: 'crate', provider: 'svg', svg: 'room.svg' }

// 3. colorMask: a hidden picture where each colour is one hotspot.
{ id: 'lamp', provider: 'colorMask', mask: 'mask.png', color: '#00ff00', tolerance: 4 }
```

Your game code never needs to know which one is used: `hotspot.hit(x, y)` works the same for all of them.

The `assets` argument supplies what files hold:

```js
createHotspots(room, {
  pixels: (name) => maskImageData,     // for colorMask: an ImageData ({ data, width, height })
  text:   (name) => svgFileText,       // for svg files
});
```

Read mask pixels **once**, when loading, and keep them (reading pixels every frame is slow). Draw the mask with no antialiasing, e.g. with `fillRect` in a canvas, then `getImageData`; the *Hotspots from a picture* lesson on the website shows this. A game made with `createGame` does the loading for you: give the hotspot `mask` and `color` and it reads the mask picture in `start()`. The mask may have a different size from the room; positions are scaled automatically.

**`walkTo`: where the hero stands**

```js
walkTo: { x: 850, y: 300, dir: 'right' }   // walk here before acting, then face right
```

If a hotspot has no `walkTo`, the action happens where the hero stands.

**Hover**

```js
const hover = new HoverTracker(core.events);
hover.update(x, y);                  // pass a ROOM position; returns the hotspot or null
hover.hovered;                       // the hotspot under the pointer (or null)
hover.at(x, y);                      // look without changing hover
hover.clear();
```

`PointerController` calls `update` for you, so you rarely need it directly.

**Switching hotspots off and on**

```js
interactor.setHotspotEnabled('stick', false);   // can't be clicked; this is saved
ctx.setEnabled('stick', false);                 // the same, from inside a handler
```

### 6. Walking and actors

**Making a floor**

`walkable` areas are the only places the hero can walk, and `obstacles` cut holes in them.

```js
const navigator = Navigator.fromRoom(room);     // done in `room:enter` in the quick start
hero.navigator = navigator;

navigator.isWalkable(x, y);                     // true or false
navigator.findPath(from, to);                   // list of waypoints, or null if unreachable
navigator.scaleAt(x, y);                        // size factor at that spot
```

If the player clicks somewhere not walkable, the hero goes to the nearest walkable spot.

Depth scale makes characters smaller further away. It comes from `scale` stops in the walkable area, `[y, scale]` pairs: `[[250, 0.6], [360, 1]]` means 60% size at y=250 and full size at y=360, with smooth steps in between. The hero also walks slower when smaller.

**Actors**

```js
const hero = new Actor({
  id: 'hero', x: 100, y: 300,
  speed: 140,                    // pixels per second at full size
  directions: 4,                 // 4 or 8 facing directions
  translate: (key) => core.i18n.t(key),
});

const arrived = await hero.walkTo({ x: 400, y: 290, dir: 'up' });   // true on arrival, false if interrupted
await hero.say('door.locked');                                      // shows the line, waits until it is over
hero.face('left');                  // 'up', 'right', 'down', 'left' (+ 'up_right', ... with 8 directions)
hero.teleport(50, 300);             // jump, cancels any walk
hero.stop();                        // stop walking and talking
hero.skipSpeech();                  // end the current line
hero.update(dt);                    // call each frame
```

Useful properties: `hero.x`, `hero.y` (the feet), `hero.scale`, `hero.dir`, `hero.mode` (`'idle'`, `'walk'` or `'talk'`), `hero.speech` (`{ key, text }` while talking, else `null`), `hero.textSpeed` (bigger is faster).

Because `walkTo` and `say` return promises, a script reads like a story:

```js
await hero.walkTo(door);
await hero.say('door.locked');
```

If an actor has no `navigator`, `walkTo` walks in a straight line.

**Drawing an actor**

*Easy way: a placeholder.* Draw a rectangle at the feet and scale it:

```js
const s = hero.scale;
p.rect(hero.x - 14 * s - cam.x, hero.y - 70 * s - cam.y, 28 * s, 70 * s);
```

*Real art.* Give the actor named animations and draw the current frame:

```js
const hero = new Actor({
  id: 'hero', directions: 4,
  animations: {
    idle:       { frames: [idleImg], delay: 200 },
    walk_right: { frames: [r1, r2, r3, r4], delay: 120 },   // also used, flipped, for 'left'
    walk_down:  { frames: [d1, d2, d3, d4], delay: 120 },
    walk_up:    { frames: [u1, u2, u3, u4], delay: 120 },
    talk:       { frames: [t1, t2], delay: 150 },
  },
});

drawAnimation(p, hero.anim, hero.x - cam.x, hero.y - cam.y, hero.scale);   // feet at the position
```

Animation names are `<state>_<direction>`, or just `<state>`. If a direction is missing, the library tries the mirror image (flipped), then the sides of a diagonal, then the plain state. So you can start with just `walk_right` and `walk_down`. States used are `idle`, `walk` and `talk`. Animation options: `delay` (milliseconds per frame) and `loop` (default `true`).

**Who stands in front?**

Sort things by their feet before drawing:

```js
const things = [
  { baseline: hero.y, draw: () => drawHero() },
  { baseline: 335,    draw: () => drawTable() },        // bottom edge of the table
];
for (const t of sortByBaseline(things)) t.draw();
```

### 7. Items and actions

**Items and recipes**

```js
const inventory = new Inventory({
  state: core.state, events: core.events,
  items: {
    stick:  { name: 'item.stick' },          // `name` is a text key
    string: { name: 'item.string' },
    pole:   { name: 'item.pole' },
  },
  recipes: [
    { a: 'stick', b: 'string', result: 'pole', say: 'combine.pole' },   // works in either order
  ],
});

inventory.give('stick');       // true, or false if already carried
inventory.remove('stick');
inventory.has('stick');
inventory.list;                // ['stick', ...]
inventory.combine('stick', 'string');   // the recipe used, or null
```

Add `consume: ['b']` to a recipe to keep ingredient `a` (only `b` is used up). The item list lives in the state, so it is saved automatically.

**Handlers: what happens when the player acts**

```js
interactor.register('door', {
  async onInteract(ctx) { await ctx.say('door.locked'); },   // normal click
  async onLook(ctx)     { await ctx.say('door.look'); },     // right-click / long press
  async onUse(ctx) {                                         // an item was used on it
    if (ctx.item !== 'key') return false;                    // false = "not handled", gives the default answer
    ctx.inventory.remove('key');
    ctx.state.set('flags.doorOpen', true);
    await ctx.say('door.opens');
  },
});
```

The same id can be a hotspot **or** an item (`interactor.register('stick', { onLook: ... })` for looking at the stick in the inventory).

What `ctx` contains:

| Field | Meaning |
| --- | --- |
| `ctx.id` | The object's id |
| `ctx.hotspot` | The hotspot (or `null` for an item) |
| `ctx.item` | The item being used on it (in `onUse`), else `null` |
| `ctx.hero` | The hero actor |
| `ctx.say(key)` | The hero speaks |
| `ctx.inventory` | The inventory |
| `ctx.state` | The state store |
| `ctx.setEnabled(id, on)` | Switch a hotspot on or off (saved) |
| `ctx.cutscenes`, `ctx.dialogue` | If you gave them to the interactor |

If an object has no handler for an action, or the handler returns `false`, the hero says a default line: `default.interact`, `default.look`, `default.use` (an item that does not work) or `default.combine` (two items that do not go together). Change any of them with the `defaults` option: `new Interactor({ ..., defaults: { use: 'my.own.key' } })`.

**What the player does**

* *Click a hotspot*: the hero walks to its `walkTo`, then `onInteract` runs.
* *Click the floor*: the hero walks there.
* *Click an item in the inventory bar*: it is held. Click another hotspot or item to use or combine them. Click the held item again to put it away.
* *Right-click or hold a finger down*: look.
* *On a touch screen*: the first tap on a hotspot highlights it (you see its name), the second tap acts. Tapping the floor walks straight away.

Only one action runs at a time. A new click while the hero is still *walking* changes the plan; clicks while a *handler is running* (or during a cutscene or conversation) are ignored.

**Input and the inventory bar**

```js
const bar = new InventoryBar({ viewWidth: 640, viewHeight: 360 });     // slot, gap, margin are options
const pointer = new PointerController({ interactor, hover, camera: scene.camera, bar, scheduler: core.scheduler });

// in p.draw:
bar.draw(p, inventory.list, interactor.held, images);   // `images`: { itemId: p5Image } (optional; shows the id otherwise)
```

Send it browser pointer events as shown in the quick start: `pointer.move(pos)`, `pointer.down({ x, y, pointerType, button })`, `pointer.up(pos)`, `pointer.leave()`. `pointer.highlighted` (touch) and `pointer.hoveredItem` tell your drawing code what to label.

**Hover label**

```js
const label = hoverLabel({
  hotspot: pointer.highlighted ?? hover.hovered,
  item: pointer.hoveredItem,
  held: interactor.held,
  inventory,
  t: (key, vars) => core.i18n.t(key, vars),
});
drawHoverLabel(p, label, pointer.pointer.x, pointer.pointer.y);   // "Door", or "Use rope with Door" while holding rope
```

**Verb mode (optional)**

The default is a single "smart" action. If you prefer a verb list (Look at / Use / Walk to), set `interactor.mode = 'verbs'` and set `interactor.verb = 'look'` (or `'interact'`, `'use'`, `'walk'`) from your own buttons.

### 8. Scripts and cutscenes

**Keeping scripts in one place**

`Scripts` is a registry for all your handlers, one per object id. It also adds the extra hooks `onEnter` and `onEntered` for hotspots.

```js
const scripts = new Scripts({ interactor });
scene.scripts = scripts;               // lets rooms and objects get their enter hooks

scripts.add('door', { onInteract: ..., onLook: ... });
scripts.addAll({ door, lamp, guard }); // an object of handlers, or imported modules (`import * as door from './door.js'`)
```

Putting each object's script in its own file (`scripts/door.js` exporting its handlers) keeps a bigger game tidy.

**Do it once**

```js
onLook: async (ctx) => {
  if (await firstLook(ctx, () => ctx.say('statue.look.first'))) return;   // runs the first time only
  await ctx.say('statue.look');
},
```

`firstLook`, `firstInteract` and `firstUse` (once for each item) remember in the state that they have run, so they survive saving. `once(ctx, 'myKey', fn)` does the same for anything.

**Cutscenes**

During a cutscene the player cannot act, and a Skip button can end it early.

```js
const cutscenes = new Cutscenes({
  events: core.events, scheduler: core.scheduler,
  targets: [hero, scene.fade],              // things that fast-forward when skipped
});
const interactor = new Interactor({ ..., cutscenes });   // so clicks are ignored during a cutscene

scripts.add('yard', {
  onEntered: (ctx) => ctx.firstVisit && cutscenes.run(async (cs) => {
    await hero.say('intro.wake');
    await hero.walkTo({ x: 200, y: 285, dir: 'right' });
    await hero.say('intro.look');
    cs.label('light');                                     // a place skip can stop at
    core.state.set('flags.lightOn', true);
    await cs.wait(600);
    await hero.say('intro.light');
  }),
});
```

Write it as normal `await` code. When the player skips, the rest of the script runs *instantly*: the hero jumps to where it was going, lines are not shown, waits and fades finish at once, and your `state.set(...)` calls still happen. So a skipped cutscene ends in exactly the same state as a played one.

```js
cutscenes.skip();            // fast-forward to the end
cutscenes.skip('light');     // fast-forward to cs.label('light'), then play normally
cutscenes.active;            // true during a cutscene
await cutscenes.run(fn, { skippable: false });   // cannot be skipped
```

Draw and handle the Skip button during cutscenes:

```js
if (cutscenes.active) drawSkipButton(p, 640);
// in pointerdown: if (cutscenes.active) { if (hitSkipButton(pos.x, pos.y, 640)) cutscenes.skip(); return; }
```

(Also call `cutscenes.skip()` from a key press, such as Escape.) Add any other object that should fast-forward with `cutscenes.add(obj)`; it needs a `setSkipping(on)` method. Actors, the scheduler and `Fade` already have one.

### 9. Dialogue

You write conversations in a text file; the library runs them. Three formats are supported and they all work the same in your game code.

**A. Markdown (the library's own small format; easiest to start with)**

```text
# start
Guard: Halt! Who goes there? # sfx:alarm
* A friend. -> friend
* Nobody. -> nobody
* {hasBadge} I have a badge. -> badge

# friend
Guard: Pass, friend.
~ passed = true
-> END

# nobody
Guard: Then be off!
-> END

# badge
{!passed} Guard: A badge! Go right ahead.
~ gold += 5
You are given {gold} coins.
```

| You write | It means |
| --- | --- |
| `# name` | A section (a place to jump to). The first one is where it starts. |
| `Speaker: text` | A line spoken by someone. A colon needs a space after it. |
| `Just some text` | A line with no speaker (narration) |
| `* choice text -> section` | A choice that jumps to a section. Put choices at the end of a section. |
| `-> section` or `-> END` | Jump, or finish |
| `~ name = value`, `~ name += 1`, `~ name -= 1` | Set a variable (`true`, `false`, a number or text) |
| `{name}` or `{!name}` or `{gold >= 5}` in front of a line or choice | Only when true (`==`, `!=`, `<`, `>`, `<=`, `>=`) |
| `{name}` inside text | Shows the variable |
| `# sfx:alarm` at the end of a line | A tag you can react to |
| `// text` | A comment |

```js
const runner = createMarkdownRunner(markdownText, { state: core.state });
```

**B. Twine** (write in Twine, export as Twee 3 or Twison JSON)

```js
const runner = createTwineRunner(tweeTextOrTwisonObject, { state: core.state });
```

It understands passages, links (`[[text->target]]`, `[[target<-text]]`, `[[text|target]]`, `[[target]]`) and `<<set $name to value>>`. It does **not** run other macros such as `<<if>>`; it stops with an error naming the passage instead of showing them as text. `$name` in text shows the variable.

**C. Ink** (the official inkjs runtime)

```js
import { Story } from 'inkjs';             // or load inkjs yourself; the library does not import it
const story = new Story(compiledInkJson);  // a compiled .ink.json (see tools/compile-ink.mjs)
const runner = createInkRunner(story, {
  state: core.state,
  sync: ['passed'],                         // ink variables to keep in the state store, both ways
  externals: inkExternals({ inventory, state: core.state }),   // EXTERNAL giveItem(id), setFlag(name)
});
```

In Ink, start a line with `Speaker: ` or add a tag `# speaker: Guard`; other tags like `# sfx:alarm` arrive in `line.tags`.

**Showing a conversation**

```js
const subtitles = new SubtitleBar();
const menu = new ChoiceMenu({ viewWidth: 640, viewHeight: 360 });
const dialogue = new DialogueSession({ events: core.events, subtitles, menu });
const interactor = new Interactor({ ..., dialogue });          // clicks are ignored while talking

// start one, usually from a handler:
interactor.register('guard', {
  async onInteract() { await dialogue.play(createMarkdownRunner(text, { state: core.state })); },
});

// every frame
core.events.on('update', (dt) => subtitles.update(dt));
// in p.draw:
subtitles.draw(p);
menu.draw(p);
```

Route clicks to the dialogue while it runs (in your `pointerdown`):

```js
if (dialogue.active) {
  if (menu.open) menu.click(pos.x, pos.y); else subtitles.advance();   // click: finish typing, then next line
  return;
}
```

Also call `menu.move(pos.x, pos.y)` on pointer move for the hover highlight, and `menu.pick(0)` for number keys. Player settings: `subtitles.speed = 2` (text twice as fast), `subtitles.enabled = false` (hide the box; lines still pace themselves).

React to tags:

```js
core.events.on('dialogue:tag', ({ key, value }) => { if (key === 'sfx') console.log('play', value); });
```

**Using a runner yourself**

All three give you the same object, so you can drive a conversation in your own way:

```js
let line;
while ((line = runner.next())) console.log(line.speaker, line.text, line.tags);
runner.choices();     // [{ index: 0, text: 'A friend.' }, ...] when waiting for a choice
runner.choose(0);     // pick one, then call runner.next() again
runner.done;          // true when the conversation is over
runner.vars.passed;   // read or write the conversation's variables
```

The text of dialogue comes straight from the dialogue file (that file is what you translate), unlike other text which uses keys.

### 10. Saving and loading

With `createGame()`: `game.save()` and `await game.load()` (which also put the hero back where it stood). Underneath, they do this:

```js
const { saveToSlot, loadFromSlot, exportToFile, importFromFile } = p5.clickery;

core.state.set('hero', hero.toJSON());          // the hero's position is not saved automatically
saveToSlot(core.state, 'slot1');                // to the browser's storage

if (loadFromSlot(core.state, 'slot1')) {        // false when the slot is empty
  await scene.restore();                        // go back to the saved room, no fade
  const saved = core.state.get('hero');
  if (saved) hero.fromJSON(saved);
}

exportToFile(core.state, 'mygame.json');        // download a save file
await importFromFile(core.state, fileFromInput);
```

Everything in `core.state` is saved: flags, variables, inventory, which hotspots are switched off, the "done once" flags, room visits and the current room. What is *not* saved: anything held only in your own JavaScript variables. If you want something saved, keep it in the state.

A corrupt or too-new save file throws an error without changing your game.

### 11. Fitting the window

The game has one fixed *logical* size (say 640 × 360). `LetterboxScaler` scales the canvas to fit its container without stretching it. Spare space becomes bars at the sides (wide window) or top and bottom (a phone held upright).

```html
<style>
  html, body { height: 100%; margin: 0; }
  #stage { width: 100%; height: 100%; background: #000; }   /* the bars show this colour */
</style>
<div id="stage"></div>
```

```js
p.setup = () => {
  const canvas = p.createGameCanvas(640, 360);
  const scaler = new LetterboxScaler({ canvas: canvas.elt, container: document.getElementById('stage'), width: 640, height: 360 }).start();

  const at = (e) => scaler.toLogical(e.clientX, e.clientY);      // use this instead of clientToLogical
  canvas.elt.addEventListener('pointerdown', (e) => pointer.down({ ...at(e), pointerType: e.pointerType, button: e.button }));
};
```

`start()` fits the canvas now and again whenever the window is resized or rotated. Options: `integer: true` keeps whole-number scales (crisp pixel art), `maxScale` caps the size. `scaler.layout` has the current `{ scale, width, height, offsetX, offsetY }` and `scaler.inside(point)` tells you whether a logical point is on the game rather than a bar. The pure function `fitLetterbox(containerW, containerH, logicalW, logicalH, options)` does the maths if you want to handle layout yourself.

Add `<meta name="viewport" content="width=device-width, initial-scale=1">` for phones, and `touch-action: none` on the canvas so dragging does not scroll the page.

### 12. Sound and music

```js
const audio = new AudioManager({ settings });          // settings: see the next section (optional)
audio.register({
  'music-yard': 'audio/yard.ogg',                      // any format the browser plays: wav, ogg, mp3
  'music-cellar': 'audio/cellar.ogg',
  pickup: 'audio/pickup.wav',
});
await audio.loadAll();                                 // decode everything before the game starts
audio.unlockOnGesture(window);                         // browsers only start sound after a first click or tap
```

**Music.** Give a room a `music` field with a sound id. Entering the room crossfades from the old track to the new one:

```js
{ id: 'yard',   music: 'music-yard',   /* ... */ }     // plays 'music-yard'
{ id: 'cellar', music: 'music-cellar', /* ... */ }
{ id: 'attic',  music: null,           /* ... */ }     // silence
{ id: 'porch',                         /* ... */ }     // no field: keep whatever is playing
```

```js
audio.attach(core.events);                             // makes room music (and dialogue sfx tags) work
audio.playMusic('music-yard', { fadeMs: 2000 });       // or start music yourself
audio.stopMusic(1000);
audio.musicId;                                         // the track now playing, or null
```

**Sound effects.** Play one directly, or map events to sounds:

```js
audio.playSfx('pickup');                               // returns { stop() }
audio.playSfx('pickup', { volume: 0.5, loop: false });

audio.attach(core.events, {
  sfx: {
    'inventory:add': 'pickup',                         // an event name -> a sound id
    'room:exit': 'door',
    action: (e) => (e.verb === 'interact' && e.handled ? 'click' : null),   // or a function; null = no sound
  },
});
```

Inside a handler: `ctx.audio.playSfx('click')` (pass `audio` when creating the `Interactor`). In dialogue, a line tagged `# sfx:alarm` plays the sound `alarm` automatically.

If you play a sound that is not loaded yet you get one console warning and no sound, so always `await audio.loadAll()` first. `audio.playVoice(id)` works like `playSfx` but uses the voice volume.

### 13. Player settings

```js
const settings = new Settings();                       // remembers choices in the browser, separately from save games
settings.load();                                       // read what the player chose last time

settings.set('musicVolume', 0.4);                      // numbers are kept inside their range
settings.get('musicVolume');
settings.onChange((name, value) => console.log(name, 'is now', value));
settings.reset();

bindTextSettings(settings, { subtitles, actors: [hero] });   // text speed and subtitles take effect immediately
```

| Setting | Values | Default | Effect |
| --- | --- | --- | --- |
| `textSpeed` | 0.25 to 4 | 1 | Subtitles type and stay for less time; actors' lines are shorter |
| `subtitles` | true / false | true | Hides the subtitle box (lines still pace themselves) |
| `masterVolume` | 0 to 1 | 1 | Everything |
| `musicVolume` | 0 to 1 | 0.7 | Music |
| `sfxVolume` | 0 to 1 | 1 | Sound effects |
| `voiceVolume` | 0 to 1 | 1 | Voice |

The audio volumes follow the settings by themselves when you give the `AudioManager` your `Settings`. Hook sliders to them with `settings.set(...)`; `examples/adventure` has a working panel.

### 14. Debugging

```js
drawDebugOverlay(p, { hotspots: hover.hotspots, room: scene.room, camera: scene.camera, hovered: hover.hovered });
```

Draw it last in `p.draw`, perhaps toggled with a key (the demos use `D`). It outlines hotspots in red (yellow when hovered), walkable areas in blue and obstacles in green. If clicks are not doing what you expect, this shows you why.

---

## Making rooms with the editor

Writing coordinates by hand gets old quickly. The room editor is a separate page (`tools/editor/index.html`, served like the other examples) where you load your room picture, mark out the clickable areas and the floor with the mouse, and export the room JSON that your game loads.

**A first room, in about a minute**

1. Open `tools/editor/index.html` and press **Open image…** (or **Sample room** to try it out).
2. Choose the shape type in **New shape**: *walkable* for the floor, *hotspot* for things to click, *obstacle* for holes in the floor.
3. Pick the **Wand** and click a coloured area of the picture. The selected pixels turn pink. **Shift**-click adds more, **Alt**-click takes some away, **Ctrl**-click selects that colour everywhere instead of only the connected area. The **Tolerance** slider decides how different a colour may be and still count.
4. Press **Enter** (or **Create from selection**). The selection becomes a polygon. **Detail** controls how many corners it gets: lower is more exact, higher is simpler.
   * For a *walkable* area, anything inside it that is not floor (a table, a pillar) becomes an *obstacle* automatically.
5. For shapes the wand cannot find, use the **Polygon** tool: click the corners, then click the first corner again (or double-click, or press Enter) to finish.
6. Name your shapes in the right-hand panel. A hotspot's id is what you use in `interactor.register('door', ...)`; its *name key* is the text shown on hover (it defaults to `obj.<id>`).
7. Use the **Walk-to** tool: select a hotspot, then click where the hero should stand to use it. Use the **Start** tool to place where the hero appears (you can have several, named, for different entrances).
8. Press **Preview** to try the room in the real engine: click to walk, hover and click the hotspots. Fix anything the **Check** list in the panel warns about.
9. Press **Export…** and save the JSON as, for example, `rooms/hall.json`.

**Using the exported room**

```js
const scene = new SceneManager({
  ...core, viewWidth: 640, viewHeight: 360,
  loadRoom: async (id) => (await fetch(`rooms/${id}.json`)).json(),   // the editor's file, unchanged
});
await scene.goTo('hall');
```

The picture is named in the JSON (`"background": "hall.png"`); give `drawBackground` the loaded image under that name (see [Drawing a room](#4-rooms)). **Download text keys** gives you a starter list of the hotspot names to put into `core.i18n`.

**Editing afterwards**

* **Select** tool: click a shape; drag a corner to move it, drag the inside to move the whole shape, **Alt**-click a corner to delete it, double-click an edge to add a corner, **Delete** removes the shape.
* Scroll to zoom; drag with the middle or right mouse button (or hold Space) to pan; **F** fits the picture to the window.
* **Ctrl+Z** / **Ctrl+Y** undo and redo. Your work is kept in the browser automatically, so closing the tab does not lose it.
* **Import…** opens a room JSON again (also one written by hand). Hotspots that use the `svg` or `colorMask` providers are kept exactly as they are; the editor only edits polygon hotspots.
* The editor needs a picture with fairly flat colours for the wand to work well: paint or export the floor, door and so on in distinct colours, or just use the Polygon tool.

## Tools

Besides the room editor, these help with the rest of making a game. Each has a page on the [website](https://flooowlab.github.io/p5.clickery/tools/) with the details.

| Tool | What it does |
| --- | --- |
| Room editor (`tools/editor/index.html`) | Draw hotspots and floors on your room picture, export the room JSON. |
| State inspector | Press the key set by `inspectorKey: 'i'` to see the game's memory, change flags and items, jump to a room and watch events while you play. Off by default. |
| Debug overlay | Press `d` (or set `game.debug = true`) to outline every hotspot and floor. |
| `node tools/check-rooms.mjs rooms/*.json` | Checks room files for mistakes (bad shapes, a `walkTo` off the floor, no start). Exits with 1 on an error. |
| `node tools/find-keys.mjs --strings strings.en.json rooms scripts` | Lists the text keys your game uses, and the ones that are missing, never used, or lacking in a language. |
| Dialogue previewer (`tools/dialogue/index.html`) | Play a Markdown or Twine conversation in a page, with variables and checks for parts that can never be reached. |
| Animation previewer (`tools/animation/index.html`) | Cut a sprite sheet into frames, preview the animations and copy the hero's `animations` option. |
| `node tools/compile-ink.mjs file.ink` | Compiles Ink to the `.ink.json` that `game.talk` plays. |

The pages in `tools/` import from `src/`, so serve the folder (`npx http-server`) rather than opening the files directly.

## Recipes

**A door to another room**

```js
// in the hall room: { id: 'door', ..., walkTo: { x: 850, y: 300, dir: 'right' } }
interactor.register('door', {
  onInteract: async () => { await scene.goTo('cellar', 'fromHall'); },
});
// the cellar room has:  starts: { default: {...}, fromHall: { x: 100, y: 300 } }
```

**Pick something up**

```js
interactor.register('stick', {
  async onInteract(ctx) {
    ctx.inventory.give('stick');
    ctx.setEnabled('stick', false);        // it is no longer in the room
    await ctx.say('stick.got');
  },
});
```

To draw it only while it is still there: `if (core.state.get('rooms.yard.hotspots.stick.enabled', true)) { ...draw it... }`.

**A locked door that opens with a key**

```js
interactor.register('door', {
  onInteract: (ctx) => ctx.say('door.locked'),
  async onUse(ctx) {
    if (ctx.item !== 'key') return false;
    ctx.inventory.remove('key');
    ctx.state.set('flags.doorOpen', true);
    await ctx.say('door.opens');
  },
});
```

**Something that changes after you do something**

```js
interactor.register('lever', {
  async onInteract(ctx) {
    const on = !ctx.state.get('flags.bridgeDown', false);
    ctx.state.set('flags.bridgeDown', on);
    await ctx.say(on ? 'lever.down' : 'lever.up');
  },
});
// in p.draw, draw the bridge according to core.state.get('flags.bridgeDown', false)
```

**A hotspot that comes and goes depending on a flag**

Handle it in your handler: `if (!ctx.state.get('flags.hasLamp')) return ctx.say('too.dark');`.

**Run something every second**

```js
core.scheduler.every(1000, () => core.state.set('vars.seconds', core.state.get('vars.seconds', 0) + 1));
```

---

## Troubleshooting

| Problem | Likely cause |
| --- | --- |
| `createGame is not defined` | Load `p5.clickery.min.js` *after* `p5.min.js`, and use p5.js **2.x**. With modules, call `registerClickery(p5)` before `new p5(...)`. |
| The page is blank and the console mentions CORS, `fetch` or modules | The game loads files (rooms, sounds, dialogue) or uses modules, and the page was opened directly. Serve the folder with a local web server. |
| `this is an Ink story: load ink.js first` | Add `<script src="ink.js"></script>` (from the inkjs package) before your sketch, or pass `Story` to `createGame`. |
| `p5.registerAddon is not a function` | The library needs p5.js **2.x**. |
| Clicks land in the wrong place | Use `clientToLogical(...)` for every pointer position, and make sure the size you pass matches `createGameCanvas`. |
| Nothing happens when I click a hotspot | Is its `id` the one in `game.on(id, ...)`? Press `D` to see the outlines. (Without `createGame`: did you call `hover.setHotspots(createHotspots(room))` in `room:enter`?) |
| The hero does not walk | Is there a `walkable` area under the click? Is `game.draw()` called in `draw()` (and not `noLoop()`)? (Without `createGame`: set `hero.navigator`, and call `hero.update(dt)` every frame.) |
| The hero walks to the wrong spot | The click was off the floor and snapped to the nearest walkable point, or a `walkable` polygon is wrong. Check the overlay. |
| I see `[some.key]` on screen | That text key has no text. Add it to `strings`. |
| `unknown item "x"` | Add the item to `items`. |
| `state values must be JSON-serialisable` | You tried to store a function or `undefined`. Store plain data; use `null` for "nothing". |
| The hero says "I can't use that" | The handler is missing or returned `false`. That is the default answer working as designed. |
| A cutscene hangs | Something in it waits for time or a walk but nothing advances the game. Is `game.draw()` called every frame, and is the sketch looping? |
| `already changing rooms` | You called `goTo` while another change was running. Wait for the first `await` to finish. |
| `a conversation is already running` | Start one conversation at a time (`await game.talk(...)`). |

---

## Cheat sheet

**Game**: `createGame({ rooms, strings, items, recipes, sounds })` · `game.on(id, {...})` · `await game.start()` · `game.draw()` · `goTo` · `say` · `talk` · `cutscene` · `flag` · `give` / `take` / `has` · `save` / `load` · `drawRoom` / `drawHero` / `drawSpeech`

**The parts, one by one** (on `p5.clickery` with the script tag):

**Setup**: `registerClickery(p5)` · `p.createGameCanvas(w, h)` · `createCore()` → `{ events, scheduler, state, i18n, loop }`

**Core**: `events.on/once/off/emit` · `scheduler.after/every/wait` · `state.get/set/watch/toJSON/fromJSON` · `loop.start/pause/resume` · `i18n.add/t`

**Rooms**: `new SceneManager({...core, viewWidth, viewHeight, loadRoom, scripts, fadeMs})` · `goTo(id, start)` · `restore()` · `camera.centerOn/follow/moveTo` · `drawBackground/drawForeground/drawFade`

**Hotspots**: `createHotspots(room, assets)` · `applyHotspotState(state, roomId, hotspots)` · `new HoverTracker(events)` · providers `polygon`, `svg`, `colorMask`

**Walking**: `Navigator.fromRoom(room)` · `new Actor({...})` · `walkTo` · `say` · `face` · `teleport` · `stop` · `drawAnimation` · `sortByBaseline`

**Actions**: `new Inventory({...})` · `new Interactor({...})` · `interactor.register(id, { onInteract, onLook, onUse })` · `new PointerController({...})` · `new InventoryBar({...})` · `hoverLabel` · `drawHoverLabel`

**Scripts**: `new Scripts({ interactor })` · `new Cutscenes({...})` · `run` · `skip` · `cs.label/wait` · `firstLook/firstInteract/firstUse/once`

**Dialogue**: `createMarkdownRunner` · `createTwineRunner` · `createInkRunner` · `inkExternals` · `new DialogueSession({...})` · `new SubtitleBar()` · `new ChoiceMenu({...})`

**Saving**: `saveToSlot` · `loadFromSlot` · `deleteSlot` · `exportToFile` · `importFromFile`

**Window, sound, settings**: `new LetterboxScaler({...}).start()` · `fitLetterbox` · `new AudioManager({ settings })` · `register` · `loadAll` · `playMusic` · `playSfx` · `attach` · `new Settings()` · `bindTextSettings`

**Debug**: `drawDebugOverlay`

All of these are on `p5.clickery` (script tag) and exported by name from `p5.clickery.esm.js` (modules).

---

## Good to know

* The editor exports polygon hotspots. Hotspots built from an SVG file or a colour-mask picture are written by hand in the room JSON (the editor keeps them when you import such a file).
* Dialogue text lives in the dialogue files (Markdown, Twine, Ink); everything else the player reads is a text key in `core.i18n`.
* TypeScript type definitions are not included yet.

* The exact format of rooms, hotspots, scripts, dialogue files, state and saves is in [docs/reference.md](docs/reference.md).
* Licence: [MIT](LICENSE).

See [CHANGELOG.md](CHANGELOG.md) for what each version adds.
