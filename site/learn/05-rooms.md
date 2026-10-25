---
title: Rooms
blurb: Wide rooms and the camera, room scripts, fades, and the room format.
---
<!-- page: A wide room -->
<!-- covers: Camera#x, Camera#y, Camera#maxX, Camera#maxY, Camera#centerOn, Camera#moveTo -->
A room can be wider (or taller) than the screen. Then the **camera** decides which part you see, and it follows the hero by itself (turn that off with `followHero: false`). The camera is `game.scene.camera`: `x` and `y` are the room position at the top-left of the screen, `maxX` and `maxY` are as far as it can go, and `moveTo(x, y)` and `centerOn(x, y)` put it somewhere (it never leaves the room).

Walk to the right and watch `camera.x` grow, until it reaches `maxX`. The two coloured posts are in the room, not on the screen.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'long', width: 1280, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [1280, 250], [1280, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'post1', name: 'obj.post', provider: 'polygon', color: '#c9a227',
          points: [[300, 150], [330, 150], [330, 250], [300, 250]] },
        { id: 'post2', name: 'obj.post', provider: 'polygon', color: '#3f8f4f',
          points: [[1000, 150], [1030, 150], [1030, 250], [1000, 250]] },
      ],
    }],
    strings: { 'obj.post': 'Post' },
  });
  await game.start();
  game.scene.camera.moveTo(0, 0);
}

function draw() {
  game.draw();
  const cam = game.scene.camera;
  fill(255);
  textSize(14);
  text(`camera x ${cam.x.toFixed(0)} of ${cam.maxX}   y ${cam.y.toFixed(0)} of ${cam.maxY}`, 10, 22);
}
```

<!-- page: Follow, or look around -->
<!-- covers: Camera#follow, Camera#setRoom, Camera#worldToScreen, Camera#screenToWorld, Camera#layerOffset -->
`camera.follow(x, y, dt)` eases towards a point, which is what `followHero` does every frame. Set `followHero: false` and move the camera yourself, for example to pan across the room while the hero stays put. `worldToScreen` and `screenToWorld` convert between room positions and screen positions, and `layerOffset(parallax)` is where a picture layer with that parallax factor sits (`1` moves with the room, `0` stays on the screen).

Press **A** and **D** to look left and right, and **F** to follow the hero again.

```js
let game;
let following = false;

async function setup() {
  game = createGame({
    followHero: false,
    rooms: [{
      id: 'long', width: 1280, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [1280, 250], [1280, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();
}

function draw() {
  const cam = game.scene.camera;
  if (following) cam.follow(game.hero.x, game.hero.y, deltaTime);
  game.draw();
  const onScreen = cam.worldToScreen(game.hero.x, game.hero.y);
  const far = cam.layerOffset(0.5);
  fill(255);
  textSize(14);
  text(`hero on screen at x ${onScreen.x.toFixed(0)}   a half-speed layer is at x ${far.x.toFixed(0)}`, 10, 22);
}

function keyPressed() {
  const cam = game.scene.camera;
  following = key === 'f';
  if (key === 'a') cam.moveTo(cam.x - 80, cam.y);
  if (key === 'd') cam.moveTo(cam.x + 80, cam.y);
}
```

<!-- page: Room scripts -->
<!-- covers: Scripts#add, Scripts#addAll, Scripts#get, SceneManager#goTo, SceneManager#room, SceneManager#busy -->
A room has a script too, registered under the **room's id**: `onEnter` runs while the screen is black, `onEntered` after the fade-in (the place for an opening cutscene), and `onExit` as you leave. The context has `firstVisit`, `true` only the first time you come in, so a room can greet you once and then stay quiet.

`game.scene.goTo(id)` is what `game.goTo` calls, `scene.room` is the room you are in and `scene.busy` is `true` while a change is under way. `game.scripts` holds all the scripts: `add` sets one, `addAll` sets many (from modules, one file per object) and `get` reads one back.

```js
let game;
let log = [];

const room = (id, color, to) => ({
  id, width: 640, height: 360, color,
  starts: { default: { x: 80, y: 300 }, back: { x: 520, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
  hotspots: [{
    id: 'to-' + to, name: 'obj.door', provider: 'polygon', color: '#6b4a2f',
    points: [[540, 120], [610, 120], [610, 250], [540, 250]], walkTo: { x: 575, y: 285, dir: 'up' },
  }],
});

async function setup() {
  game = createGame({
    rooms: [room('red', '#5a2d3a', 'blue'), room('blue', '#2d3a5a', 'red')],
    strings: { 'obj.door': 'Door', 'red.hello': 'My first time in the red room.' },
  });

  game.scripts.addAll({
    'to-blue': { onInteract: () => game.goTo('blue', 'back') },
    'to-red': { onInteract: () => game.goTo('red', 'back') },
  });

  game.on('red', {
    onEnter: (ctx) => log.push('red: onEnter' + (ctx.firstVisit ? ' (first visit)' : '')),
    onEntered: (ctx) => {
      log.push('red: onEntered');
      if (ctx.firstVisit) game.say('red.hello'); // not awaited, so the hook ends and the room change is over
    },
    onExit: () => log.push('red: onExit'),
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text(`in ${game.scene.room.id}   busy ${game.scene.busy}   scripts for red: ${Object.keys(game.scripts.get('red')).join(', ')}`, 10, 22);
  log.slice(-4).forEach((line, i) => text(line, 10, 42 + i * 16));
}
```

<!-- page: Fades -->
<!-- covers: Fade#to, Fade#out, Fade#in, Fade#alpha, Fade#active, SceneManager#fade -->
Changing rooms fades through black, using `game.scene.fade`; its length is the `fadeMs` option. You can use the same fade yourself: `fade.out(ms)` darkens, `fade.in(ms)` clears, `fade.to(alpha, ms)` goes to any darkness between 0 and 1, and each returns a promise you can `await`. `fade.alpha` is how dark it is now, and `fade.active` is `true` while a fade runs.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 320, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();
  blink();
}

async function blink() {
  const fade = game.scene.fade;
  await game.scheduler.wait(500);
  await fade.out(800);
  await fade.to(0.6, 600);
  await fade.in(800);
}

function draw() {
  game.draw();
  const fade = game.scene.fade;
  fill(255);
  textSize(14);
  text(`alpha ${fade.alpha.toFixed(2)}   active ${fade.active}`, 10, 22);
}
```

<!-- page: The room format -->
<!-- covers: Room, RoomStart, WalkableArea, parseRoom, startPosition -->
A room is plain data (see {@link Room}). `parseRoom` checks one and fills in the defaults, with an error that names the room and what is wrong when something is missing: a duplicate id, a floor with fewer than three corners, no start. The game does it for every room you give it, but you can call it yourself to check a room before it goes in the game. `startPosition(room, name)` finds one of its named `starts`.

The helpers are on `p5.clickery`.

```js
const { parseRoom, startPosition } = p5.clickery;
let game;
let report = [];

async function setup() {
  const good = parseRoom({
    id: 'yard', width: 640, height: 360,
    starts: { default: { x: 80, y: 300 }, left: { x: 20, y: 300, dir: 'right' } },
    walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
  });
  report.push('color is ' + good.color + ', background is ' + good.background);
  report.push('start "left" is at x ' + startPosition(good, 'left').x);

  try {
    parseRoom({ id: 'broken', width: 640, height: 360, starts: {} });
  } catch (err) {
    report.push(err.message);
  }

  game = createGame({ rooms: [good] });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  report.forEach((line, i) => text(line, 10, 22 + i * 18));
}
```
