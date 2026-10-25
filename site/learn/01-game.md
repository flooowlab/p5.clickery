---
title: Game
blurb: Everything a game is made of, one small step at a time.
---
<!-- page: A first game -->
<!-- covers: createGame, GameOptions, Game#start, Game#draw -->
A game is a room, a hero and a few lines of code. `createGame` takes a description of your game and returns the object you will use for everything else. Call `game.start()` once to enter the first room, and `game.draw()` on every frame.

A room is plain data: its size, where the hero appears, and the floor the hero may walk on. Click anywhere on the floor and the hero walks there.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 120, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
}
```

Try changing the room's `color`, or move the corners of the floor. Every other option is in {@link GameOptions}.

<!-- page: Click on things -->
<!-- covers: Game#on, Game#say -->
A **hotspot** is a clickable area of a room. Give it an `id`, a `name` (what shows when you hover it) and the corners of its shape. Then use `game.on` to say what happens: `onInteract` runs on a click, `onLook` on a right-click or a long press on a touch screen.

Everything the player reads is a **text key**, like `'sign.look'`. The texts live in `strings`. That makes translating a game easy later, and a typo shows up as `[sign.lok]` instead of as nothing.

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
      'sign.look': 'It says: "Welcome!"',
      'sign.use': 'I have read it twice already.',
    },
  });

  game.on('sign', {
    onLook: (ctx) => ctx.say('sign.look'),
    onInteract: (ctx) => ctx.say('sign.use'),
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

Click the sign, then right-click it. `walkTo` is where the hero stands before the handler runs. You can also say a line from anywhere with `game.say('sign.look')`.

<!-- page: Remember things -->
<!-- covers: Game#flag -->
A **flag** is a yes/no fact the game remembers: the lever is pulled, the door is open. `game.flag('open')` reads it, and `game.flag('open', true)` sets it. Flags are saved with the game, and a flag nobody set is `false`.

Pull the lever, then try the door.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
          points: [[200, 200], [230, 200], [230, 250], [200, 250]], walkTo: { x: 215, y: 290, dir: 'up' } },
        { id: 'door', name: 'obj.door', provider: 'polygon', color: '#6b4a2f',
          points: [[500, 120], [580, 120], [580, 250], [500, 250]], walkTo: { x: 540, y: 290, dir: 'up' } },
      ],
    }],
    strings: {
      'obj.lever': 'Lever', 'obj.door': 'Door',
      'lever.pulled': 'Clunk. Something unlocked.',
      'lever.back': 'Clunk. Back where it was.',
      'door.shut': 'It does not budge.',
      'door.open': 'It swings open.',
    },
  });

  game.on('lever', {
    onInteract: async (ctx) => {
      const unlocked = !game.flag('unlocked');
      game.flag('unlocked', unlocked);
      await ctx.say(unlocked ? 'lever.pulled' : 'lever.back');
    },
  });

  game.on('door', {
    onInteract: (ctx) => ctx.say(game.flag('unlocked') ? 'door.open' : 'door.shut'),
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: Pick things up -->
<!-- covers: Game#give, Game#has, Game#take -->
Items live in the **inventory bar** at the bottom of the screen. Declare them in `items` (an id and the name the player sees), then `game.give('key')` puts one in the bar. `game.has('key')` asks whether it is carried, and `game.take('key')` removes it.

To use an item, click it in the bar (it is now held), then click the thing to use it on. That runs the target's `onUse`, with the held item in `ctx.item`. Returning `false` means "that does not work", and the hero says the default "I can't use that".

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
          points: [[200, 275], [240, 275], [240, 295], [200, 295]], walkTo: { x: 220, y: 310 } },
        { id: 'door', name: 'obj.door', provider: 'polygon', color: '#6b4a2f',
          points: [[500, 120], [580, 120], [580, 250], [500, 250]], walkTo: { x: 540, y: 290, dir: 'up' } },
      ],
    }],
    strings: {
      'obj.key': 'Brass key', 'obj.door': 'Door',
      'key.got': 'A brass key. Might come in handy.',
      'door.locked': 'Locked.',
      'door.hint': 'I have a key. Maybe use it on the door?',
      'door.opens': 'The key turns. The door opens.',
    },
  });

  game.on('keyspot', {
    onInteract: async (ctx) => {
      game.give('key');
      ctx.setEnabled('keyspot', false); // it is in your pocket now
      await ctx.say('key.got');
    },
  });

  game.on('door', {
    onInteract: (ctx) => ctx.say(game.has('key') ? 'door.hint' : 'door.locked'),
    onUse: async (ctx) => {
      if (ctx.item !== 'key') return false;
      game.take('key');
      game.flag('doorOpen', true);
      await ctx.say('door.opens');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: Go to another room -->
<!-- covers: Game#goTo, Game#addRoom, Game#room -->
A game is usually several rooms. List them in `rooms`, or add one later with `game.addRoom`. `game.goTo('hall')` fades to another room, and a room can have several named `starts`, so the hero appears at the right door: `game.goTo('hall', 'fromYard')`.

Rooms remember how you left them. `game.room` is the room you are in right now.

```js
let game;

