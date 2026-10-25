---
title: Text key finder
status: available
summary: Lists every text key your game uses, and the ones that are missing, never used, or lacking in a language.
---
Every word the player reads is a text key. That keeps translation easy but makes a typo invisible until the game shows `[sign.lok]`. This command reads your rooms and scripts and compares the keys they use with your strings:

```text
node tools/find-keys.mjs --strings strings.en.json rooms scripts
node tools/find-keys.mjs --strings strings.en.json --strings strings.it.json rooms scripts
```

Give it folders (or files). It finds:

- **Keys used in room files:** the `name` of every hotspot (or its `id` when it has no name).
- **Keys used in scripts:** the first argument of `say(...)`, `t(...)` and `translate(...)`, including both sides of a choice like `say(lit ? 'lamp.glows' : 'lamp.cold')`, and `name: 'obj.sign'` written in code. Text shown as it is (`{ literal: true }`) is skipped.

And reports:

```text
28 text keys used in 3 room files and 4 scripts
en: missing  door.locked   used at scripts/door.js:4
en: unused   old.hint
it: missing  door.locked   used at scripts/door.js:4
gap: sign.look is in en but not in it
```

- **missing:** used but not defined, the `[key]` you would otherwise find by playing. Missing keys make the command exit with 1, so it can fail a build.
- **unused:** defined but never used. Keys starting with `default.`, `ui.`, `verb.` and `item.` are left out, because the library and your `items` option use them without you writing them; add more with `--ignore prefix`. A key built at run time, such as `` `door.${name}` ``, cannot be seen, so check an "unused" key before deleting it.
- **gap:** with two or more strings files, a key that one language lacks. Each file's language is its name: `strings.it.json` is `it`.

`--strict` makes unused keys and gaps fail too.
