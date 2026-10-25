---
title: Sound and screen
blurb: Music and sound effects, fitting any window, and the inventory bar.
---
<!-- page: Music and sound effects -->
<!-- covers: Game#audio, AudioManager#playSfx, AudioManager#playMusic, AudioManager#stopMusic, AudioManager#musicId, AudioManager#attach, AudioManager#unlock, AudioManager#unlockOnGesture -->
List your sounds in the `sounds` option (an id and a file). A room's `music` field plays a track when you enter, crossfading from the last one (leave it out to keep playing, `null` for silence), and the `sfx` option ties sound effects to events: `{ 'inventory:add': 'pickup' }` plays `pickup` whenever an item is picked up. A dialogue tag `# sfx:alarm` plays `alarm` too. That is `audio.attach` at work.

`game.audio` plays things by hand: `playSfx(id)`, `playMusic(id)`, `stopMusic()`. Browsers only allow sound after the first click or key press (`unlock` and `unlockOnGesture` handle that for you), so click the picture first. Playing a sound that is missing is silent, never an error. `game.audio` is `null` in a game with no `sounds`.

Press **P** for a click sound, **M** to stop or start the music. The sounds are the little placeholders in the examples.

```js
let game;
const audioDir = '../examples/assets/audio/';

async function setup() {
  game = createGame({
    items: { coin: 'gold coin' },
    sounds: {
      click: audioDir + 'click.wav',
      pickup: audioDir + 'pickup.wav',
      'music-yard': audioDir + 'music-yard.wav',
    },
    sfx: { 'inventory:add': 'pickup' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55', music: 'music-yard',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'coinspot', name: 'obj.coin', provider: 'polygon', color: '#e0c050',
        points: [[300, 275], [330, 275], [330, 295], [300, 295]], walkTo: { x: 315, y: 310 },
      }],
    }],
    strings: { 'obj.coin': 'Gold coin' },
  });

  game.on('coinspot', {
    onInteract: (ctx) => { game.give('coin'); ctx.setEnabled('coinspot', false); },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('click the picture once, then: P click sound, M music on and off, pick up the coin for a sound', 10, 22);
  text('music playing: ' + (game.audio ? game.audio.musicId : 'no sound in this browser'), 10, 40);
}

function keyPressed() {
  if (!game.audio) return;
  if (key === 'p') game.audio.playSfx('click');
  if (key === 'm') (game.audio.musicId ? game.audio.stopMusic() : game.audio.playMusic('music-yard'));
}
```

<!-- page: Loading and volumes -->
<!-- covers: AudioManager#register, AudioManager#load, AudioManager#loadAll, AudioManager#sounds, AudioManager#applyVolumes, AudioManager#playVoice, AudioManager#dispose -->
The game loads every sound before it starts. You can also add one later: `audio.register({ id: 'file.ogg' })` tells the manager about it and `await audio.load(id)` fetches and decodes it (`loadAll()` does them all, and `audio.sounds` lists what is known and loaded). Voice lines go through `playVoice(id)`, on their own volume.

There are four volumes, `masterVolume`, `musicVolume`, `sfxVolume` and `voiceVolume`, and they come from the player's settings: change one with `game.settings.set` and `applyVolumes()` runs by itself. `dispose()` stops everything and closes the audio context. Press **+** and **-** to change the music volume.

```js
let game;
const audioDir = '../examples/assets/audio/';

async function setup() {
  game = createGame({
    sounds: { 'music-yard': audioDir + 'music-yard.wav' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55', music: 'music-yard',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();

  if (game.audio) {
    game.audio.register({ door: audioDir + 'door.wav' });
    await game.audio.load('door');
  }
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  const s = game.settings;
  text('+ / - music volume: ' + s.get('musicVolume').toFixed(1) + '   D plays the door sound (click the picture first)', 10, 22);
  const known = game.audio ? [...game.audio.sounds].map(([id, sound]) => id + (sound.buffer ? ' (loaded)' : ' (not loaded)')) : [];
  text('sounds: ' + (known.join(', ') || 'none'), 10, 40);
}

function keyPressed() {
  const s = game.settings;
  if (key === '+') s.set('musicVolume', Math.min(1, s.get('musicVolume') + 0.1));
  if (key === '-') s.set('musicVolume', Math.max(0, s.get('musicVolume') - 0.1));
  if (key === 'd' && game.audio) game.audio.playSfx('door');
}
```

