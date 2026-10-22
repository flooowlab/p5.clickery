export const VERSION = '0.1.0';

export * from './core/index.js';
export * from './scene/index.js';
export * from './hit/index.js';
export * from './nav/index.js';
export * from './actor/index.js';
export * from './interact/index.js';
export * from './script/index.js';
export * from './dialogue/index.js';
export { fitLetterbox, LetterboxScaler } from './ui/scaling.js';
export * from './audio/index.js';
export { SubtitleBar } from './ui/subtitles.js';
export { ChoiceMenu } from './ui/choice-menu.js';
export { skipButtonRect, hitSkipButton, drawSkipButton } from './ui/skip-button.js';
export { InventoryBar, drawHoverLabel } from './ui/inventory-bar.js';
export { clientToLogical } from './ui/pointer.js';
export { drawDebugOverlay } from './debug/overlay.js';
export * from './game/index.js';

import { Game } from './game/game.js';
import { attachP5 } from './game/p5-binding.js';

// p5 addon: adds the p5.clickery namespace, createGameCanvas() and createGame() to every
// sketch (as global functions in global mode), and moves every game forward each frame.
export function clickeryAddon(p5, fn, lifecycles) {
  p5.clickery = { ...p5.clickery, version: VERSION };

  // Creates a whole game with sensible defaults, its canvas, input and drawing.
  // See GAME_DEFAULTS in src/game/game.js for the options.
  fn.createGame = function (options = {}) {
    return attachP5(new Game(options), this, options);
  };

  // Games advance in step with p5's own frames (so noLoop() pauses them too).
  if (lifecycles) {
    lifecycles.predraw = function () {
      for (const game of this._clickeryGames ?? []) game.update(this.deltaTime);
    };
  }

  // Canvas with a fixed logical size. Scaling it to the window is handled in P8.
  fn.createGameCanvas = function (width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(`createGameCanvas needs positive integer sizes, got ${width}x${height}`);
    }
    this.clickery = { ...this.clickery, logicalWidth: width, logicalHeight: height };
    return this.createCanvas(width, height);
  };
}

// Call once, before creating any p5 instance.
export function registerClickery(p5) {
  p5.registerAddon(clickeryAddon);
}
