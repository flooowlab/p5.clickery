---
title: Inventory
blurb: What the player carries, and how items combine.
---
<!-- page: What do I carry -->
<!-- covers: Inventory#list, Inventory#has, Inventory#give, Inventory#remove -->
`game.inventory` is the player's pockets. `give(id)` adds an item and `remove(id)` takes it out; both say whether anything changed (giving an item already carried does nothing). `has(id)` asks, and `list` is the array of what is carried, in order. It is kept in the saved state, so it survives save and load.

(`game.give`, `game.take` and `game.has` are shortcuts for the same calls.) Click the chest to put the coin in your pocket, and again to put it back.

```js
let game;

async function setup() {
  game = createGame({
    items: { coin: 'gold coin' },
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'chest', name: 'obj.chest', provider: 'polygon', color: '#96643c',
        points: [[400, 200], [480, 200], [480, 260], [400, 260]], walkTo: { x: 440, y: 300, dir: 'up' },
      }],
    }],
    strings: { 'obj.chest': 'Chest', 'chest.took': 'Into my pocket.', 'chest.put': 'Back in the chest.' },
  });

  game.on('chest', {
    onInteract: (ctx) => {
      const inv = game.inventory;
      if (inv.has('coin')) {
        inv.remove('coin');
        return ctx.say('chest.put');
      }
      inv.give('coin');
      return ctx.say('chest.took');
    },
  });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(14);
  text('carrying: ' + JSON.stringify(game.inventory.list), 10, 22);
}
```

<!-- page: Combine two items -->
<!-- covers: Inventory#combine, Inventory#recipeFor -->
Some items go together. List the pairs in `recipes`: `{ a, b, result }` works in either order, uses both ingredients up, and gives the `result`. Add `say` (a text key) for what the hero says, and `consume: ['b']` to keep `a` (a knife stays a knife).

The player combines by clicking one item in the bar, then another. In code, `inventory.combine(a, b)` does the same and returns the recipe used, or `null`; `inventory.recipeFor(a, b)` only looks the recipe up. Pick up the stick and the string, then click one and then the other.

```js
let game;

async function setup() {
  game = createGame({
    items: { stick: 'stick', string: 'piece of string', pole: 'fishing pole' },
    recipes: [{ a: 'stick', b: 'string', result: 'pole', say: 'combine.pole' }],
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 320, y: 310 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [
        { id: 'stickspot', name: 'obj.stick', provider: 'polygon', color: '#8a6a3a',
          points: [[150, 280], [210, 280], [210, 292], [150, 292]], walkTo: { x: 180, y: 315 } },
        { id: 'stringspot', name: 'obj.string', provider: 'polygon', color: '#d8d0b0',
          points: [[450, 280], [490, 280], [490, 292], [450, 292]], walkTo: { x: 470, y: 315 } },
      ],
    }],
    strings: {
      'obj.stick': 'Stick', 'obj.string': 'String',
      'combine.pole': 'A fishing pole! Now I just need a pond.',
    },
  });

  for (const [spot, item] of [['stickspot', 'stick'], ['stringspot', 'string']]) {
    game.on(spot, { onInteract: (ctx) => { game.give(item); ctx.setEnabled(spot, false); } });
  }

  await game.start();
}

function draw() {
  game.draw();
  const recipe = game.inventory.recipeFor('stick', 'string');
  fill(255);
  textSize(14);
  text('stick + string = ' + (recipe ? recipe.result : 'nothing'), 10, 22);
}
```

<!-- page: Item definitions -->
<!-- covers: Inventory#define, Inventory#items, Inventory#recipes -->
The `items` option becomes `game.inventory.items`: each id with its definition, whose `name` is a **text key** (a game turns `{ key: 'brass key' }` into `name: 'item.key'` for you). `inventory.define(id)` returns one definition and throws for an id that does not exist, which makes a typo easy to find. `inventory.recipes` is the list of recipes.

You can add an `image` to an item to show a picture in the bar instead of its name.

```js
let game;

async function setup() {
  game = createGame({
    items: { key: 'brass key', lamp: 'oil lamp', map: { text: 'old map' } },
    recipes: [{ a: 'key', b: 'map', result: 'lamp' }],
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
  const inv = game.inventory;
  fill(255);
  textSize(14);
  let y = 22;
  for (const id of Object.keys(inv.items)) {
    text(`${id}: name key "${inv.define(id).name}" = "${game.i18n.t(inv.define(id).name)}"`, 10, y);
    y += 20;
  }
  text('recipes: ' + inv.recipes.length, 10, y);
}
```
