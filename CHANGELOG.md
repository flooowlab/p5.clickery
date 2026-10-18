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
