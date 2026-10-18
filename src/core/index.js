import { EventBus } from './events.js';
import { Scheduler } from './scheduler.js';
import { GameLoop } from './loop.js';
import { StateStore } from './state.js';

export { EventBus, Scheduler, GameLoop, StateStore };
export { Timer } from './scheduler.js';
export * from './save.js';

// Wires the core pieces together: one bus, one scheduler, one store, one loop.
export function createCore(loopOptions = {}) {
  const events = new EventBus();
  const scheduler = new Scheduler();
  const state = new StateStore();
  const loop = new GameLoop({ scheduler, events, ...loopOptions });
  return { events, scheduler, state, loop };
}
