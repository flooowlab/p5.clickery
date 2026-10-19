# Changelog

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

### Changed
- Repository layout: every runnable page is in `examples/` (`quickstart`, `core`, `rooms`, `adventure`, `lighthouse`, with an index page
  and shared `assets/`); the old top-level pages and `demo/` folder are gone. Tests are grouped as `test/unit` (one file per `src/`
  folder), `test/tools`, `test/integration`, `test/release` and `test/fixtures`.
- `interactor.select(id)` throws `not carrying "<id>"` for an item the player does not have.
- Package metadata: `p5` is a peer dependency (`>=2.0.0 <3`) and a dev dependency; `inkjs` is a dev dependency only.
