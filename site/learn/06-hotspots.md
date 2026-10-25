---
title: Hotspots
blurb: Clickable areas: overlapping shapes, hovering and hit tests.
---
<!-- page: Overlapping shapes -->
<!-- covers: HotspotDefinition, Hotspot#z, Hotspot#name, Hotspot#walkTo -->
Every hotspot is described by a {@link HotspotDefinition}: an `id` (what you give to `game.on`), a `name` (a text key shown on hover), a `provider` (the shape; `'polygon'` takes the `points` of the corners), an optional `walkTo` (where the hero stands first) and an optional `z`. When two hotspots overlap, the one with the **higher `z`** is clicked.

Hover the place where the coin overlaps the table: the coin wins, because it has the higher `z`. Remove its `z` and the later one in the list wins instead.

```js
let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'coin', name: 'obj.coin', provider: 'polygon', z: 1, color: '#e0c050',
          points: [[300, 200], [340, 200], [340, 230], [300, 230]], walkTo: { x: 320, y: 290, dir: 'up' } },
        { id: 'table', name: 'obj.table', provider: 'polygon', color: '#96643c',
          points: [[240, 190], [400, 190], [400, 260], [240, 260]], walkTo: { x: 320, y: 300, dir: 'up' } },
      ],
    }],
    strings: { 'obj.coin': 'Coin', 'obj.table': 'Table', 'coin.look': 'A coin on a table.', 'table.look': 'A plain table.' },
  });

  game.on('coin', { onLook: (ctx) => ctx.say('coin.look') });
  game.on('table', { onLook: (ctx) => ctx.say('table.look') });

  await game.start();
}

function draw() {
  game.draw();
  const h = game.hotspot('coin');
  fill(255);
  textSize(14);
  text(`coin: z ${h.z}, name key "${h.name}", walkTo ${JSON.stringify(h.walkTo)}`, 10, 22);
}
```

<!-- page: What is under the pointer -->
<!-- covers: HoverTracker#hovered, HoverTracker#at, HoverTracker#hotspots, Game#hover -->
`game.hover` finds the hotspot under the pointer. `hover.hovered` is the one there now (or `null`), `hover.at(x, y)` looks at a room position without changing the hover, and `hover.hotspots` lists the hotspots of the current room. Whenever the hovered hotspot changes, a `hover` event is sent with `{ id, hotspot }`, which is how a game could show a custom cursor or sound.

```js
let game;
let events = [];

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'sign', name: 'obj.sign', provider: 'polygon', color: '#96643c',
          points: [[200, 170], [280, 170], [280, 250], [200, 250]] },
        { id: 'crate', name: 'obj.crate', provider: 'polygon', color: '#8a6a3a',
          points: [[400, 200], [470, 200], [470, 260], [400, 260]] },
      ],
    }],
    strings: { 'obj.sign': 'Sign', 'obj.crate': 'Crate' },
  });

  game.events.on('hover', ({ id }) => events.push(id ?? 'nothing'));

  await game.start();
}

function draw() {
  game.draw();
  const h = game.hover;
  fill(255);
  textSize(14);
  text(`hovered: ${h.hovered ? h.hovered.id : 'nothing'}   hotspots in this room: ${h.hotspots.length}`, 10, 22);
  text(`at the crate's corner (410, 210): ${h.at(410, 210)?.id}`, 10, 42);
  text('hover events: ' + events.slice(-5).join(', '), 10, 62);
}
```

<!-- page: Test a point yourself -->
<!-- covers: Hotspot#hit, Hotspot#enabled, Hotspot#id, pointInPolygon, createHotspot, createHotspots -->
Game code never asks a provider anything; it calls `hotspot.hit(x, y)`, which is `false` for a hotspot that is switched off (`enabled` is `false`). The same call works for polygon, SVG and colour-mask hotspots, so you can change how a shape is made without touching your scripts. `createHotspot(definition)` builds one from its description, `createHotspots(room)` builds all of a room's, and `pointInPolygon(points, x, y)` is the plain geometry underneath.

Click anywhere in the picture: the dot is green when the point is inside the hotspot, and **E** switches the hotspot off and on.

```js
const { createHotspot, pointInPolygon } = p5.clickery;
const zone = [[220, 60], [420, 60], [460, 180], [260, 200]];
let game;
let spot;
let probe = null;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  spot = createHotspot({ id: 'zone', provider: 'polygon', points: zone });
  await game.start();
}

function draw() {
  game.draw();
  noFill();
  stroke(spot.enabled ? '#7fd6a8' : '#888');
  strokeWeight(2);
  beginShape();
  for (const [x, y] of zone) vertex(x, y);
  endShape(CLOSE);
  noStroke();
  fill(255);
  textSize(14);
  text('hotspot "' + spot.id + '"  enabled ' + spot.enabled + '   (click to test a point, E switches it)', 10, 22);
  if (probe) {
    const inside = pointInPolygon(zone, probe.x, probe.y);
    fill(spot.hit(probe.x, probe.y) ? '#7fd6a8' : '#ff6b6b');
    circle(probe.x, probe.y, 12);
    fill(255);
    text('hit() says ' + spot.hit(probe.x, probe.y) + ', pointInPolygon says ' + inside, 10, 42);
  }
}

function mousePressed() {
  probe = { x: mouseX, y: mouseY };
}

