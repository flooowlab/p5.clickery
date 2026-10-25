---
title: Core
blurb: The game's memory, events, timers, text and settings, and saving.
---
<!-- page: The game's memory -->
<!-- covers: Game#state, StateStore#get, StateStore#set, StateStore#watch, StateStore#toJSON, StateStore#fromJSON -->
`game.state` remembers everything that must survive saving: flags, variables, the inventory, the current room. Paths are dotted: `'flags.doorOpen'`, `'rooms.cellar.lit'`. `get(path, fallback)` reads (the fallback is for when nothing is stored), `set(path, value)` writes, and `watch(path, fn)` calls you back when the value changes (and gives you a function to stop watching). Values must be plain data, so no functions, and `undefined` is refused; use `null` for "nothing". By convention `flags.*` holds yes/no facts, `vars.*` numbers and text.

`toJSON()` is a copy of the whole state, and `fromJSON(json)` replaces it, which is all that saving and loading is. Click the lever: the watcher fires.

```js
let game;
let watched = 'nothing yet';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
        points: [[300, 200], [330, 200], [330, 250], [300, 250]], walkTo: { x: 315, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.lever': 'Lever' },
  });

  game.state.watch('vars.pulls', (now, before) => { watched = before + ' -> ' + now; });
  game.state.set('vars.pulls', 0);

  game.on('lever', {
    onInteract: () => game.state.set('vars.pulls', game.state.get('vars.pulls', 0) + 1),
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('pulls changed: ' + watched, 10, 22);
  text('missing value with a fallback: ' + game.state.get('flags.nothing', 'none'), 10, 40);
  text('whole state: ' + JSON.stringify(game.state.toJSON()).slice(0, 90) + '...', 10, 58);
}

function keyPressed() {
  if (key === 'r') game.state.fromJSON({ vars: { pulls: 0 } });
}
```

<!-- page: Events -->
<!-- covers: Game#events, EventBus#on, EventBus#once, EventBus#off, EventBus#emit -->
`game.events` announces what happens: `room:enter`, `inventory:add`, `hover`, `dialogue:line`, `cutscene:end` and more (a full list is in the reference). `on(type, fn)` listens and returns a function that stops listening; `once` listens for just the next time; `off(type, fn)` stops by hand; and `emit(type, ...data)` announces your own events, which is a tidy way to let one part of your game talk to another without them knowing about each other.

A handler that throws does not stop the others. Click the bell.

```js
let game;
let log = [];

async function setup() {
  game = createGame({
    items: { coin: 'gold coin' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'bell', name: 'obj.bell', provider: 'polygon', color: '#c9a227',
        points: [[300, 190], [340, 190], [340, 250], [300, 250]], walkTo: { x: 320, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.bell': 'Bell' },
  });

  const stopListening = game.events.on('ring', (times) => log.push('ring x' + times));
  game.events.once('ring', () => log.push('(first ring only)'));
  game.events.on('inventory:add', ({ id }) => log.push('got ' + id));

  let rings = 0;
  game.on('bell', {
    onInteract: () => {
      rings += 1;
      if (rings === 3) stopListening();
      game.events.emit('ring', rings);
      if (rings === 2) game.give('coin');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('click the bell; the third ring is not heard any more', 10, 22);
  log.slice(-6).forEach((line, i) => text(line, 10, 42 + i * 16));
}
```

<!-- page: Timers -->
<!-- covers: Game#scheduler, Scheduler#after, Scheduler#every, Scheduler#wait, Scheduler#clear, Scheduler#size, Timer#cancel, Timer#cancelled, Timer#delay, Timer#remaining, Timer#repeat -->
Timers run on **game time**: it only passes while the game is updated, so they stop when the game is paused. `after(ms, fn)` calls once, `every(ms, fn)` again and again, both give you a `Timer` you can `cancel()`, and `await wait(ms)` pauses an async function. `clear()` cancels everything, and `size` counts what is waiting.

A timer has `delay`, `remaining`, `repeat` and `cancelled`, so you can show a countdown. Press **C** to cancel the repeating timer, or **X** to clear all.

```js
let game;
let ticks = 0;
let ticker;
let delayed;
let message = 'waiting...';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();

  ticker = game.scheduler.every(500, () => { ticks += 1; });
  delayed = game.scheduler.after(4000, () => { message = 'four seconds passed'; });

  // wait() returns a promise: say what happens next with then() (and do not await it in setup())
  game.scheduler.wait(2000).then(() => { message = 'two seconds passed (waited)'; });
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text(`ticks: ${ticks}   (every ${ticker.delay} ms, repeat ${ticker.repeat}, cancelled ${ticker.cancelled})`, 10, 22);
  text(`one-off timer: ${Math.max(0, delayed.remaining).toFixed(0)} ms left   timers waiting: ${game.scheduler.size}`, 10, 40);
  text(message, 10, 58);
}

function keyPressed() {
  if (key === 'c') ticker.cancel();
  if (key === 'x') game.scheduler.clear();
}
```

