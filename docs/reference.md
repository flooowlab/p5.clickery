# p5.clickery format reference

The exact shape of the data files and scripts. For a gentle introduction read the [README](../README.md) first; for a complete small game see [examples/lighthouse](../examples/lighthouse).

**Contents:** [Room JSON](#room-json) · [Hotspots](#hotspots) · [Items and recipes](#items-and-recipes) · [Scripts](#scripts) · [Cutscenes](#cutscenes) · [Dialogue files](#dialogue-files) · [State paths](#state-paths) · [Events](#events) · [Text keys](#text-keys-the-library-uses) · [Settings](#settings) · [Save file](#save-file)

---

## Room JSON

A room is one object. `parseRoom(json)` checks it and fills in defaults; `SceneManager` calls it for you with whatever your `loadRoom(id)` returns.

```json
{
  "id": "hall",
  "width": 960,
  "height": 360,
  "background": "hall.png",
  "color": "#223344",
  "music": "hall-theme",
  "layers": [
    { "image": "far.png", "depth": "bg", "parallax": 0.5 },
    { "image": "pillar.png", "depth": "fg" }
  ],
  "starts": {
    "default": { "x": 100, "y": 300, "dir": "right" },
    "fromCellar": { "x": 880, "y": 300 }
  },
  "walkable": [
    { "id": "floor", "points": [[0, 250], [960, 250], [960, 360], [0, 360]], "scale": [[250, 0.6], [360, 1]] }
  ],
  "obstacles": [
    { "id": "table", "points": [[520, 285], [660, 285], [660, 335], [520, 335]] }
  ],
  "hotspots": []
}
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Room id, used by `goTo(id)` and in the state (`rooms.<id>`). |
| `width`, `height` | number > 0 | yes | Room size in logical pixels. Wider than the screen scrolls with the camera. |
| `background` | string | no | Name of the background image (see `drawBackground`'s `images` argument). |
| `color` | CSS colour | no (default `#000000`) | Flat fill used when there is no `background`. |
| `music` | string or `null` | no | Sound id for this room's music. Omitted: keep the current music. `null`: silence. |
| `layers` | list | no | Extra images. `image` (name, required); `depth`: `"bg"` (default, behind actors) or `"fg"` (in front); `parallax`: 1 moves with the room (default), 0 stays fixed on the screen, any number ≥ 0. |
| `starts` | object | yes, at least one | Named places the hero can appear: `{ "x", "y", "dir" }`. `goTo(room, "name")` picks one; `"default"` is used when no name is given. `dir` is optional. |
| `walkable` | list | no | Floor polygons. `id` (unique), `points` (3 or more `[x, y]`), optional `scale`. |
| `obstacles` | list | no | Polygons cut out of the floor. `id` (unique), `points` (3 or more). |
| `hotspots` | list | no | Clickable areas, see [Hotspots](#hotspots). |

**Depth scale.** `scale` on a walkable area is a list of `[y, scale]` pairs sorted by `y`. Between two pairs the scale changes smoothly; above the first or below the last it stays constant. Without `scale` the area has scale 1. The last walkable area containing a point decides its scale.

**What is checked.** `parseRoom` throws a descriptive error for: a missing or empty `id`; `width` or `height` that is not a positive number; a layer without an `image`, with a `depth` other than `bg`/`fg`, or with a negative `parallax`; duplicate ids among hotspots, among walkable areas or among obstacles (ids only need to be unique *within* a kind); a walkable area or obstacle with fewer than 3 points; no `starts`; a start without numeric `x` and `y`. Other keys are kept as they are, so you can add your own fields.

**Walking.** The hero can stand where some walkable area contains the point and no obstacle does. Walkable areas that share an edge form one surface. Obstacles must be thicker than about 2 px. Paths are the shortest route around obstacles.

---

## Hotspots

```json
{ "id": "door", "name": "obj.door", "provider": "polygon", "points": [[860,120],[940,120],[940,250],[860,250]],
  "z": 1, "walkTo": { "x": 850, "y": 300, "dir": "right" } }
```

| Field | Meaning |
| --- | --- |
| `id` | Unique among hotspots. Handlers are registered under this id. No dots (ids appear in state paths). |
| `name` | Text key shown on hover (`core.i18n`). Defaults to the `id`. |
| `provider` | `"polygon"`, `"svg"` or `"colorMask"`: the shape technique. |
| `z` | Stacking order where hotspots overlap: the highest wins; on a tie the later one in the list. Default 0. |
| `walkTo` | `{ x, y, dir }`: where the hero walks before acting. `dir` is the way the hero faces on arrival. Without `walkTo` the action happens where the hero stands. |

Provider fields:

| Provider | Fields |
| --- | --- |
| `polygon` | `points`: 3 or more `[x, y]` in room coordinates. |
| `svg` | Either `d`: SVG path data in room coordinates, or `svg`: a file name plus optional `pathId` (default: the hotspot's `id`) — the `<path>` whose `id` or `inkscape:label` matches. Needs `assets.text(name)` in `createHotspots`. SVG transforms are not applied. |
| `colorMask` | `mask`: a picture name, `color`: `"#rrggbb"` (or `"#rgb"`) of this hotspot in the picture, `tolerance`: per-channel difference allowed (default 4). Needs `assets.pixels(name)` returning `{ data, width, height }`. The mask can have a different size from the room. Export it without antialiasing or colour management. |

Any other keys on a hotspot (for example a `color` used by your own drawing code) stay on `scene.room.hotspots[i]`.

Directions: `up`, `right`, `down`, `left`, and with 8-direction actors `up_right`, `down_right`, `down_left`, `up_left`.

---

## Items and recipes

```json
{
  "items": { "stick": { "name": "item.stick" }, "string": { "name": "item.string" }, "pole": { "name": "item.pole" } },
  "recipes": [ { "a": "stick", "b": "string", "result": "pole", "say": "combine.pole", "consume": ["a", "b"] } ]
}
```

Passed to `new Inventory({ state, events, items, recipes })`.

* `items`: item id → `{ name }` (a text key). Extra fields are kept for your own use. The id is also the key for item scripts.
* `recipes`: `a` and `b` are item ids (order does not matter when combining), `result` is the new item, `say` is an optional text key spoken on success, `consume` lists which ingredients are used up: `["a", "b"]` (default), or just one to keep the other.
* An item can be given once; giving it again returns `false`. Unknown ids throw (`unknown item "x"`).

---

## Scripts

A script is an object of hooks. Register it under the id of the thing it belongs to: a hotspot, an inventory item or a room.

```js
interactor.register('door', { onInteract, onLook, onUse });   // or scripts.add('door', {...}) / scripts.addAll({...})
```

| Hook | Runs when | Applies to |
| --- | --- | --- |
| `onInteract(ctx)` | The player clicks it (smart mode) | hotspots, items |
| `onLook(ctx)` | Right-click, long press, or the *look* verb | hotspots, items |
| `onUse(ctx)` | An item is used on it. `ctx.item` is that item | hotspots |
| `onEnter(ctx)` | The room is entered, while the screen is black | rooms, and each hotspot of the room |
| `onEntered(ctx)` | After the fade-in | rooms, and each hotspot of the room |
| `onExit(ctx)` | The room is being left | rooms |

Every hook may be `async`; the game waits for it, and the player's input is ignored meanwhile. A hook that returns exactly `false` counts as *not handled* and the default response is spoken instead (`default.interact`, `default.look`, `default.use`; `default.combine` when two items do not combine). Anything else, including no return value, means handled. A hook that throws is reported to `interactor.onError` (default `console.error`), and input is released.

**`ctx` for object hooks**

| Field | Meaning |
| --- | --- |
| `verb` | `"interact"`, `"look"` or `"use"` |
| `id` | The object's id |
| `hotspot` | The live hotspot, or `null` for an item |
| `item` | The item used on the object (`onUse`), else `null` |
| `hero` | The hero `Actor` |
| `say(key, options)` | Same as `hero.say`. Resolves when the line is over |
| `setEnabled(hotspotId, on)` | Switch a hotspot in the current room on or off (saved) |
| `state`, `inventory`, `interactor` | The state store, the inventory, the interactor |
| `cutscenes`, `dialogue`, `audio` | The ones you passed to `new Interactor(...)`, or `null` |

**`ctx` for room hooks** (`onEnter`, `onEntered`, `onExit`): `room` (the parsed room), `state`, `scene`, and for enter hooks `start` (the start name used) and `firstVisit` (`true` the first time ever). Object enter hooks get the object context fields as well.

**Run-once helpers** (imported from the library): `once(ctx, key, fn)`, `firstLook(ctx, fn)`, `firstInteract(ctx, fn)`, `firstUse(ctx, fn)` (once per item). They return a promise of `true` if `fn` ran, `false` if it had run before. The flag is stored at `flags.once.<id>.<key>` and is set *before* `fn` runs.

**Interaction rules.** Only one action runs at a time. A click while the hero is still walking replaces the pending action; a click while a hook is running, a cutscene is playing or a conversation is open is ignored. Items can only be held (`interactor.select(id)`) while carried; selecting one you do not have throws.

---

## Cutscenes

```js
const cutscenes = new Cutscenes({ events, scheduler, targets: [hero, scene.fade] });
await cutscenes.run(async (cs) => { /* ordinary await code */ }, { skippable: true });
cutscenes.skip();          // fast-forward to the end
cutscenes.skip('label');   // fast-forward to cs.label('label'), then play normally
```

* `cs.label(name)`, `cs.wait(ms)`, `cs.skipped`, `cs.skipping()`.
* While skipping: actors jump to where they were walking and drop their lines, `scheduler.wait` and fades finish instantly, and everything else your script does (state changes, item changes) still happens, so a skipped cutscene ends in the same state as a played one.
* `targets` are objects with `setSkipping(on)` (and optionally `stop()`). `Actor`, `Scheduler` and `Fade` all have `setSkipping`; `Actor` also has `stop`. The scheduler passed in is always a target.
* Starting a cutscene stops targets' current walks and lines. Nested `run` calls run inside the outer cutscene.
* Events: `cutscene:start`, `cutscene:end` (`{ skipped }`). `cutscenes.active` is true meanwhile and locks the interactor.

---

## Dialogue files

Runners all expose `next()`, `choices()`, `choose(i)`, `vars` and `done`. A line is `{ speaker, text, tags }`.

**Markdown**

| Syntax | Meaning |
| --- | --- |
| `# name` | Section (label). The first section is where it starts. Letters, digits, `_`, `-`. |
| `Speaker: text` | Line. The colon needs a following space; the speaker is a short name (up to 30 characters of letters, digits, space, `.`, `'`, `-`, starting with a letter). |
| `text` | Line with no speaker |
| `... # key:value # flag` | Tags at the end of a line (a bare tag becomes `true`) |
| `* text -> section` | A choice (put the list at the end of a section) |
| `* {condition} text -> section` | Choice shown only when the condition holds |
| `{condition} line` | Line shown only when the condition holds |
| `~ name = value`, `~ name += n`, `~ name -= n` | Set a variable: `true`, `false`, a number, or text (quotes optional) |
| `-> section` / `-> END` | Jump / finish |
| `// comment` | Ignored |

Conditions: `name`, `!name`, `name == v`, `!=`, `<`, `>`, `<=`, `>=`. `{name}` in text shows the variable. A section ends with a choice list, a jump, or just stops (which finishes). Mistakes are reported with the line number.

**Twine** (`createTwineRunner(source)`): Twee 3 text (`:: Name [tags]` headers; `StoryTitle` and `StoryData` are understood, `StoryData`'s `start` picks the first passage, otherwise `Start`, otherwise the first passage) or Twison (`{ passages: [{ pid, name, text }], startnode }`). Links `[[text->target]]`, `[[target<-text]]`, `[[text|target]]`, `[[target]]` become choices; `<<set $x to v>>` (also `=`, `+=`, `-=`) sets variables; `$x` in text shows one. Any other macro is rejected with an error naming the passage.

**Ink** (`createInkRunner(story, options)`): give it an inkjs `Story` made from compiled `.ink.json` (`node tools/compile-ink.mjs file.ink`). Options: `state` and `sync: ['var', ...]` (ink variables kept in `vars.<name>` of the state store, both ways), `externals` (`EXTERNAL` function implementations; `inkExternals({ inventory, state })` provides `giveItem(id)` and `setFlag(name)`), `reset` (default `true`: start the story from the beginning). A runner is one conversation: creating another for the same story detaches the previous one first. Tags `# speaker: Name` and `# key: value` are read; a line with only tags is returned with empty text.

---

## State paths

Everything the library keeps is in the state store and is JSON, so a save is a dump. Your own data is welcome too.

| Path | Holds |
| --- | --- |
| `currentRoom` | Id of the room the player is in |
| `inventory` | Array of item ids |
| `rooms.<id>.visited` | `true` once the room has been entered |
| `rooms.<id>.hotspots.<hotspotId>.enabled` | `false` when a hotspot was switched off |
| `flags.once.<id>.<key>` | Run-once helper markers |
| `vars.<name>` | Dialogue variables (Markdown, Twine, and Ink variables listed in `sync`) |
| `flags.*`, `vars.*`, `rooms.<id>.*` | Yours, by convention: yes/no facts, numbers and text, per-room data |

Paths are dot-separated, so ids and names must not contain dots. Values must be plain JSON; `undefined`, functions and cyclic data are rejected. `get` returns copies.

---

## Events

On `core.events` (`on`, `once`, `off`, `emit`).

| Event | Data |
| --- | --- |
| `update` | `dt` (milliseconds) |
| `room:enter`, `room:entered` | `{ room, state, scene, start, firstVisit }` |
| `room:exit` | `{ room, state, scene }` |
| `hover` | `{ id, hotspot }` (`id` is `null` when nothing is hovered) |
| `action` | `{ verb, id, kind, item, handled }` (`verb` may be `"combine"`) |
| `inventory:add`, `inventory:remove` | `{ id }` |
| `inventory:select` | `{ id }` (`null` when put away) |
| `cutscene:start`, `cutscene:end` | `end`: `{ skipped }` |
| `dialogue:start`, `dialogue:end` | — |
| `dialogue:line` | `{ speaker, text, tags }` |
| `dialogue:tag` | `{ key, value, line }` |
| `dialogue:choose` | `{ index, text }` |

If an event handler throws, the other handlers still run, then the error is rethrown from `emit`.

---

## Text keys the library uses

Add them with `core.i18n.add('en', defaultStrings)` and override any of them.

| Key | Used for |
| --- | --- |
| `default.interact`, `default.look`, `default.use`, `default.combine` | Answers when nothing handles an action |
| `ui.use_on` (`{item}`, `{target}`), `ui.use_item` (`{item}`) | Hover label while holding an item |
| `verb.interact`, `verb.look`, `verb.use`, `verb.walk` | Verb-mode labels |

`i18n.t(key)` returns `[key]` for a missing key, so a missing text is easy to see on screen.

---

## Settings

`new Settings()` (kept in `localStorage` under `p5.clickery:settings`, separate from saves).

| Name | Range | Default |
| --- | --- | --- |
| `textSpeed` | 0.25–4 | 1 |
| `subtitles` | true / false | true |
| `masterVolume`, `sfxVolume`, `voiceVolume` | 0–1 | 1 |
| `musicVolume` | 0–1 | 0.7 |

---

## Save file

`saveToSlot(state, slot)` stores `p5.clickery:<slot>`; `exportToFile` downloads the same text.

```json
{ "version": 1, "savedAt": 1760000000000, "state": { "flags": {}, "vars": {}, "inventory": [], "rooms": {}, "currentRoom": null } }
```

Loading validates the envelope first; a corrupt file or one with a newer `version` throws and leaves the running game untouched. Missing top-level state keys get their defaults.
