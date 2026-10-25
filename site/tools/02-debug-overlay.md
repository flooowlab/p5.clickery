---
title: Debug overlay
status: available
summary: Outlines every hotspot and walkable area in the running game. Press D.
open: learn/game.html?page=9
openLabel: Try it in a lesson
---
When a click does not do what you expect, look at the shapes. The overlay is built into every game made with `createGame`:

- Press **D** while playing, or set `game.debug = true`.
- Every hotspot and every walkable area is outlined, obstacles included, and the hotspot under the pointer is marked.
- The key can be changed or turned off with the `debugKey` option.

```js
game = createGame({ rooms: [yard], debugKey: 'f2' });
game.debug = true;
```

If you build a game from the parts yourself, `drawDebugOverlay` draws the same thing.
