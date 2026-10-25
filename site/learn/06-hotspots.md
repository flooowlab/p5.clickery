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
