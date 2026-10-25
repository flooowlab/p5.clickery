---
title: State inspector
status: available
summary: A panel beside the running game that shows its memory live, and lets you change it to test a puzzle without replaying it.
open: learn/debugging.html?page=1
openLabel: Try it in a lesson
---
While you build a game you keep asking "what does the game remember right now?" and "what if the key were already in my pocket?". The state inspector answers both without extra code. It is built into the library and off until you ask for it:

```js
const game = createGame({ rooms, inspectorKey: 'i' });
```

Press **I** while playing and a panel opens on the right. It shows:

- **The room** you are in and where the hero stands. Pick another room and press *go* to jump there.
- **The inventory**, one box per item. Tick one to give it, untick it to take it away.
- **The flags**, with a box for each yes/no flag. Click one to switch it.
- **The whole state as JSON**, editable. *apply* changes the state; *apply + re-enter room* also puts the room back together from it, which is what you want after changing the current room or a hotspot's state.
- **save** and **load**, which use the game's save slot.
- **The events** as they happen (`room:enter`, `inventory:add`, `dialogue:line`, and your own), newest first.

A typical use: you are testing the end of a puzzle. Open the inspector, tick the key and the lamp oil, press *apply + re-enter room*, and walk straight to the final door.

The inspector is off by default because a stray key in a published game would be a surprise; turn it on only while developing. You can also open one from code: `game.inspector = new p5.clickery.StateInspector(game); game.inspector.show();`. Its pieces are in the [docs](../docs/StateInspector.html).
