---
title: Game packer
status: planned
summary: Bundle a finished game into one folder (or zip) you can upload to a website or itch.io.
---
**Not built yet.** A finished game is an `index.html`, your rooms, pictures, sounds and scripts, plus p5 and p5.clickery. Gathering them by hand is where people forget a file. A packer would:

```text
node tools/pack.mjs my-game --out dist-game
```

- copy the game and the libraries it needs (the p5 and p5.clickery files, and inkjs if you use Ink) into one folder with paths that work from any address;
- run the room checker and the text key finder first, and refuse to pack a game with errors;
- leave out the developer tools (the inspector key is off by default, but `debugKey` would be reported);
- optionally make a `.zip`, which is what itch.io's HTML5 games want.

Say if you want it.
