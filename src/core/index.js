import { EventBus } from './events.js';
import { Scheduler } from './scheduler.js';
import { GameLoop } from './loop.js';
import { StateStore } from './state.js';
import { I18n } from './i18n.js';

export { EventBus, Scheduler, GameLoop, StateStore, I18n };
export { Timer } from './scheduler.js';
export * from './save.js';

// Wires the core pieces together: one bus, one scheduler, one store, one loop.
export function createCore(loopOptions = {}) {
  const events = new EventBus();
  const scheduler = new Scheduler();
  const state = new StateStore();
  const i18n = new I18n();
  const loop = new GameLoop({ scheduler, events, ...loopOptions });
  return { events, scheduler, state, i18n, loop };
}
