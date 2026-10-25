---
title: Ink compiler
status: available
summary: Turns your .ink conversations into the compiled .ink.json file that game.talk plays.
---
If you write conversations in [Ink](https://www.inklestudios.com/ink/), the game plays the compiled form. This command line tool compiles one or more files:

```text
node tools/compile-ink.mjs dialogue/keeper.ink
```

It writes `dialogue/keeper.ink.json` next to the source. Load that file and hand it to the game:

```js
const keeper = await (await fetch('dialogue/keeper.ink.json')).json();
await game.talk(keeper);
```

Playing it needs inkjs in the page: load `ink.js` with a script tag, or pass inkjs's `Story` class in the `Story` option.

The compiler comes with `inkjs`, which is already a development dependency of the repository. Ink can call two functions the game provides, `giveItem("key")` and `setFlag("name")`, and its variables are saved with the game.

You can also compile in Inky (the Ink editor) with *Export to JSON*; the result is the same.
