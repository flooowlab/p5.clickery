---
title: Navigation
blurb: Paths around obstacles, depth and drawing order, and animation states.
---
<!-- page: Finding a path -->
<!-- covers: Navigator, Navigator.fromRoom, Navigator#isWalkable, Navigator#canSee, Navigator#nearestWalkable, Navigator#findPath -->
The hero walks by asking a **Navigator**, built from a room's `walkable` areas minus its `obstacles` (`Navigator.fromRoom(room)`). `isWalkable(x, y)` says whether a point is on the floor, `canSee(a, b)` whether the straight line between two points stays on it, `nearestWalkable(p)` finds the closest floor to a point (where the hero goes when you click off the floor), and `findPath(from, to)` returns the waypoints of the shortest walk, or `null` when there is no route.

Click anywhere: the line is the path the hero would take. The dot is green on the floor and red off it.

```js
const { Navigator } = p5.clickery;
let game;
let nav;
let target = { x: 560, y: 300 };

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 60, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      obstacles: [{ id: 'pond', points: [[260, 250], [380, 250], [380, 330], [260, 330]], color: '#2f5d8a' }],
    }],
  });
  await game.start();
  nav = Navigator.fromRoom(game.room);
}

function draw() {
  game.draw();
  const from = { x: game.hero.x, y: game.hero.y };
  const path = nav.findPath(from, target);
  stroke('#ffd678');
  strokeWeight(2);
  let last = from;
  for (const p of path || []) { line(last.x, last.y, p.x, p.y); last = p; }
  noStroke();
  fill(nav.isWalkable(target.x, target.y) ? '#7fd6a8' : '#ff6b6b');
  circle(target.x, target.y, 12);
  fill(255);
  textSize(13);
  const snap = nav.nearestWalkable(target);
  text(`path of ${path ? path.length : 0} waypoints; straight line possible: ${nav.canSee(from, target)}`, 10, 22);
  text(`nearest walkable point to the click: ${snap ? snap.x.toFixed(0) + ', ' + snap.y.toFixed(0) : 'none'}`, 10, 40);
}

function mousePressed() {
  target = { x: mouseX, y: mouseY };
  game.hero.walkTo(target);
}
```

<!-- page: Size and drawing order -->
<!-- covers: scaleFromStops, sortByBaseline, Navigator#scaleAt -->
Walkable areas make things smaller further away: their `scale` stops are `[y, size]` pairs, and `scaleFromStops(stops, y)` is the plain calculation (linear between stops, held outside them). `navigator.scaleAt(x, y)` gives the size at a point of a room.

Who stands in front is decided by their feet: `sortByBaseline(things)` puts a list in drawing order, back to front, by each thing's `baseline` (or `y`). Here three crates are drawn in the wrong order on purpose, then sorted: walk the hero behind and in front of them (`game.actors` does this sorting for you).

```js
const { scaleFromStops, sortByBaseline } = p5.clickery;
let game;
const stops = [[250, 0.5], [340, 1]];

const crates = [
  { baseline: 300, x: 300, color: '#c9a227' },
  { baseline: 270, x: 340, color: '#3f8f4f' },
  { baseline: 320, x: 380, color: '#c25b5b' },
];

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 320 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659', scale: stops }],
    }],
  });

  // the game draws these in depth order with the hero
  for (const crate of crates) {
    game.actors.push({
      baseline: crate.baseline,
      draw: (p) => {
        const s = scaleFromStops(stops, crate.baseline);
        p.noStroke();
        p.fill(crate.color);
        p.rect(crate.x - 20 * s, crate.baseline - 40 * s, 40 * s, 40 * s);
      },
    });
  }
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('size at y 250: ' + scaleFromStops(stops, 250) + ', at y 295: ' + scaleFromStops(stops, 295).toFixed(2) + ', at y 340: ' + scaleFromStops(stops, 340), 10, 22);
  text('sorted baselines: ' + sortByBaseline(crates).map((c) => c.baseline).join(', ') + '   hero scale here: ' + game.hero.scale.toFixed(2), 10, 40);
}
```

<!-- page: Directions and animations -->
<!-- covers: AnimationState, AnimationState#state, AnimationState#dir, AnimationState#set, AnimationState#face, AnimationState#update, AnimationState#current, AnimationState#flip, AnimationState#frame, AnimationState#finished, AnimationState#animations, DIRS4, DIRS8, directionFromVector, mirrorDirection -->
An actor's **animation state** picks one animation from its state (`idle`, `walk` or `talk`) and the direction it faces. Animations are named `<state>_<direction>` (`walk_right`) or just `<state>`, and each is `{ frames, delay, loop }`. If a direction is missing, the mirror image is used flipped (`walk_left` uses `walk_right`), then the sides of a diagonal, then the plain state, so a hero can start with just `walk_right` and `walk_down`.

`directionFromVector(dx, dy)` turns a movement into a direction name, `mirrorDirection(dir)` flips left and right, and `DIRS4` and `DIRS8` list the names. A frame can be any value: pictures in a real game, plain words here so you can read them. Press the **arrow keys** to face and **W** to switch between walking and standing still.

```js
const { AnimationState, directionFromVector, mirrorDirection, DIRS8 } = p5.clickery;

const anim = new AnimationState({
  idle: { frames: ['stand'], delay: 200 },
  walk_right: { frames: ['r1', 'r2', 'r3', 'r4'], delay: 150 },
  walk_down: { frames: ['d1', 'd2'], delay: 150 },
  talk: { frames: ['mouth open', 'mouth closed'], delay: 120 },
});

function setup() {
  createCanvas(640, 360);
  anim.face('right');
}

function draw() {
  background(40, 50, 75);
  anim.update(deltaTime);
  const now = anim.current;
  fill(255);
  textSize(15);
  text('state: ' + anim.state + '    facing: ' + anim.dir, 20, 40);
  text('animation used: ' + now.key + '    drawn flipped: ' + anim.flip, 20, 70);
  text('frame now: ' + anim.frame, 20, 100);
  text('animations defined: ' + Object.keys(anim.animations).join(', '), 20, 130);
  text('a movement of (-10, -10) faces ' + directionFromVector(-10, -10) + '; mirrored: ' + mirrorDirection('up_left'), 20, 170);
  text('the eight directions: ' + DIRS8.join(', '), 20, 200);
  text('arrow keys face, W walks or stands, T talks     finished (loops never finish): ' + anim.finished, 20, 240);
}

function keyPressed() {
  if (keyCode === UP_ARROW) anim.face('up');
  if (keyCode === DOWN_ARROW) anim.face('down');
  if (keyCode === LEFT_ARROW) anim.face('left');
  if (keyCode === RIGHT_ARROW) anim.face('right');
  if (key === 'w') anim.set(anim.state === 'walk' ? 'idle' : 'walk');
  if (key === 't') anim.set('talk');
}
```
