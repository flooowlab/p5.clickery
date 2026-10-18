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
