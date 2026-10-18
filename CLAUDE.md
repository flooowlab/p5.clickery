# p5.clickery: development plan

A JavaScript library for point-and-click adventure games, built on p5.js 2.x. It supports Ink and Twine dialogue through optional adapters.

## Goals and non-goals

**Goals**
- Rooms, hotspots, walkable areas, actors, inventory, dialogue, save/load.
- Data-driven content: rooms and hotspots are JSON, and logic lives in per-object async scripts.
- Works on desktop and mobile.

**Non-goals (for v1)**
- Platformers, physics engines, gravity.
- Running Harlowe or SugarCube macros.
- Full 3D.

## Stack decisions

- **p5.js 2.x only.** Use instance mode and register with `p5.registerAddon`. Load assets with `async setup()` and `await loadImage()`. `preload()` is removed in 2.x.
- **No p5.play dependency.** Its Box2D/planck physics is too heavy, and its licence needs checking before any reuse. Write a small sprite, animation-state and `Timer` module with a similar API.
- **Dialogue:** `inkjs` (official runtime) for Ink. Parse Twee 3 or Twison JSON for Twine. A small markdown format we define ourselves.
- **Tests:** Node's built-in runner (`node --test`, zero dependencies) for logic (state, nav, hit-testing, dialogue adapters). Visual checks go in a demo page. Vitest 3 and 5 both failed to install on this device (native binary issues), so revisit Vitest when a dev machine is available.
- **Language:** plain JavaScript (ES modules). Add TypeScript types later if the API stabilises.

## Architecture

```text
core/      game loop (delta time), event bus, scheduler/timers, state store, save/load
scene/     room loader, camera, layers (bg / fg / parallax), transitions, enter/exit hooks
hit/       Hotspot + providers: colorMask, svg (Path2D), polygon
nav/       walkable areas, navmesh, A* pathfinding, depth scale, z-sort by baseline
actor/     Sprite, AnimationState (idle/walk/talk, 4 or 8 directions), Actor (walkTo, say, face)
interact/  verbs or single smart action, default responses, inventory, combine recipes
script/    async per-object scripts, cutscene mode (input lock, skip)
dialogue/  DialogueRunner interface + adapters (ink, twine, markdown); subtitles and choice UI
ui/        HUD, inventory bar, hover label, input (mouse/touch), letterboxed scaling
audio/     music per room with crossfade, SFX, optional voice
debug/     overlay (hotspots, walkable polygons, paths) and state inspector
tools/     level editor, a separate page that exports JSON
```

### Core rules
1. **One state store.** It holds flags, variables, inventory, per-room object state and the current room. Everything is JSON-serialisable, so save/load is a dump and restore.
2. **Hotspots hide their technique.** Game code calls `hotspot.hit(x, y)`, never a provider directly. `colorMask`, `svg` and `polygon` are interchangeable providers.
3. **Walkable areas are the only source of movement, scale and depth.** Hand-drawn paths are walkable areas too.
4. **Cutscene actions are blocking.** `await hero.walkTo(door); await hero.say("Locked."); door.open();`. Input is locked during a cutscene, and the player can skip it.
5. **Unhandled actions fall back to a default response** ("I can't use that").
6. **Everything user-visible is a localisation key** from the start.

## Hit-testing providers

- **colorMask:** a hidden PNG where each colour is a hotspot id.
  - Export without antialiasing and without colour management. Match with a small tolerance.
  - Read pixels once at load into a typed array. Never call `get()` per frame.
  - Map pointer coordinates through canvas scaling and `pixelDensity`.
- **svg:** parse paths into `Path2D` and use `ctx.isPointInPath`. Address objects by `id` or by Inkscape `inkscape:label`.
- **polygon:** point-in-polygon on the JSON data from the editor.

## Phases

Each phase ends with a working demo and passing tests.

