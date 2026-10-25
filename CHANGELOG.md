# Changelog

## Unreleased

### Fixed
- An async `setup()` that awaits something needing frames (an opening cutscene in a room's `onEntered`, a line of speech, a walk) no longer waits forever. p5 2.x does not call `draw()` until `setup()` returns, and a game only moved forward from `draw()`; now the game steps and draws itself from the browser's frame callback until p5's loop takes over (`src/game/setup-driver.js`). `game.start()` documents this.
- `createGame` now supports `colorMask` hotspots and `svg` hotspots that name a file: the p5 binding loads the mask pictures (pixels read once) and SVG files in `start()`, relative to the room file, and the game passes them to the hotspot providers (`game.hotspotFiles`). Before, only polygons and inline SVG paths worked through `createGame`.

### Added
- `spriteFrames(sheet, frameWidth, frameHeight)` cuts a sprite sheet into frames for an actor's `animations`. The animation previewer's code uses it.
- Website: the examples and the three tool apps (room editor, dialogue previewer, animation previewer) are shown inside the site's own pages; the apps share `tools/shared/app.css` and follow the light and dark theme. The `core` and `rooms` example demos are removed; their content is in the Core, Rooms, Hotspots and Navigation lessons.
- Lessons: Pictures (backgrounds, parallax layers, item pictures, sprite sheets), SVG and colour-mask hotspots, instance mode, saves as files, and reusing the default drawing. 65 lessons in 13 topics.
- A website for GitHub Pages: **Learn** (live, editable lessons) and **Docs** (generated from JSDoc comments in `src/`). `npm run build:site` builds it into `_site/`.
- JSDoc comments on `createGame`, `createGameCanvas`, `registerClickery`, `GameOptions` and every `Game` member. No behaviour change; `Game` gains the declared properties `actors` and `scaler` (both were already used).
- `GAME_DEFAULTS` moved to `src/game/options.js` (still exported from the same place).
- JSDoc for `Actor` (and the `WalkTarget` type), `Inventory`, `Interactor` (and the `ScriptContext` type), and `once`, `firstLook`, `firstInteract`, `firstUse`. No behaviour change.
- Website: 56 lessons in 12 topics, a Tools section, and complete reference pages (every export has a JSDoc comment; the docs are grouped by area, with Functions, Types and Constants pages).
- JSDoc for the rest of the library: the core parts (`EventBus`, `StateStore`, `Scheduler`, `Timer`, `I18n`, `GameLoop`, `Settings`, saving), rooms (`Room`, `RoomStart`, `WalkableArea`, `Camera`, `SceneManager`, `Fade`), hotspots (`HotspotDefinition`, `Hotspot`, `HoverTracker`, providers), navigation, animation, scripts, cutscenes, dialogue (`DialogueRunner`, `DialogueLine`, the adapters), UI and audio. No behaviour change.
- `StateInspector` and the `inspectorKey` option (default `null`, off): a panel that shows the game's memory live, lets you change flags, items and the whole state, jump to a room, save and load, and logs events. `game.inspector` holds it once opened.
- Tools: `tools/check-rooms.mjs` (checks room files), `tools/find-keys.mjs` (finds missing and unused text keys), `tools/dialogue/` (dialogue previewer) and `tools/animation/` (animation previewer). The package now includes them.

## 0.1.0 (2026-10-19)

First release. Everything below is new.

### Added
- P1 core: `EventBus`, `Scheduler` and `Timer` (`wait(ms, signal?)`), `GameLoop` (delta time, pause flag),
  `StateStore` (`get`, `set`, `watch`, `toJSON`, `fromJSON`), save helpers (`saveToSlot`, `loadFromSlot`,
  `deleteSlot`, `exportToFile`, `importFromFile`, `serialize`, `deserialize`) and `createCore()`.
- P2 scenes: `parseRoom` (room JSON format), `Camera` (scrolling, parallax offsets), `Fade`, `SceneManager`
  (`goTo`, `restore`, enter/exit hooks, `room:enter`/`room:exit` events) and p5 draw helpers
  (`drawBackground`, `drawForeground`, `drawFade`).
- P3 hotspots: `Hotspot`, `createHotspot`/`createHotspots`, providers (`polygon`, `colorMask`, `svg`), `HoverTracker`
  (`hover` event), `clientToLogical` pointer mapping and `drawDebugOverlay`. `examples/rooms` is the demo.
- P4 navigation and actors: `Navigator` (walkable areas minus obstacles, A* over a visibility graph, depth scale),
  `scaleFromStops`, `sortByBaseline`, `Actor` (`walkTo`, `say`, `face`, `stop`), `AnimationState` (idle/walk/talk,
  4 or 8 directions, mirrored flips), `I18n`. Room JSON gains `obstacles` and per-area `scale` stops.
- P5 interaction: `Inventory` (give/remove/combine recipes, saved in state), `Interactor` (per-object `onInteract`/`onLook`/`onUse`
  handlers, default responses, smart or verb mode, `setHotspotEnabled`), `applyHotspotState`, `PointerController`
  (mouse hover, tap-to-highlight on touch, long press and right-click to look), `InventoryBar`, `hoverLabel`,
  `drawHoverLabel`, `defaultStrings`. `examples/adventure` is the three-object puzzle demo.
- P6 scripting: `Scripts` registry (per-object `onInteract`/`onLook`/`onUse`/`onEnter`/`onEntered`/`onExit`, modules accepted),
  `Cutscenes` (input lock, `skip()`, `skip(label)` with `cs.label()`), `once`/`firstLook`/`firstInteract`/`firstUse`,
  skip button helpers. `Scheduler`, `Fade` and `Actor` gain `setSkipping(bool)` (fast-forward); `Actor.say` gains `literal`.
  `SceneManager` gains an `onEntered` hook and accepts a `Scripts`/`Map`; `Interactor` takes `cutscenes` and exposes `context()`.
- P7 dialogue: `DialogueRunner` interface (`next`, `choices`, `choose`, `vars`, `done`) with three adapters:
  `createMarkdownRunner` (small own format), `createTwineRunner` (Twee 3 and Twison, links and `<<set>>` only) and
  `createInkRunner` (wraps an inkjs `Story`: tags, external functions via `inkExternals`, `sync` variables with the state store).
  `DialogueSession`, `SubtitleBar` (typewriter, text speed, advance and skip) and `ChoiceMenu`. `Interactor` takes `dialogue`
  and is locked while one runs. `tools/compile-ink.mjs` compiles `.ink` to `.ink.json`. `inkjs` is a dev dependency only.
- P8 UI, input and audio: `fitLetterbox` and `LetterboxScaler` (letterboxed scaling with pointer mapping), `Settings`
  (text speed, subtitles, volumes; saved separately from save games) and `bindTextSettings`, `AudioManager`
  (music with crossfade, sfx, voice, volume buses, `attach` for room music, event sfx and dialogue `sfx` tags).
  Room JSON gains an optional `music` field. `Interactor` takes `audio` and passes it to handlers as `ctx.audio`.
  `tools/make-example-audio.mjs` generates the example sounds.
- P9 level editor (`tools/editor/`): a separate page that loads a room picture and exports the room JSON the runtime reads.
  Magic wand (flood select with tolerance, add/subtract), mask to marching squares to simplified polygon (holes in a floor
  become obstacles), polygon drawing, shape editing with undo/redo, hotspot ids and names, walk-to points, start positions,
  depth scale, problem checks, import/export, autosave and a Preview page that runs the room in the real engine.
  Room JSON gains `obstacles` documentation only (the runtime already read it). `tools/make-sample-room.mjs` writes the sample picture.
- P10 docs and release: MIT licence, [docs/reference.md](docs/reference.md) (room, hotspot, item, script, dialogue, state, event and
  save formats), and the complete example adventure `examples/lighthouse` (three rooms, a puzzle, an Ink conversation, a skippable
  ending), which `test/integration/lighthouse.test.js` plays through as an integration test.

### Fixed while building the example
- `createInkRunner` can be called again for the same `Story`: it detaches the previous runner, binds external functions only once,
  resets the story (`reset: false` to opt out) and then restores `sync` variables. Before, a second conversation threw
  "Function ... has already been bound", and an early `ResetState()` could overwrite saved variables. Runners now have `dispose()`.
- A missing or unregistered sound (for example a `# sfx:` tag with no matching sound) is now silent with one console warning, instead
  of throwing from inside an event and aborting the game flow.

### Added (simpler use, in the p5.js style)
- `createGame(options)`: one call sets up a whole game with defaults: canvas and scaling, input, rooms, hero, inventory bar,
  subtitles and choices, cutscenes, settings, sound, and a default `game.draw()` whose parts (`drawRoom`, `drawHero`,
  `drawSpeech`) can be replaced. Available as a global function in p5's global mode and as `p.createGame` in instance mode.
  Games advance with p5's frames (the addon's `predraw` hook). Methods: `on`, `start`, `goTo`, `say`, `talk`, `cutscene`,
  `flag`, `give` / `take` / `has`, `save` / `load`, `draw`, `hotspot`, `addRoom`.