const yard = {
  id: 'yard', width: 640, height: 360, color: '#2d3a55',
  starts: { default: { x: 80, y: 300 }, fromHall: { x: 520, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
  hotspots: [{
    id: 'toHall', name: 'obj.toHall', provider: 'polygon', color: '#6b4a2f',
    points: [[540, 120], [610, 120], [610, 250], [540, 250]], walkTo: { x: 575, y: 285, dir: 'up' },
  }],
};

const hall = {
  id: 'hall', width: 640, height: 360, color: '#4a3550',
  starts: { default: { x: 80, y: 300 }, fromYard: { x: 100, y: 300 } },
  walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#5d4563' }],
  hotspots: [{
    id: 'toYard', name: 'obj.toYard', provider: 'polygon', color: '#6b4a2f',
    points: [[30, 120], [100, 120], [100, 250], [30, 250]], walkTo: { x: 65, y: 285, dir: 'up' },
  }],
};

async function setup() {
  game = createGame({
    rooms: [yard],
    strings: { 'obj.toHall': 'To the hall', 'obj.toYard': 'To the yard' },
  });
  game.addRoom(hall);

  game.on('toHall', { onInteract: () => game.goTo('hall', 'fromYard') });
  game.on('toYard', { onInteract: () => game.goTo('yard', 'fromHall') });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('You are in: ' + game.room.id, 10, 22);
}
```

<!-- page: Cutscenes -->
<!-- covers: Game#cutscene -->
A **cutscene** is a scripted moment: the player cannot click, and a Skip button appears. Inside it you write the story as ordinary code, and every step waits for the one before: `await game.hero.walkTo(...)`, `await game.say(...)`.

If the player skips, the hero jumps to where they would have ended up and the lines are not shown, but everything your script does to the game still happens. Press the Skip button (or Escape) to try it.

Notice that `setup()` does not `await` the cutscene. p5 starts calling `draw()` only when `setup()` has returned, so a long sequence is started and left to run. (Awaiting it would work too, because the game draws itself meanwhile, but your own `draw()` would show nothing until it ended.)

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 40, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: {
      'intro.one': 'What a strange place.',
      'intro.two': 'Let me look around.',
    },
  });

  await game.start();

  // no await: setup() has to return, so that p5 can start drawing
  game.cutscene(async () => {
    await game.say('intro.one');
    await game.hero.walkTo({ x: 420, y: 300 });
    await game.say('intro.two');
    game.flag('seenIntro', true);
  });
}

function draw() {
  game.draw();
}
```

<!-- page: Conversations -->
<!-- covers: Game#talk -->
`game.talk` plays a conversation. The easiest format is the library's own small Markdown: a `# section` is a place to jump to (the first one is where it starts), `Speaker: text` is a line, `* choice -> section` is a choice for the player, and `-> END` finishes. Click the guard.

The same call also plays Twine and Ink conversations; it detects the format.

```js
let game;

const talk = `
# start
Guard: Halt! Who goes there?
* Just a traveller. -> traveller
* None of your business. -> rude

# traveller
Guard: Then welcome, traveller.
-> END

# rude
Guard: Hmph. Mind your manners.
-> END
`;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'guard', name: 'obj.guard', provider: 'polygon', color: '#4f7cac',
        points: [[400, 150], [450, 150], [450, 250], [400, 250]], walkTo: { x: 360, y: 290, dir: 'right' },
      }],
    }],
    strings: { 'obj.guard': 'Guard' },
  });

  game.on('guard', { onInteract: () => game.talk(talk) });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: Save and load -->
<!-- covers: Game#save, Game#load -->
`game.save()` stores the game: the flags, the inventory, the room and where the hero stands. `game.load()` brings it back, and resolves to `false` if nothing was saved.

Pick up the key, walk somewhere, and press **S**. Then pick up nothing more, walk away and press **L**: the hero is back where you saved. (Click the picture once first, so it gets your key presses.)

```js
let game;

async function setup() {
  game = createGame({
    items: { key: 'brass key' },
    saveSlot: 'lesson',
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'keyspot', name: 'obj.key', provider: 'polygon', color: '#e0c050',
        points: [[300, 275], [340, 275], [340, 295], [300, 295]], walkTo: { x: 320, y: 310 },
      }],
    }],
    strings: { 'obj.key': 'Brass key', 'key.got': 'Got it.' },
  });

  game.on('keyspot', {
    onInteract: async (ctx) => {
      game.give('key');
      ctx.setEnabled('keyspot', false);
      await ctx.say('key.got');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('S saves, L loads', 10, 22);
}

function keyPressed() {
  if (key === 's') game.save();
  if (key === 'l') game.load();
}
```

<!-- page: Hide and show -->
<!-- covers: Game#hotspot -->
`game.hotspot('crate')` gives you the live hotspot of the current room. Set its `enabled` to `false` and it cannot be clicked any more, and the default drawing stops drawing it. Pull the lever and the crate vanishes.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
          points: [[200, 200], [230, 200], [230, 250], [200, 250]], walkTo: { x: 215, y: 290, dir: 'up' } },
        { id: 'crate', name: 'obj.crate', provider: 'polygon', color: '#96643c',
          points: [[400, 200], [470, 200], [470, 260], [400, 260]], walkTo: { x: 435, y: 300, dir: 'up' } },
      ],
    }],
    strings: { 'obj.lever': 'Lever', 'obj.crate': 'Crate', 'lever.pulled': 'The crate is gone.' },
  });

  game.on('lever', {
    onInteract: async (ctx) => {
      game.hotspot('crate').enabled = false;
      await ctx.say('lever.pulled');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: See the shapes -->
<!-- covers: Game#debug -->
When a click does not do what you expect, look at the shapes. Set `game.debug` to `true` (or press **D** while playing) and the game outlines every hotspot and every walkable area, and marks the one under the pointer.

Press **D** in the picture to switch it off again. The key can be changed or turned off with the `debugKey` option.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
      obstacles: [{ id: 'pond', points: [[250, 280], [380, 280], [380, 325], [250, 325]] }],
      hotspots: [{
        id: 'sign', name: 'obj.sign', provider: 'polygon',
        points: [[500, 170], [580, 170], [580, 250], [500, 250]],
      }],
    }],
    strings: { 'obj.sign': 'Sign' },
  });

  game.debug = true;

  await game.start();
}

function draw() {
  game.draw();
}
```

<!-- page: Draw it yourself -->
<!-- covers: Game#drawRoom, Game#drawHero, Game#drawSpeech, Game#actors -->
Until you have art, the game draws coloured shapes. When you do, replace the parts you want. `game.drawRoom`, `game.drawHero` and `game.drawSpeech` each get the p5 sketch `p` and draw in room coordinates, with the hero's feet at `(hero.x, hero.y)`.

To add a thing that must pass in front of or behind the hero, push `{ baseline, draw }` to `game.actors`. The `baseline` is the y of its feet: the larger it is, the closer it is, and the later it is drawn. Walk behind the tree, then in front of it.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
    strings: { 'hero.hello': 'Nice tree.' },
  });

  // the hero: a blue ball with feet on the ground
  game.drawHero = (p, hero) => {
    p.noStroke();
    p.fill('#5b9bd5');
    p.circle(hero.x, hero.y - 24 * hero.scale, 48 * hero.scale);
  };

  // the words above the hero's head
  game.drawSpeech = (p, hero) => {
    p.fill(255, 240, 160);
    p.textSize(18);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(hero.speech.text, hero.x, hero.y - 70);
  };

  // a tree the hero can walk in front of and behind
  game.actors.push({
    baseline: 290,
    draw: (p) => {
      p.noStroke();
      p.fill('#5a3d28');
      p.rect(300, 200, 20, 90);
      p.fill('#3f8f4f');
      p.circle(310, 180, 110);
    },
  });

  await game.start();
  game.say('hero.hello');
}

