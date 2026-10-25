---
title: Debugging
blurb: See the shapes, look inside the game's memory, and change it while you play.
---
<!-- page: Draw the outlines yourself -->
<!-- covers: drawDebugOverlay -->
Pressing **D** (or setting `game.debug = true`) draws the outlines of every hotspot and floor. That is `drawDebugOverlay`, and you can call it yourself, for example to draw them only while you hold a key. It draws in room space, applying the camera, and wants the p5 sketch (in a sketch with global functions that is `window`) and what to outline: the hotspots, the room, the camera and the hovered hotspot.

Turn the built-in key off with `debugKey: null`, then hold **O** to see the outlines.

```js
const { drawDebugOverlay } = p5.clickery;
let game;

async function setup() {
  game = createGame({
    debugKey: null,
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
      obstacles: [{ id: 'pond', points: [[260, 270], [380, 270], [380, 330], [260, 330]] }],
      hotspots: [{
        id: 'sign', name: 'obj.sign', provider: 'polygon',
        points: [[450, 170], [530, 170], [530, 250], [450, 250]], walkTo: { x: 490, y: 290, dir: 'up' },
      }],
    }],
    strings: { 'obj.sign': 'Sign' },
  });
  await game.start();
}

function draw() {
  game.draw();
  if (keyIsPressed && key === 'o') {
    drawDebugOverlay(window, {
      hotspots: game.hover.hotspots, room: game.room, camera: game.scene.camera, hovered: game.hover.hovered,
    });
  }
  fill(255);
  textSize(13);
  text('hold O to outline the shapes (click the picture first)', 10, 22);
}
```

<!-- page: The state inspector -->
<!-- covers: StateInspector, StateInspector#show, StateInspector#hide, StateInspector#toggle, StateInspector#visible, StateInspector#snapshot, StateInspector#refresh, Game#inspector -->
The **state inspector** is a panel that shows the game's memory while you play: the current room, the flags (click one to switch it), the inventory (tick an item to give or take it), the whole state as JSON you can edit and apply, and a log of the events as they happen. Use it to test the end of a puzzle without playing the start again: tick the key, press *apply + re-enter room*, and walk to the door. You can also jump to any room, and save and load.

It is off unless you ask: set `inspectorKey: 'i'` and press **I**. `game.inspector` is then the panel, with `show()`, `hide()`, `toggle()` and `visible`; `snapshot()` returns everything it shows as plain data, and `refresh()` redraws it (it does that by itself when the state changes). You can also make one yourself, as here with **O**.

Click the picture, press **I** (or **O**), then pull the lever and watch the flag change. Tick the key and see it appear in the bar.

```js
const { StateInspector } = p5.clickery;
let game;

async function setup() {
  game = createGame({
    inspectorKey: 'i',
    items: { key: 'brass key' },
    rooms: [
      {
        id: 'yard', width: 640, height: 360, color: '#2d3a55',
        starts: { default: { x: 80, y: 300 } },
        walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
        hotspots: [{
          id: 'lever', name: 'obj.lever', provider: 'polygon', color: '#c9a227',
          points: [[300, 200], [330, 200], [330, 250], [300, 250]], walkTo: { x: 315, y: 290, dir: 'up' },
        }],
      },
      {
        id: 'cellar', width: 640, height: 360, color: '#222a30',
        starts: { default: { x: 100, y: 300 } },
        walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#2f3a42' }],
      },
    ],
    strings: { 'obj.lever': 'Lever', 'lever.pulled': 'Clunk.' },
  });

  game.on('lever', {
    onInteract: async (ctx) => {
      game.flag('leverPulled', !game.flag('leverPulled'));
      await ctx.say('lever.pulled');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  const open = game.inspector && game.inspector.visible;
  text('I opens the state inspector; O opens it from code. open: ' + Boolean(open), 10, 22);
}

function keyPressed() {
  if (key === 'o') {
    game.inspector = game.inspector || new StateInspector(game);
    game.inspector.toggle();
  }
}
```