<!-- page: Text and languages -->
<!-- covers: Game#i18n, I18n#add, I18n#t, I18n#has, I18n#language, I18n#fallback, I18n#tables -->
Every word the player reads is a **text key**. `game.i18n` looks keys up in the current language (`language`), falls back to another (`fallback`, English by default) and, for a key nobody wrote, returns `[key]` so the gap is easy to see. `add(language, strings)` adds texts, `t(key, vars)` looks one up and fills `{name}` placeholders, `has(key)` asks, and `tables` holds everything.

To translate a game, add a second table and change `language`. Press **E** for English and **I** for Italian: the missing Italian string falls back to English.

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
        points: [[300, 170], [380, 170], [380, 250], [300, 250]], walkTo: { x: 340, y: 290, dir: 'up' },
      }],
    }],
    strings: {
      'obj.sign': 'Sign',
      'sign.look': 'Hello, {name}!',
      'sign.only_english': 'Only English has this one.',
    },
  });

  game.i18n.add('it', { 'obj.sign': 'Cartello', 'sign.look': 'Ciao, {name}!' });
  game.on('sign', {
    onLook: () => game.hero.say(game.i18n.t('sign.look', { name: 'Ada' }), { literal: true }),
    onInteract: (ctx) => ctx.say('sign.only_english'),
  });

  await game.start();
}

function draw() {
  game.draw();
  const t = game.i18n;
  fill(255);
  textSize(13);
  text(`language ${t.language} (falls back to ${t.fallback})   languages: ${Object.keys(t.tables).join(', ')}`, 10, 22);
  text(`has "sign.only_english": ${t.has('sign.only_english')}   a missing key: ${t.t('nothing.here')}`, 10, 40);
}

function keyPressed() {
  if (key === 'e') game.i18n.language = 'en';
  if (key === 'i') game.i18n.language = 'it';
}
```

<!-- page: Saving -->
<!-- covers: Game#save, saveToSlot, loadFromSlot, deleteSlot, serialize, deserialize, SAVE_VERSION -->
`game.save()` and `game.load()` are all you need for one save. Underneath they use `saveToSlot(state, slot)` and `loadFromSlot(state, slot)`, which keep a slot in the browser's `localStorage`, and `deleteSlot(slot)` empties one. Use different slot names to give the player several saves. `serialize(state)` makes the save as text (a version number, the time and the state), and `deserialize(state, text)` restores it and refuses text that is not a save or comes from a newer version (`SAVE_VERSION`), before touching anything.

Press **1** or **2** to save to a slot, **Q** or **W** to load it, and **D** to delete both.

```js
const { saveToSlot, loadFromSlot, deleteSlot, serialize, SAVE_VERSION } = p5.clickery;
let game;
let message = 'nothing saved yet';

async function setup() {
  game = createGame({
    items: { key: 'brass key' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'keyspot', name: 'obj.key', provider: 'polygon', color: '#e0c050',
        points: [[300, 275], [340, 275], [340, 295], [300, 295]], walkTo: { x: 320, y: 310 },
      }],
    }],
    strings: { 'obj.key': 'Brass key' },
  });

  game.on('keyspot', {
    onInteract: (ctx) => { game.give('key'); ctx.setEnabled('keyspot', false); },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('1/2 save to slot one/two, Q/W load, D delete both   (save format version ' + SAVE_VERSION + ')', 10, 22);
  text(message, 10, 40);
  text('as text, the state is ' + serialize(game.state).length + ' characters', 10, 58);
}

function keyPressed() {
  if (key === '1') { saveToSlot(game.state, 'one'); message = 'saved to slot one'; }
  if (key === '2') { saveToSlot(game.state, 'two'); message = 'saved to slot two'; }
  if (key === 'q') message = loadFromSlot(game.state, 'one') ? 'loaded slot one' : 'slot one is empty';
  if (key === 'w') message = loadFromSlot(game.state, 'two') ? 'loaded slot two' : 'slot two is empty';
  if (key === 'd') { deleteSlot('one'); deleteSlot('two'); message = 'both slots deleted'; }
}
```

<!-- page: Saves as files -->
<!-- headless: skip -->
<!-- covers: exportToFile, importFromFile -->
A save in `localStorage` stays in one browser. `exportToFile(state, 'savegame.json')` offers the save as a file to download, so the player can keep it, move it to another computer or send it to you when something goes wrong, and `importFromFile(state, file)` restores it from a file the player chose. They use the same save format as `saveToSlot`, and an import that is not a save (or comes from a newer version) is refused before anything changes. They only work in a browser.

Pull the lever, press **E** to download the save, pull it again, then press **O** to open the file and see the lever's count go back. After importing a state, re-enter the room with `game.scene.restore()` so the room matches it.

```js
const { exportToFile, importFromFile } = p5.clickery;
let game;
let message = 'pull the lever, then press E';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
        points: [[300, 200], [330, 200], [330, 250], [300, 250]], walkTo: { x: 315, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.lever': 'Lever' },
  });
  game.on('lever', { onInteract: () => game.state.set('vars.pulls', game.state.get('vars.pulls', 0) + 1) });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('lever pulled ' + game.state.get('vars.pulls', 0) + ' times   (E downloads the save, O opens a save file)', 10, 22);
  text(message, 10, 40);
}