function draw() {
  game.draw();
}
```

<!-- page: The parts inside -->
<!-- covers: Game#hero, Game#events, Game#state, Game#scheduler, Game#preload -->
`createGame` builds many parts and lets you reach each one: `game.hero` walks and talks, `game.events` tells you when things happen, `game.state` is the saved memory, and `game.scheduler` runs timers. Here the hero walks off by itself after two seconds, an event reports every item picked up, and the game's memory is shown on screen.

`game.start()` loads everything for you. Call `game.preload()` yourself first when you want to load while something else is on screen.

```js
let game;
let log = 'nothing yet';

async function setup() {
  game = createGame({
    items: { coin: 'gold coin' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'coin', name: 'obj.coin', provider: 'polygon', color: '#e0c050',
        points: [[300, 275], [330, 275], [330, 295], [300, 295]], walkTo: { x: 315, y: 310 },
      }],
    }],
    strings: { 'obj.coin': 'Gold coin' },
  });

  await game.preload();

  game.on('coin', { onInteract: (ctx) => { game.give('coin'); ctx.setEnabled('coin', false); } });
  game.events.on('inventory:add', ({ id }) => { log = 'picked up: ' + id; });

  await game.start();

  game.scheduler.after(2000, () => game.hero.walkTo({ x: 520, y: 300 }));
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text(log + '  |  inventory: ' + JSON.stringify(game.state.get('inventory')), 10, 22);
}
```

<!-- page: Instance mode and modules -->
<!-- headless: skip -->
<!-- covers: attachP5, createGameCanvas, registerClickery, clickeryAddon -->
So far the sketches used p5's **global mode**: `setup()` and `draw()` are plain functions and `createGame` is simply there. If you use p5's **instance mode**, where the whole sketch lives in a function that receives the p5 object (usually called `p`), the same things are on `p`: `p.createGame(options)`.

Underneath, `createGame` is two steps: `new Game(options)` makes the game itself, which knows nothing of p5 (handy for tests, or a game's logic in its own file), and `attachP5(game, p)` connects it to a sketch: the canvas, which it makes with `p.createGameCanvas(width, height)` (a normal p5 canvas that also remembers the game's logical size), fitting it to the page, the mouse, touch and keys, loading pictures, and `game.draw()`. Do the two steps yourself when you need something in between.

The script tag registers p5.clickery with p5 for you (that is `clickeryAddon`). With ES modules you do it yourself, once, before the first sketch: `import { registerClickery } from './p5.clickery.esm.js'; registerClickery(p5);`.

```js
const { Game, attachP5 } = p5.clickery;

