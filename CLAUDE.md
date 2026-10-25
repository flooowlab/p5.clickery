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
- **Distribution:** `dist/p5.clickery.min.js` is the file users load with a `<script>` tag after p5 (like other p5 add-ons); also `p5.clickery.js` and `p5.clickery.esm.js`. Built from `src/` with esbuild (a dev dependency only: it is the build tool, not a runtime dependency). Never edit `dist/` by hand: `npm run build`, or `npm run dev` to rebuild on every change. The build also runs before `npm test` and in the pre-commit hook (`.githooks/`, set up by `npm install`), and a release test fails if `dist/` is stale.
- **API style:** p5-like: one call with defaults (`createGame`) for the common case, every part still reachable for the rest. New features get a sensible default and an option, not required wiring.

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
game/      createGame / Game: all of the above wired together with defaults, plus the p5 binding (canvas, input, draw)
```

### Repository layout

```text
dist/       built files to distribute (p5.clickery.min.js, .js, .esm.js); generated, do not edit
src/        the library (src/index.js exports everything; src/global.js is the script-tag entry)
examples/   runnable pages, one folder each, learning order: quickstart, core, rooms, adventure, lighthouse
            examples/assets/ holds assets shared between examples; each example has a page in site/examples/
tools/      editor/ (room editor page), dialogue/ and animation/ (previewer pages), lib/ (logic shared by the scripts), and Node scripts: build.mjs, build-site.mjs (+ site/ helpers), check-rooms.mjs, find-keys.mjs, compile-ink.mjs, make-example-audio.mjs, make-sample-room.mjs
site/       the website's own files: learn/*.md (lessons), tools/*.md (one per tool), assets/ (css, js); the Docs pages come from JSDoc in src/
docs/       reference.md (formats: room, hotspot, items, scripts, dialogue, state, events, saves)
test/       unit/ (one file per src/ folder), tools/, integration/ (Lighthouse playthrough), release/, site/, fixtures/
```

**The website** (GitHub Pages, built by `.github/workflows/pages.yml`, locally `npm run build:site` into `_site/`) has three sections; Learn and Docs follow p5play's:
- **Docs** is function-centred and generated from the JSDoc comments in `src/` (`/** */` with `@param`, `@returns`, `@example`). Write the comment with the code. `@typedef` documents option objects. A tag must start its own line; `{@link Name}` links to another entry.
- **Learn** is example-centred. p5 2.x does not start `draw()` until an async `setup()` has returned, and a game only moves forward from `draw()`, so a lesson's `setup()` must not `await` a cutscene, a walk, a line or a wait: start it without `await` (the library also steps and draws the game itself during `setup()`, see `src/game/setup-driver.js`, but `draw()` overlays are missing until it ends). The test harness runs lessons in p5's order and fails otherwise. A page that needs a real browser (canvas, pictures) adds `<!-- headless: skip -->`. `site/learn/NN-topic.md` is a topic, split into pages by `<!-- page: Title -->`. Each page names what it teaches in `<!-- covers: Game#say, ... -->` and has one ```js sketch that runs live next to its code. Names in `covers` must exist in the JSDoc, or the build fails.
- **Tools**: `site/tools/NN-name.md`, front matter `title`, `status` (`available` or `planned`), `summary`, and optionally `open` (a path to a page to launch, such as `tools/editor/`). A new tool in `tools/` gets a page here; a planned one is labelled as not built. Keep a tool's logic in a small pure module (`tools/lib/`, or next to its page) with tests in `test/tools/`, and the page or CLI thin. Pages that import from `../../src/` need `src/` published: `tools/build-site.mjs` copies it, and a test checks that everything the pages load is copied.
- `test/site/site.test.js` runs every sketch headlessly and keeps `test/site/undocumented.txt` (exports with no JSDoc yet) shrinking: document an export, then delete its line.

