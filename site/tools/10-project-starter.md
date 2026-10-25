---
title: Project starter
status: planned
summary: One command that creates a new game folder you can open and play straight away.
---
**Not built yet.** Today a new game starts by copying the quick start example and renaming things. A starter would do that for you:

```text
node tools/new-game.mjs my-game
```

It would create a folder with a working one-room game, ready to open:

- `index.html` that loads p5 and p5.clickery,
- `rooms/start.json`, `strings.en.json` and a `scripts/` folder with one example script,
- a `README` with the three next steps: open the room editor, add a hotspot, write its script,
- and a one-line way to serve it (browsers will not load room files from `file://`).

Everything it needs already exists (the quick start, the room format, the checkers), so this is mostly a template and a copy script. Say if you want it.