new p5((p) => {
  let game;

  p.setup = async () => {
    game = new Game({
      rooms: [{
        id: 'yard', width: 640, height: 360, color: '#2d3a55',
        starts: { default: { x: 120, y: 300 } },
        walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      }],
    });
    attachP5(game, p);   // the canvas, the input and the drawing (createGame does both steps)
    await game.start();
  };

  p.draw = () => {
    game.draw();
    p.fill(255);
    p.textSize(13);
    p.text('instance mode: the hero is at ' + Math.round(game.hero.x) + ', ' + Math.round(game.hero.y), 10, 22);
  };
});
```

<!-- page: Reuse the default drawing -->
<!-- covers: drawRoomShapes, drawHeroDefault, drawSpeechDefault, drawSkipButton, skipButtonRect, hitSkipButton -->
When you replace `game.drawRoom`, `game.drawHero` or `game.drawSpeech` you rarely want to throw the default away: you want to add to it. The defaults are functions on `p5.clickery`, so a replacement can call them first and then draw more: `drawRoomShapes(p, room, game)` fills the floors, obstacles and hotspots that have a colour, `drawHeroDefault(p, hero)` draws the hero's animation or a simple figure, and `drawSpeechDefault(p, hero, game)` writes the line above its head.

The other pieces of the screen can be used by hand too. The Skip button is `drawSkipButton(p, width)`, `skipButtonRect(width)` says where it is and `hitSkipButton(x, y, width)` whether a point is on it. Here the hero gets a shadow under the default figure, and a Skip button is drawn all the time, which you can click.

```js
const { drawHeroDefault, drawSpeechDefault, drawRoomShapes, drawSkipButton, skipButtonRect, hitSkipButton } = p5.clickery;
let game;
let message = 'click the Skip button';

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 120, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });

  game.drawRoom = (p, room, g) => {
    drawRoomShapes(p, room, g);                  // the default floor...
    p.noStroke();
    p.fill(255, 255, 255, 25);
    p.rect(0, 250, 640, 6);                      // ...and a highlight along its far edge
  };
  game.drawHero = (p, hero) => {
    p.noStroke();
    p.fill(0, 0, 0, 80);
    p.ellipse(hero.x, hero.y, 44 * hero.scale, 10 * hero.scale); // a shadow under the feet
    drawHeroDefault(p, hero);
  };
  game.drawSpeech = (p, hero, g) => drawSpeechDefault(p, hero, g);

  await game.start();
}

function draw() {
  game.draw();
  drawSkipButton(window, 640);
  const r = skipButtonRect(640);
  fill(255);
  textSize(13);
  text('the Skip button is at x ' + r.x + ', y ' + r.y + ', ' + r.w + ' x ' + r.h + '   ' + message, 10, 22);
}

function mousePressed() {
  if (hitSkipButton(mouseX, mouseY, 640)) message = 'you pressed Skip';
}
```
