---
title: Pictures
blurb: Backgrounds, parallax layers, item pictures and sprite sheets for the hero.
---
<!-- page: A background picture -->
<!-- headless: skip -->
<!-- covers: Game#images, Room -->
Until now rooms were flat colours. A room's `background` is the name of a picture: `background: 'hall.png'`. A picture loads **relative to the room's file**, or relative to the page when the room is written in your code. The game loads every room's pictures when you call `game.start()`, and keeps them in `game.images` under the names the room uses (a picture already there is not loaded again, so you can also put in your own).

So you do not need any art to try this, the sketch below makes its picture in code with a canvas, and uses the picture's data as the name. With real art you would write the file name instead, and nothing else changes. The hero walks in front of the picture, and the floor and hotspots are still the shapes you describe: the picture is only what the player sees.

```js
let game;

// makes a picture in code. With real art you would use a file name such as 'yard.png'
function picture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  return canvas.toDataURL();
}

const yard = picture(640, 360, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, '#6aa6d8');
  sky.addColorStop(1, '#e7e1c4');
  g.fillStyle = sky;
  g.fillRect(0, 0, 640, 360);
  g.fillStyle = '#5b8f5a';
  g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(160, 170, 330, 235); g.quadraticCurveTo(500, 190, 640, 250); g.lineTo(640, 360); g.lineTo(0, 360); g.fill();
  g.fillStyle = '#b08a5a';
  g.fillRect(0, 250, 640, 110);
  g.fillStyle = '#7a5a3a';
  g.fillRect(470, 150, 14, 100);
  g.fillStyle = '#3f8f4f';
  g.beginPath(); g.arc(477, 140, 46, 0, Math.PI * 2); g.fill();
});

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360,
      background: yard,
      starts: { default: { x: 120, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 252], [640, 252], [640, 345], [0, 345]] }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('pictures loaded for the yard: ' + Object.keys(game.images.get('yard')).length, 10, 22);
}
```

<!-- page: Parallax layers -->
<!-- headless: skip -->
<!-- covers: RoomLayer, drawBackground, drawForeground -->
**Parallax** makes a room feel deep: pictures far away move slowly when the camera moves, near ones fast. In a room, `layers` is a list of pictures, each with a `parallax` and a `depth`:

- `parallax: 1` moves with the room, like the floor. `0` stays fixed on the screen (a sky). In between, such as `0.3`, looks far away; above `1`, such as `1.4`, looks closer than the action.
- `depth: 'bg'` is drawn behind the hero (after the `background`), and `depth: 'fg'` in front of everything, so the hero can walk behind a pillar.

The `background` moves with the room, so it should be as big as the room. A layer must be wide enough to still cover the screen at the far end of the camera: about the screen width plus the room's extra width times the `parallax`. The game draws them with `drawBackground` and `drawForeground`, which you can also call yourself. Walk right and watch the mountains, the trees and the posts move at three different speeds.

```js
let game;

function picture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  return canvas.toDataURL();
}

// the room is 1280 wide and the screen 640. The background moves with the room, so it is as wide as the
// room; a layer needs 640 + 640 * parallax pixels
const sky = picture(1280, 360, (g) => {
  const grad = g.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, '#355c8a');
  grad.addColorStop(1, '#e8c98a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1280, 360);
});
const mountains = picture(840, 360, (g) => {
  g.fillStyle = '#6b6f9a';
  for (let x = -60; x < 900; x += 190) { g.beginPath(); g.moveTo(x, 250); g.lineTo(x + 95, 110); g.lineTo(x + 190, 250); g.fill(); }
});
const trees = picture(1030, 360, (g) => {
  for (let x = 30; x < 1030; x += 120) { g.fillStyle = '#4a3a2a'; g.fillRect(x, 190, 10, 70); g.fillStyle = '#3f7f4f'; g.beginPath(); g.arc(x + 5, 180, 34, 0, Math.PI * 2); g.fill(); }
});
const posts = picture(1540, 360, (g) => {
  for (let x = 100; x < 1540; x += 330) { g.fillStyle = '#2b2118'; g.fillRect(x, 150, 22, 210); g.fillRect(x - 12, 150, 46, 14); }
});

async function setup() {
  game = createGame({
    rooms: [{
      id: 'long', width: 1280, height: 360,
      background: sky,
      layers: [
        { image: mountains, depth: 'bg', parallax: 0.3 },
        { image: trees, depth: 'bg', parallax: 0.6 },
        { image: posts, depth: 'fg', parallax: 1.4 },
      ],
      starts: { default: { x: 80, y: 305 } },
      walkable: [{ id: 'floor', points: [[0, 262], [1280, 262], [1280, 345], [0, 345]], color: '#4a3d30' }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('walk to the right: mountains x0.3, trees x0.6, posts in front x1.4   camera x ' + game.scene.camera.x.toFixed(0), 10, 22);
}
```