New runnable pages go in their own `examples/<name>/` folder and get a page in `site/examples/NN-name.md` (title, summary, what it shows; the site build wraps the example in the site's header). A tool app in `tools/<app>/` is wrapped the same way (list it in `APPS` in `tools/site/embed.mjs`) and uses `tools/shared/app.css`, so it follows the site's light and dark theme. Pages load p5 and
`dist/p5.clickery.min.js` with `../../` paths (only the Lighthouse imports `src/`, as a modules-project example). Tests for a `src/<area>/` module go in `test/unit/<area>.test.js`.

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
- [x] Add `package.json` (ES module, p5 pinned to 2.3.4), `.gitignore`, and a demo page that loads p5 2.x from `node_modules` (now the Core lessons on the website).
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
- [x] Action model: a single smart action by default. A verb list is an option.
- [x] Actions are resolved per hotspot (`interact`, `look`, `use`). Missing handlers fall back to default responses.
- [x] Inventory with `give`, `remove`, and combine recipes.
- [x] Hover label, and tap-to-highlight then tap-to-act on touch. Long press to look.
- **Done when:** a three-object puzzle (pick, combine, use) works with mouse and touch.

### P6 · Scripting
- [x] Per-object script files keyed by object id, with `onInteract`, `onLook`, `onUse`, `onEnter`.
- [x] Cutscene mode: input lock, skip button, and a `skipTo` label.
- [x] Helpers: `firstLook`, `firstUse`, which run once and store a flag.
- **Done when:** an opening sequence with walks, speech and a door opens in cutscene mode.

### P7 · Dialogue
- [x] `DialogueRunner` interface: `next()`, `choices()`, `choose(i)`, `vars`, `done`.
- [x] Markdown adapter. Syntax: `Speaker: line`, `* choice -> label`, `{flag}` conditions. Keep it small.
- [x] Ink adapter using `inkjs` on compiled `.ink.json`. Bind external functions (`giveItem`, `setFlag`). Sync variables with the state store. Read tags (`# speaker:`, `# sfx:`).
- [x] Twine adapter for Twee 3 and Twison JSON. Supports links and `<<set>>`-style variables only.
- [x] Subtitle bar and choice menu with text speed and skip.
- **Done when:** the same short conversation runs through all three adapters.

### P8 · UI, input and audio
- [x] Letterboxed responsive scaling with a fixed logical resolution.
- [x] Music per room with crossfade. SFX triggered by actions.
- [x] Settings: text speed, subtitles on or off, audio volumes.
- **Done when:** the demo plays correctly at phone width and desktop width.

### P9 · Level editor (`tools/`)
- [x] Separate page. Load a room image.
- [x] Manual polygon drawing and a magic wand that builds a mask.
- [x] Mask to marching squares to simplified polygon.
- [x] Assign hotspot ids and walkable areas. Export JSON that the runtime loads.
- **Done when:** a room drawn in the editor loads in the runtime with no hand edits.

### P10 · Docs and release
- [x] README with a quick start, and a room and script format reference (`docs/reference.md`).
- [x] A small example adventure (3 rooms, 1 puzzle, Ink dialogue) that doubles as an integration test (`examples/lighthouse`, `test/integration/lighthouse.test.js`).
- [ ] Publish a 0.1 release. Prepared: version 0.1.0, MIT licence, changelog, package contents. The git tag and `npm publish` are left to the maintainer (see the release notes in the PR).

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
- Public API changes need a note in `CHANGELOG.md`, and a JSDoc comment with an `@example` (that is what the Docs section shows).
- Don't add a dependency without a reason written in the PR description. Dev-only so far: `esbuild` (builds `dist/`), `jsdoc` (reads the doc comments for the website), `marked` (renders their Markdown).
- Commit small, and keep each phase in its own branch.

## Open questions

- Verb list or single smart action as the default? (Default: single smart action.)
- Target browsers and minimum mobile version?
- ~~Licence for the library?~~ Decided: MIT.