### P0 · Setup
- [x] Folder is `p5clickery` (no dot, so it is shell-safe). Package name and global namespace are `p5.clickery`.
- [x] Add `package.json` (ES module, p5 pinned to 2.3.4), `.gitignore`, and a demo `index.html` that loads p5 2.x from `node_modules`.
- [x] Register the addon (`registerClickery`) and create a fixed-size canvas in instance mode (`createGameCanvas`).
- [x] Tests run with `npm test` (Node's built-in runner, see Stack decisions).
- [x] Check the demo in a browser.

### P1 · Core
- [x] Game loop with delta time and a pause flag.
- [x] Event bus (`on`, `off`, `emit`).
- [x] Scheduler and `Timer` (`wait(ms)` returns a promise).
- [x] State store with `get`, `set`, `watch`, `toJSON`, `fromJSON`.
- [x] Save and load to localStorage, plus file export and import.
- **Done when:** state round-trips through save and load in a test.

### P2 · Scenes
- [x] Room JSON format: size, background, layers, hotspots, walkable areas, start positions.
- [x] Camera scrolling for rooms wider than the screen. Parallax layers follow the camera.
- [x] Room enter and exit hooks, and fade transitions.
- **Done when:** the demo walks between two rooms and state persists across the change.

### P3 · Hotspots
- [x] `Hotspot` class with the three providers above.
- [x] Hover detection gives the hovered hotspot id to the interaction layer.
- [x] Debug overlay draws hotspot shapes and hit areas.
- **Done when:** each provider passes the same hit test on the same room.

### P4 · Navigation and actors
- [x] Walkable polygons with a navmesh and A* pathfinding.
- [x] Depth scale from the y coordinate, and z-sorting by baseline.
- [x] `Sprite` and `AnimationState` (idle, walk, talk; 4 or 8 directions; flip).
- [x] `Actor.walkTo(point)` returns a promise. `say(text)` shows a line and resolves when it ends.
- **Done when:** the hero walks around an obstacle and is scaled and sorted correctly.

### P5 · Interaction
- [ ] Action model: a single smart action by default. A verb list is an option.
- [ ] Actions are resolved per hotspot (`interact`, `look`, `use`). Missing handlers fall back to default responses.
- [ ] Inventory with `give`, `remove`, and combine recipes.
- [ ] Hover label, and tap-to-highlight then tap-to-act on touch. Long press to look.
- **Done when:** a three-object puzzle (pick, combine, use) works with mouse and touch.

### P6 · Scripting
- [ ] Per-object script files keyed by object id, with `onInteract`, `onLook`, `onUse`, `onEnter`.
- [ ] Cutscene mode: input lock, skip button, and a `skipTo` label.
- [ ] Helpers: `firstLook`, `firstUse`, which run once and store a flag.
- **Done when:** an opening sequence with walks, speech and a door opens in cutscene mode.

### P7 · Dialogue
- [ ] `DialogueRunner` interface: `next()`, `choices()`, `choose(i)`, `vars`, `done`.
- [ ] Markdown adapter. Syntax: `Speaker: line`, `* choice -> label`, `{flag}` conditions. Keep it small.
- [ ] Ink adapter using `inkjs` on compiled `.ink.json`. Bind external functions (`giveItem`, `setFlag`). Sync variables with the state store. Read tags (`# speaker:`, `# sfx:`).
- [ ] Twine adapter for Twee 3 and Twison JSON. Supports links and `<<set>>`-style variables only.
- [ ] Subtitle bar and choice menu with text speed and skip.
- **Done when:** the same short conversation runs through all three adapters.

### P8 · UI, input and audio
- [ ] Letterboxed responsive scaling with a fixed logical resolution.
- [ ] Music per room with crossfade. SFX triggered by actions.
- [ ] Settings: text speed, subtitles on or off, audio volumes.
- **Done when:** the demo plays correctly at phone width and desktop width.

### P9 · Level editor (`tools/`)
- [ ] Separate page. Load a room image.
- [ ] Manual polygon drawing and a magic wand that builds a mask.
- [ ] Mask to marching squares to simplified polygon.
- [ ] Assign hotspot ids and walkable areas. Export JSON that the runtime loads.
- **Done when:** a room drawn in the editor loads in the runtime with no hand edits.

### P10 · Docs and release
- [ ] README with a quick start, and a room and script format reference.
- [ ] A small example adventure (3 rooms, 1 puzzle, Ink dialogue) that doubles as an integration test.
- [ ] Publish a 0.1 release.

## Patterns worth borrowing

- **Adventure Game Studio:** walkable-area masks with per-area scale. Regions that fire on walk-in. Default `unhandled_event`.
- **SCUMM / Thimbleweed Park:** verb grammar (`verb + object [+ object]`). Per-object `walkTo` point and facing. Actor `say()` with timing.
- **PowerQuest:** scripts as blocking coroutines (our `async/await`). `FirstLook` and `FirstUse` helpers.
- **Escoria:** data-driven room descriptors. Global state plus per-item state, saved automatically.
- **Visionaire:** condition tables for simple puzzles, with no code. Inventory combine matrix.
- **p5.play:** the sprite API shape (`addAnimation`, `changeAnimation`, frame delay, mirroring).
- **inkjs / Twine:** external functions, variable observers, line tags for side effects.

## Conventions

- Keep modules small and single-purpose. Files stay under about 300 lines.
- Use `camelCase` for functions, `PascalCase` for classes, and `kebab-case` for file names and asset ids.
- Public API changes need a note in `CHANGELOG.md`.
- Don't add a dependency without a reason written in the PR description.
- Commit small, and keep each phase in its own branch.

## Open questions

- Verb list or single smart action as the default? (Default: single smart action.)
- Target browsers and minimum mobile version?
- Licence for the library? (Pick before P10.)
