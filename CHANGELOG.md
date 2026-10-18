# Changelog

## Unreleased

### Added
- P1 core: `EventBus`, `Scheduler` and `Timer` (`wait(ms, signal?)`), `GameLoop` (delta time, pause flag),
  `StateStore` (`get`, `set`, `watch`, `toJSON`, `fromJSON`), save helpers (`saveToSlot`, `loadFromSlot`,
  `deleteSlot`, `exportToFile`, `importFromFile`, `serialize`, `deserialize`) and `createCore()`.