<!-- page: Fit any window -->
<!-- covers: Game#scaler, LetterboxScaler#layout, LetterboxScaler#toLogical, LetterboxScaler#inside, fitLetterbox, clientToLogical -->
The game has one fixed size (640 by 360 unless you set `width` and `height`) and is scaled, never stretched, to fill its page, with bars where the shape does not match: at the sides in a wide window, above and below on a phone held upright. `game.scaler` does it and keeps doing it as the window changes. Its `layout` is the latest result (`scale`, `width`, `height`, `offsetX`, `offsetY`), `toLogical(clientX, clientY)` turns a browser position into a game position, and `inside(point)` says whether that position is on the game rather than on a bar.

`fitLetterbox` is the pure calculation behind it, so you can ask what a layout would be: here it is for a few window sizes. Resize this frame, or your window, and watch the real layout change. (`fit: false` leaves the canvas at its own size.)

```js
const { fitLetterbox } = p5.clickery;
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  const sizes = [[1280, 720], [1000, 400], [390, 800]];
  sizes.forEach(([w, h], i) => {
    const f = fitLetterbox(w, h, 640, 360);
    text(`a ${w} x ${h} window: scale ${f.scale.toFixed(2)}, bars ${f.offsetX.toFixed(0)} px at the sides and ${f.offsetY.toFixed(0)} above and below`, 10, 22 + i * 18);
  });
  const layout = game.scaler && game.scaler.layout;
  if (layout) text(`this frame: scale ${layout.scale.toFixed(2)}, canvas ${layout.width.toFixed(0)} x ${layout.height.toFixed(0)}`, 10, 90);
}
```

<!-- page: The inventory bar -->
<!-- covers: Game#bar, InventoryBar#top, InventoryBar#perRow, InventoryBar#slotRect, InventoryBar#contains, InventoryBar#itemAt, hoverLabel -->
The inventory bar runs along the bottom of the screen. `bar.top` is where it starts, `bar.perRow` is how many items fit, `bar.slotRect(i)` is the rectangle of slot `i`, `bar.contains(x, y)` says whether a point is on the bar (so clicks on it never fall through to the room) and `bar.itemAt(x, y, items)` says which item is at a point. Its size and spacing are the `slot`, `gap` and `margin` options of `InventoryBar`.

The label near the pointer comes from `hoverLabel`: the object's name, or "Use rope with Door" while an item is held. Pick up the key, then hover the door.

```js
const { hoverLabel } = p5.clickery;
let game;

async function setup() {
  game = createGame({
    items: { key: 'brass key', coin: 'gold coin', map: 'old map' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'door', name: 'obj.door', provider: 'polygon', color: '#6b4a2f',
        points: [[500, 120], [580, 120], [580, 250], [500, 250]], walkTo: { x: 540, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.door': 'Door' },
  });
  game.give('key');
  game.give('coin');
  game.give('map');
  await game.start();
}

function draw() {
  game.draw();
  const bar = game.bar;
  const first = bar.slotRect(0);
  fill(255);
  textSize(13);
  text(`the bar starts at y ${bar.top}, fits ${bar.perRow} items; slot 0 is at x ${first.x}, y ${first.y}, ${first.w} wide`, 10, 22);
  const over = bar.itemAt(mouseX, mouseY, game.inventory.list);
  text('item under the pointer: ' + over + '   on the bar: ' + bar.contains(mouseX, mouseY), 10, 40);
  const label = hoverLabel({
    hotspot: game.hover.hovered, item: over, held: game.interactor.held,
    inventory: game.inventory, t: (key, vars) => game.i18n.t(key, vars),
  });
  text('the hover label would say: "' + label + '"', 10, 58);
}
```