<!-- page: Pictures for items -->
<!-- headless: skip -->
<!-- covers: Game#itemImages -->
An item can have a picture for the inventory bar: instead of the short form `{ key: 'brass key' }`, write `{ key: { text: 'brass key', image: 'key.png' } }`. The picture loads like a room picture, relative to the page, and ends up in `game.itemImages`. Without one the bar shows the item's id as text. Pick up the key and the coin.

```js
let game;

function picture(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  paint(canvas.getContext('2d'));
  return canvas.toDataURL();
}

const keyPicture = picture((g) => {
  g.strokeStyle = '#e0c050'; g.lineWidth = 5;
  g.beginPath(); g.arc(13, 20, 8, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(21, 20); g.lineTo(36, 20); g.moveTo(31, 20); g.lineTo(31, 28); g.moveTo(26, 20); g.lineTo(26, 26); g.stroke();
});
const coinPicture = picture((g) => {
  g.fillStyle = '#e0c050'; g.beginPath(); g.arc(20, 20, 15, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b8962e'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('$', 20, 27);
});

async function setup() {
  game = createGame({
    items: {
      key: { text: 'brass key', image: keyPicture },
      coin: { text: 'gold coin', image: coinPicture },
      map: 'old map',  // no picture: the bar shows its name
    },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'keyspot', name: 'obj.key', provider: 'polygon', color: '#e0c050', points: [[200, 275], [240, 275], [240, 295], [200, 295]], walkTo: { x: 220, y: 315 } },
        { id: 'coinspot', name: 'obj.coin', provider: 'polygon', color: '#e0c050', points: [[400, 275], [430, 275], [430, 295], [400, 295]], walkTo: { x: 415, y: 315 } },
      ],
    }],
    strings: { 'obj.key': 'Brass key', 'obj.coin': 'Gold coin' },
  });

  for (const [spot, item] of [['keyspot', 'key'], ['coinspot', 'coin']]) {
    game.on(spot, { onInteract: (ctx) => { game.give(item); ctx.setEnabled(spot, false); } });
  }
  game.give('map');

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('item pictures loaded: ' + Object.keys(game.itemImages).join(', '), 10, 22);
}
```

<!-- page: Sprite sheets -->
<!-- headless: skip -->
<!-- covers: spriteFrames, drawAnimation -->
A **sprite sheet** is one picture holding a grid of equal frames, which is how most characters are drawn. `spriteFrames(sheet, frameWidth, frameHeight)` cuts it into a list of images, numbered left to right and top to bottom. Give those to the hero's `animations`: names are `idle`, `walk` or `talk`, optionally followed by a direction (`walk_right`), and each is `{ frames, delay }` with the delay in milliseconds. Directions you do not draw are mirrored from the opposite side, so `walk_right` alone also serves `walk_left`.

The game draws the hero's animation by itself (that is `drawAnimation`, with the feet at the hero's position, and it is what you would call in your own `game.drawHero`). The **animation previewer** in the Tools section builds this code for you from your own sheet. Click the floor to walk, and press **T** to talk.

```js
const { spriteFrames } = p5.clickery;
let game;

// a sheet made in code: 4 columns x 3 rows of 64 x 64 frames. With art you would write: loadImage('hero.png')
function makeSheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const g = canvas.getContext('2d');
  for (let i = 0; i < 12; i++) {
    const x = (i % 4) * 64;
    const y = Math.floor(i / 4) * 64;
    const step = i % 2 ? 6 : -6;
    g.fillStyle = i < 4 ? '#ef7a5a' : i < 8 ? '#5a9bef' : '#7fd6a8';
    g.fillRect(x + 20, y + 22, 24, 30);               // body
    g.beginPath(); g.arc(x + 32, y + 15, 9, 0, Math.PI * 2); g.fill();   // head
    g.fillStyle = '#2b2118';
    g.fillRect(x + 22 + step, y + 52, 8, 12);          // legs
    g.fillRect(x + 34 - step, y + 52, 8, 12);
    g.fillStyle = '#fff';
    g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
    g.fillText(i < 4 ? (i === 1 || i === 2 ? 'talk' : 'idle') : i < 8 ? '→' : '↓', x + 32, y + 41);
  }
  return canvas.toDataURL();
}

async function setup() {
  const sheet = await loadImage(makeSheet());
  const frames = spriteFrames(sheet, 64, 64);

  game = createGame({
    hero: {
      directions: 4,
      animations: {
        idle: { frames: [frames[0]], delay: 200 },
        talk: { frames: [frames[1], frames[2]], delay: 150 },
        walk_right: { frames: frames.slice(4, 8), delay: 120 },
        walk_down: { frames: frames.slice(8, 12), delay: 120 },
      },
    },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 120, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: { 'hero.hello': 'Look, I have legs!' },
  });
  await game.start();
}

function draw() {
  game.draw();
  const anim = game.hero.anim;
  fill(255);
  textSize(13);
  text('animation used: ' + anim.current.key + (anim.flip ? ' (mirrored)' : '') + '   frame ' + anim.state, 10, 22);
}

function keyPressed() {
  if (key === 't') game.say('hero.hello');
}
```
