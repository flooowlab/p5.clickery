import { EventBus } from './events.js';
import { Scheduler } from './scheduler.js';
import { GameLoop } from './loop.js';
import { StateStore } from './state.js';
import { I18n } from './i18n.js';

export { EventBus, Scheduler, GameLoop, StateStore, I18n };
export { Timer } from './scheduler.js';
export * from './save.js';
export { Settings, bindTextSettings } from './settings.js';

/**
 * Wires the core pieces together: one event bus, one scheduler, one state store, one text table
 * and one game loop. {@link createGame} does this for you; call it to build a game from the parts.
 *
 * @param {Object} [loopOptions] Passed to the {@link GameLoop}.
 * @returns {{events: EventBus, scheduler: Scheduler, state: StateStore, i18n: I18n, loop: GameLoop}}
 * @example
 * const core = createCore();
 * core.state.set('flags.started', true);
 * core.loop.start();
 */
export function createCore(loopOptions = {}) {
  const events = new EventBus();
  const scheduler = new Scheduler();
  const state = new StateStore();
  const i18n = new I18n();
  const loop = new GameLoop({ scheduler, events, ...loopOptions });
  return { events, scheduler, state, i18n, loop };
}
