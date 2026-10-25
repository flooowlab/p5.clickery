---
title: Cutscenes
blurb: Scripted moments the player can skip.
---
<!-- page: Skip to a label -->
<!-- covers: Cutscenes#label, Cutscenes#skip, Cutscenes#run, Cutscenes#active, Cutscenes#skipped -->
Inside a cutscene you can mark places with `cs.label('name')`. A skip then has a choice: the Skip button (or Escape) skips everything, but `game.cutscenes.skip('name')` fast-forwards only as far as that label and plays normally from there. That is how you let the player skip the boring part but still watch the ending.

`cutscenes.active` is `true` while one runs, and `cutscenes.skipped` tells you afterwards whether it was skipped. Press **L** to skip to the label, and **S** to skip it all.

```js
let game;
let message = '';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 40, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: {
      'cs.long': 'A long and rather boring speech about the weather.',
      'cs.end': 'And now, the part worth watching.',
    },
  });
  await game.start();
  play();
}

async function play() {
  await game.cutscenes.run(async (cs) => {
    await game.say('cs.long');
    await game.hero.walkTo({ x: 560, y: 300 });
    cs.label('ending');
    await game.say('cs.end');
    game.flag('watched', true);
  });
  message = 'skipped: ' + game.cutscenes.skipped + '   flag still set: ' + game.flag('watched');
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('active: ' + game.cutscenes.active + '   (L skips to the label, S skips all)', 10, 22);
  text(message, 10, 42);
}

function keyPressed() {
  if (key === 'l') game.cutscenes.skip('ending');
  if (key === 's') game.cutscenes.skip();
}
```

<!-- page: Cannot be skipped -->
<!-- covers: Cutscenes#skippable, Cutscenes#skipping, Cutscenes#add -->
Some moments must be seen: pass `{ skippable: false }` and the Skip button does not appear (and `skip()` does nothing). While a skip is fast-forwarding, `cutscenes.skipping` is `true`, which a script can check to leave out something slow.

Anything with a `setSkipping(on)` method can fast-forward too: `cutscenes.add(thing)` joins it. Here a second actor, the guard, is added, so a skip makes it jump too. Try pressing **S** (nothing happens) while the unskippable part runs.

```js
let game;
const { Actor } = p5.clickery;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 40, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: { 'cs.must': 'This part cannot be skipped.', 'cs.free': 'This part can.' },
  });
  await game.start();

  const guard = new Actor({ id: 'guard', x: 600, y: 300, speed: 80, directions: 4 });
  game.cutscenes.add(guard);                                 // a skip fast-forwards the guard too
  game.events.on('update', (dt) => guard.update(dt));
  game.actors.push({                                          // draw it in depth order with the hero
    get baseline() { return guard.y; },
    draw: (p) => { p.noStroke(); p.fill('#4f7cac'); p.rect(guard.x - 14, guard.y - 70, 28, 70, 6); },
  });

  play(guard);
}

async function play(guard) {
  await game.cutscenes.run(async () => {
    await game.say('cs.must');
  }, { skippable: false });

  await game.cutscenes.run(async () => {
    await guard.walkTo({ x: 400, y: 300 });
    await game.say('cs.free');
  });
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text(`skippable ${game.cutscenes.skippable}   skipping ${game.cutscenes.skipping}`, 10, 22);
}

function keyPressed() {
  if (key === 's') game.cutscenes.skip();
}
```
