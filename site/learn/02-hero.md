---
title: Hero
blurb: Walking, talking and facing: the player's character, which is an Actor.
---
<!-- page: Walk -->
<!-- covers: Actor#walkTo, Actor#walking -->
The hero is `game.hero`, an **Actor**. `hero.walkTo({ x, y })` walks to a point, around any obstacles, and returns a promise, so you can `await` it and continue when the hero has arrived. Add `dir` to make the hero turn that way on arrival.

If something else sends the hero somewhere first (a click on the floor, another `walkTo`), the first walk is interrupted and its promise resolves to `false`. While a walk is under way, `hero.walking` is `true`.

A sequence like this lives in its own `async` function, which `setup()` calls without `await`: p5 starts drawing only when `setup()` has returned.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 100, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      obstacles: [{ id: 'pond', points: [[250, 270], [390, 270], [390, 330], [250, 330]], color: '#2f5d8a' }],
    }],
  });
  await game.start();
  patrol();
}

async function patrol() {
  const hero = game.hero;
  for (let lap = 0; lap < 2; lap++) {
    await hero.walkTo({ x: 520, y: 300, dir: 'left' });
    await hero.walkTo({ x: 100, y: 300, dir: 'right' });
  }
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('walking: ' + game.hero.walking, 10, 22);
}
```

Watch the hero go round the pond. Click the floor while it walks: the new click wins.

<!-- page: Say -->
<!-- covers: Actor#say, Actor#speech, Actor#textSpeed -->
`hero.say(key)` shows a line above the hero and resolves when it is over. A line stays about 60 milliseconds per character; pass `ms` to choose. Pass `literal: true` to show text as it is, with no text key, which is what you want for words that come from a file.

`hero.speech` is the line on screen right now (`{ key, text, remaining }`) or `null`. `hero.textSpeed` makes lines pass faster when above 1; the player's text speed setting changes it too.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 320, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: { 'hero.one': 'A line from a text key.' },
  });
  await game.start();
  talk();
}

async function talk() {
  const hero = game.hero;
  await hero.say('hero.one');
  await hero.say('Text that is shown as it is.', { literal: true });
  await hero.say('This one stays for four seconds.', { literal: true, ms: 4000 });
  hero.textSpeed = 3;
  await hero.say('Now I read three times faster.', { literal: true });
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('speech: ' + (game.hero.speech ? game.hero.speech.text : 'none'), 10, 22);
}
```

<!-- page: Face a direction -->
<!-- covers: Actor#face, Actor#faceTowards, Actor#dir, Actor#teleport -->
`hero.face('left')` turns the hero without moving it; the directions are `'up'`, `'right'`, `'down'` and `'left'` (add `'up_right'` and so on by setting `hero: { directions: 8 }` in the game options). `hero.faceTowards(x, y)` turns toward a point instead, and `hero.dir` tells you where the hero looks now.

`hero.teleport(x, y)` moves the hero at once, with no walk. The default hero draws a small eye so you can see which way it faces.

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
  look();
}

async function look() {
  const hero = game.hero;
  await game.scheduler.wait(800);
  hero.face('left');
  await game.scheduler.wait(800);
  hero.face('right');
  await game.scheduler.wait(800);
  hero.teleport(100, 290);
  hero.faceTowards(520, 290);
  await game.scheduler.wait(800);
  hero.teleport(540, 310);
  hero.faceTowards(100, 310);
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('dir: ' + game.hero.dir, 10, 22);
}
```

<!-- page: Stop -->
<!-- covers: Actor#stop, Actor#skipSpeech -->
`hero.stop()` stops the hero walking and talking; a `walkTo` that was under way resolves to `false`. `hero.skipSpeech()` ends only the line being said, as if its time had run out, which is what a click on the subtitle does for the player.

Click the picture once, then press **S** to stop the hero or **K** to skip the line.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 60, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();

  game.hero.walkTo({ x: 600, y: 300 }).then((arrived) => {
    console.log(arrived ? 'arrived' : 'interrupted');
  });
  game.hero.say('I will talk for a very long time, unless somebody skips this line.', { literal: true, ms: 20000 });
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('S stops, K skips the line', 10, 22);
}

function keyPressed() {
  if (key === 's') game.hero.stop();
  if (key === 'k') game.hero.skipSpeech();
}
```

<!-- page: Where is the hero -->
<!-- covers: Actor#x, Actor#y, Actor#scale, Actor#baseline, Actor#mode -->
`hero.x` and `hero.y` are where its **feet** are. `hero.scale` is how big it is there: a walkable area can have `scale` stops, pairs of `[y, size]`, so characters are smaller further away. Here `[[250, 0.5], [340, 1]]` means half size at y 250, full size at y 340, smoothly in between. The hero also walks slower when smaller.

`hero.baseline` (the same as `y`) decides who is drawn in front, and `hero.mode` is `'idle'`, `'walk'` or `'talk'`. Walk up and down the floor and watch the numbers.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 320, y: 320 } },
      walkable: [{
        id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659',
        scale: [[250, 0.5], [340, 1]],
      }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
  const h = game.hero;
  fill(255);
  textSize(14);
  text(`x ${h.x.toFixed(0)}  y ${h.y.toFixed(0)}  scale ${h.scale.toFixed(2)}  baseline ${h.baseline.toFixed(0)}  mode ${h.mode}`, 10, 22);
}
```

<!-- page: Set up the hero -->
<!-- covers: Actor#speed, Actor#directions, Actor#id, Actor#navigator, Actor#anim, Actor#toJSON, Actor#fromJSON, Actor#update, Actor#setSkipping, Actor#skipping, WalkTarget -->
The `hero` option of `createGame` is the options of an Actor: `speed` (pixels per second at full size, 150 by default) and `directions` (4 or 8 facing directions) are the ones you reach for most, and `animations` gives it real pictures. Afterwards `hero.speed`, `hero.directions`, `hero.id` (the name `'hero'`), `hero.navigator` (the floor of the current room, set on every room change) and `hero.anim` (its animation state) tell you how it is set up. A place to walk to is a {@link WalkTarget}: `{ x, y, dir }`.

`hero.toJSON()` is what a save keeps (where the hero stands and which way it faces) and `fromJSON` puts it back. `update(dt)` moves it along its path (the game calls it every frame), and `setSkipping(true)` makes walks jump to their end, which a cutscene does when skipped; `hero.skipping` tells you whether that is on. Press **S** to save the hero's place and **L** to bring it back.

```js
let game;
let saved = null;

async function setup() {
  game = createGame({
    hero: { speed: 300, directions: 8 },
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
  const h = game.hero;
  fill(255);
  textSize(13);
  text(`id "${h.id}", speed ${h.speed}, ${h.directions} directions, on a floor: ${h.navigator !== null}, animation state: ${h.anim.state}`, 10, 22);
  text(`skipping: ${h.skipping}   saved place: ${saved ? JSON.stringify(saved) : 'none (press S)'}`, 10, 40);
}

function keyPressed() {
  if (key === 's') saved = game.hero.toJSON();
  if (key === 'l' && saved) game.hero.fromJSON(saved);
}
```