function keyPressed() {
  if (key === 'e') { exportToFile(game.state, 'lever-save.json'); message = 'saved as lever-save.json'; }
  if (key === 'o') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      try {
        await importFromFile(game.state, input.files[0]);
        await game.scene.restore();
        message = 'loaded';
      } catch (err) {
        message = 'not a save: ' + err.message;
      }
    };
    input.click();
  }
}
```

<!-- page: Player settings -->
<!-- covers: Game#settings, Settings#get, Settings#set, Settings#onChange, Settings#reset, Settings#all, Settings#load, Settings#save -->
The player's preferences live in `game.settings`: `textSpeed` (0.25 to 4), `subtitles` (on or off) and the volumes `masterVolume`, `musicVolume`, `sfxVolume` and `voiceVolume` (0 to 1). They belong to the player, not to a saved game, so they are kept under their own storage key and loaded when the game starts. `set` keeps numbers in range, saves, and tells everyone listening (`onChange`); `get` reads one; `all` is a copy of the lot; `reset` goes back to the defaults.

The game already listens: change `textSpeed` and the hero's lines and the subtitles follow. Press **+** and **-** for text speed, **S** for subtitles and **R** to reset.

```js
let game;
let last = 'no changes yet';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: { 'hero.hello': 'I read at whatever speed you choose.' },
  });
  game.settings.onChange((name, value) => { last = name + ' is now ' + value; });
  await game.start();
  game.say('hero.hello');
}

function draw() {
  game.draw();
  const s = game.settings;
  fill(255);
  textSize(13);
  text('+ / - text speed, S subtitles, R reset', 10, 22);
  text(`textSpeed ${s.get('textSpeed')}   subtitles ${s.get('subtitles')}   musicVolume ${s.get('musicVolume')}`, 10, 40);
  text(last + '   (' + Object.keys(s.all).length + ' settings in all)', 10, 58);
}

function keyPressed() {
  const s = game.settings;
  if (key === '+') s.set('textSpeed', s.get('textSpeed') * 1.5);
  if (key === '-') s.set('textSpeed', s.get('textSpeed') / 1.5);
  if (key === 's') s.set('subtitles', !s.get('subtitles'));
  if (key === 'r') s.reset();
  game.say('hero.hello');
}
```

<!-- page: Building from the parts -->
<!-- covers: createCore, GameLoop#tick, GameLoop#paused, GameLoop#pause, GameLoop#resume, GameLoop#running, GameLoop#start, GameLoop#stop -->
`createGame` is made of parts, and you can use them alone. `createCore()` gives you one of each: `events`, `scheduler`, `state`, `i18n` and a game `loop`. The loop turns timestamps into steps (never more than 100 ms, so a hidden tab does not make the game jump), honours `pause()` and `resume()`, and updates the scheduler and sends `update`. `start()` runs it by itself with `requestAnimationFrame`; `tick(now)` moves it one frame by hand, which is what tests do.

Here the loop is ticked from p5's own `draw`. Press **P** to pause and resume.

```js
const { createCore } = p5.clickery;
const core = createCore();
let seconds = 0;

function setup() {
  createCanvas(640, 360);
  core.scheduler.every(1000, () => { seconds += 1; });
  core.events.on('update', (dt) => { core.state.set('vars.lastStep', Math.round(dt)); });
}

function draw() {
  core.loop.tick(millis());
  background(40, 50, 75);
  fill(255);
  textSize(16);
  text('seconds counted by a scheduler: ' + seconds, 20, 40);
  text('loop paused: ' + core.loop.paused + '   running by itself: ' + core.loop.running, 20, 70);
  text('last step: ' + core.state.get('vars.lastStep', 0) + ' ms', 20, 100);
  text('press P to pause and resume', 20, 140);
}

function keyPressed() {
  if (key === 'p') (core.loop.paused ? core.loop.resume() : core.loop.pause());
}
```
