---
title: Animation previewer
status: available
summary: Cut a sprite sheet into frames, name the animations, watch them play, and copy the hero's animations option.
open: tools/animation/
openLabel: Open the previewer
---
Setting up a hero with real art means writing the `animations` option: which frames, how fast, for which direction. The previewer does it visually, in your browser; nothing is uploaded.

1. **Open sprite sheet…** (any picture of a grid of equal frames), or press **Sample sheet** to try it. Set the **frame width and height**; the page draws the grid and numbers the frames, left to right and top to bottom.
2. **Animations:** one row each. Give it a name (`idle`, `walk` or `talk`, then optionally `_up`, `_right`, `_down`, `_left`), the frames (`0`, `0, 2, 4`, or a range like `4-7`), the milliseconds per frame, and whether it loops.
3. **Preview:** choose a state and a direction. It plays with the library's own animation code, so you see exactly what the game will do, including the fallback: with only `walk_right` defined, facing left plays it mirrored. The line under the picture says which animation is used, and whether it is mirrored.
4. **Code for your game** is ready to copy: it loads the sheet, cuts the frames with `spriteFrames` (see the Pictures lessons), and fills in the `hero` option.

```js
const sheet = await loadImage("hero.png");
const frames = p5.clickery.spriteFrames(sheet, 64, 64); // 4 columns, numbered left to right, top to bottom

const game = createGame({
  hero: {
    directions: 4,
    animations: {
      idle: { frames: [frames[0]], delay: 200 },
      walk_right: { frames: [4, 5, 6, 7].map((i) => frames[i]), delay: 120 },
    },
  },
  // rooms, items, strings...
});
```

The page warns about names that will not be used (`run_right`, `walk_sideways`), animations with no frames or a frame beyond the sheet, a delay that is not above 0, and a missing `idle` (a standing hero would draw nothing).