- `Game` (the same without p5, for tests and logic modules) and `attachP5(game, p, options)`.
- `game.talk()` accepts Markdown, Twee, Twison, compiled Ink JSON, an inkjs `Story` or a runner; Ink variables are saved by default.
- Rooms can be given as URLs (fetched by `start()`), with pictures loaded relative to the room file. Items can be plain text.
- `color` on walkable areas, obstacles and hotspots is drawn by the default drawing.
- `dist/p5.clickery.min.js` (one `<script>` tag after p5; registers itself and exposes the library on `p5.clickery`),
  `dist/p5.clickery.js` and `dist/p5.clickery.esm.js`, built with esbuild by `tools/build.mjs`. `npm run build`, `npm run dev`
  (watch); the build also runs before `npm test` and in a git pre-commit hook, so `dist/` stays in step with `src/`.

### Changed
- The examples use `createGame` and the single script (the Lighthouse uses `Game` from modules; `core` and `rooms` show the
  parts on their own). The quick start runs by opening the file, with no server.
- Repository layout: every runnable page is in `examples/` (`quickstart`, `core`, `rooms`, `adventure`, `lighthouse`, with an index page
  and shared `assets/`); the old top-level pages and `demo/` folder are gone. Tests are grouped as `test/unit` (one file per `src/`
  folder), `test/tools`, `test/integration`, `test/release` and `test/fixtures`.
- `interactor.select(id)` throws `not carrying "<id>"` for an item the player does not have.
- Package metadata: `p5` is a peer dependency (`>=2.0.0 <3`) and a dev dependency; `inkjs` is a dev dependency only.