function keyPressed() {
  if (key === 'e') spot.enabled = !spot.enabled;
}
```

<!-- page: Hotspots from a picture -->
<!-- headless: skip -->
<!-- covers: colorMaskProvider, parseColor, Game#hotspotFiles -->
Polygons are easy to type, but a curvy lamp or a pile of junk is tedious to trace. A **colour mask** is a hidden picture of the room where each hotspot is a flat colour: the lamp is pure green, the chest pure red. Give the hotspot `provider: 'colorMask'`, the `mask` picture and its `color`; wherever that colour is, the hotspot is. The mask may have a different size from the room (positions are scaled), `tolerance` (default 4) is how far each colour channel may differ, and you should export it without antialiasing, so the colours are exact.

The game reads the mask's pixels once, in `start()`, and keeps them in `game.hotspotFiles` (reading pixels every frame would be slow). `parseColor` turns `'#00ff00'` into `[0, 255, 0]`, and `colorMaskProvider` is the function that tests one pixel, for when you build hotspots by hand. Here the scenery and the mask are both made in code; hover the lamp and the chest.

```js
const { parseColor } = p5.clickery;
let game;

function picture(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  paint(canvas.getContext('2d'));
  return canvas.toDataURL();
}

// what the player sees
const scenery = picture((g) => {
  g.fillStyle = '#2d3a55'; g.fillRect(0, 0, 640, 360);
  g.fillStyle = '#3c4659'; g.fillRect(0, 250, 640, 110);
  g.fillStyle = '#e8d6a0'; g.beginPath(); g.arc(200, 150, 38, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#555'; g.fillRect(195, 185, 10, 65);
  g.fillStyle = '#96643c'; g.fillRect(400, 205, 110, 55);
});

// what the game uses to find the hotspots: flat colours, hard edges
const mask = picture((g) => {
  g.fillStyle = '#00ff00'; g.fillRect(160, 112, 80, 76);
  g.fillStyle = '#ff0000'; g.fillRect(400, 205, 110, 55);
});

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, background: scenery,
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 252], [640, 252], [640, 340], [0, 340]] }],
      hotspots: [
        { id: 'lamp', name: 'obj.lamp', provider: 'colorMask', mask, color: '#00ff00', walkTo: { x: 200, y: 290, dir: 'up' } },
        { id: 'chest', name: 'obj.chest', provider: 'colorMask', mask, color: '#ff0000', walkTo: { x: 455, y: 295, dir: 'up' } },
      ],
    }],
    strings: { 'obj.lamp': 'Street lamp', 'obj.chest': 'Chest', 'lamp.look': 'It is not lit.', 'chest.look': 'Locked.' },
  });
  game.on('lamp', { onLook: (ctx) => ctx.say('lamp.look') });
  game.on('chest', { onLook: (ctx) => ctx.say('chest.look') });
  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('green is ' + JSON.stringify(parseColor('#00ff00')) + '; files kept for hotspots: ' + game.hotspotFiles.size, 10, 22);
}
```

<!-- page: Hotspots from SVG paths -->
<!-- headless: skip -->
<!-- covers: svgProvider, parseSvgPaths, polygonProvider -->
If you draw your room in a vector program such as Inkscape, the shapes are already SVG paths. A hotspot can use one: `provider: 'svg'` with `d`, the path data, or `svg: 'room.svg'`, a file whose `<path>` has the hotspot's `id` (or its Inkscape label); the game loads the file in `start()`. Paths are in room coordinates, so apply any transform before you export.

`parseSvgPaths(svgText)` finds the paths of an SVG and returns them by id, which is useful to take a few shapes out of a drawing. `svgProvider` and `polygonProvider` are the functions underneath each kind, with the same `contains(x, y)`: game code never needs to know which kind a hotspot is. Hover the crate and the pond.

```js
const { parseSvgPaths, polygonProvider } = p5.clickery;
let game;

const svg = `<svg>
  <path id="crate" d="M180 200 L300 200 L300 270 L180 270 Z"/>
  <path id="pond" d="M380 285 Q450 235 520 285 Q450 335 380 285 Z"/>
</svg>`;
const paths = parseSvgPaths(svg);

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'crate', name: 'obj.crate', provider: 'svg', d: paths.crate, walkTo: { x: 240, y: 300, dir: 'up' } },
        { id: 'pond', name: 'obj.pond', provider: 'svg', d: paths.pond, walkTo: { x: 450, y: 320, dir: 'up' } },
      ],
    }],
    strings: { 'obj.crate': 'Crate', 'obj.pond': 'Pond' },
  });

  // draw the same paths as the scenery (in room coordinates, like the hotspots)
  game.drawRoom = (p, room, g) => {
    p5.clickery.drawRoomShapes(p, room, g);
    p.drawingContext.fillStyle = '#96643c'; p.drawingContext.fill(new Path2D(paths.crate));
    p.drawingContext.fillStyle = '#2f5d8a'; p.drawingContext.fill(new Path2D(paths.pond));
  };
  await game.start();
}

function draw() {
  game.draw();
  const square = polygonProvider([[0, 0], [10, 0], [10, 10], [0, 10]]);
  fill(255);
  textSize(13);
  text('paths found in the svg: ' + Object.keys(paths).join(', ') + '   a polygon provider says (5, 5) is inside: ' + square.contains(5, 5), 10, 22);
}
```
