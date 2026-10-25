/**
 * The library's version.
 * @type {string}
 */
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
export { StateInspector } from './debug/inspector.js';
export * from './game/index.js';

import { Game } from './game/game.js';
import { attachP5 } from './game/p5-binding.js';

/**
 * The p5 addon: adds the `p5.clickery` namespace, `createGameCanvas()` and `createGame()` to every sketch
 * (as global functions in global mode), and moves every game forward each frame. The script tag
 * registers it for you; with modules, use {@link registerClickery}.
 * @param {Function} p5 The p5 class.
 * @param {Object} fn The p5 prototype functions are added to.
 * @param {Object} [lifecycles] p5's lifecycle hooks.
 */
export function clickeryAddon(p5, fn, lifecycles) {
  p5.clickery = { ...p5.clickery, version: VERSION };

  /**
   * Creates a whole game with sensible defaults: its canvas (scaled to fit the window), mouse,
   * touch and keyboard input, and drawing. A p5 function once p5.clickery is loaded, or
   * `p.createGame` in instance mode.
   *
   * @function createGame
   * @param {GameOptions} [options] See {@link GameOptions}. Everything has a default.
   * @returns {Game} The game. Call `game.start()` in `setup()` and `game.draw()` in `draw()`.
   * @example
   * let game;
   *
   * async function setup() {
   *   game = createGame({ rooms: [yard] });
   *   await game.start();
   * }
   *
   * function draw() {
   *   game.draw();
   * }
   */
  fn.createGame = function (options = {}) {
    return attachP5(new Game(options), this, options);
  };

  // Games advance in step with p5's own frames (so noLoop() pauses them too).
  if (lifecycles) {
    lifecycles.predraw = function () {
      for (const game of this._clickeryGames ?? []) {
        game.drawnByP5 = true; // from now on p5 drives the game (see src/game/setup-driver.js)
        game.update(this.deltaTime);
      }
    };
  }

  /**
   * A normal p5 canvas that also remembers its logical size. {@link createGame} calls it for you;
   * use it only when you build a game from the parts yourself.
   *
   * @function createGameCanvas
   * @param {number} width Whole number of pixels.
   * @param {number} height Whole number of pixels.
   * @returns {Object} The p5 renderer. Throws a `RangeError` for anything but positive whole numbers.
   */
  fn.createGameCanvas = function (width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(`createGameCanvas needs positive integer sizes, got ${width}x${height}`);
    }
    this.clickery = { ...this.clickery, logicalWidth: width, logicalHeight: height };
    return this.createCanvas(width, height);
  };
}

/**
 * Registers p5.clickery with p5. The script tag does this by itself; with ES modules call it
 * once, before `new p5(...)`.
 * @param {Function} p5 The p5 class.
 * @example
 * import { registerClickery } from './p5.clickery.esm.js';
 * registerClickery(p5);
 */
export function registerClickery(p5) {
  p5.registerAddon(clickeryAddon);
}
