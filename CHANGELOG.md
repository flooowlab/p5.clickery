# Changelog

## Unreleased

### Added
- P1 core: `EventBus`, `Scheduler` and `Timer` (`wait(ms, signal?)`), `GameLoop` (delta time, pause flag),
  `StateStore` (`get`, `set`, `watch`, `toJSON`, `fromJSON`), save helpers (`saveToSlot`, `loadFromSlot`,
  `deleteSlot`, `exportToFile`, `importFromFile`, `serialize`, `deserialize`) and `createCore()`.
- P2 scenes: `parseRoom` (room JSON format), `Camera` (scrolling, parallax offsets), `Fade`, `SceneManager`
  (`goTo`, `restore`, enter/exit hooks, `room:enter`/`room:exit` events) and p5 draw helpers
  (`drawBackground`, `drawForeground`, `drawFade`).
- P3 hotspots: `Hotspot`, `createHotspot`/`createHotspots`, providers (`polygon`, `colorMask`, `svg`), `HoverTracker`
  (`hover` event), `clientToLogical` pointer mapping and `drawDebugOverlay`. `rooms.html` is the demo.
- P4 navigation and actors: `Navigator` (walkable areas minus obstacles, A* over a visibility graph, depth scale),
  `scaleFromStops`, `sortByBaseline`, `Actor` (`walkTo`, `say`, `face`, `stop`), `AnimationState` (idle/walk/talk,
  4 or 8 directions, mirrored flips), `I18n`. Room JSON gains `obstacles` and per-area `scale` stops.
- P5 interaction: `Inventory` (give/remove/combine recipes, saved in state), `Interactor` (per-object `onInteract`/`onLook`/`onUse`
  handlers, default responses, smart or verb mode, `setHotspotEnabled`), `applyHotspotState`, `PointerController`
  (mouse hover, tap-to-highlight on touch, long press and right-click to look), `InventoryBar`, `hoverLabel`,
  `drawHoverLabel`, `defaultStrings`. `adventure.html` is the three-object puzzle demo.
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
  `tools/make-demo-audio.mjs` generates the demo sounds.
