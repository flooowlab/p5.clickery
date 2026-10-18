export const VERSION = '0.0.1';

export * from './core/index.js';
export * from './scene/index.js';
export * from './hit/index.js';
export * from './nav/index.js';
export * from './actor/index.js';
export * from './interact/index.js';
export { InventoryBar, drawHoverLabel } from './ui/inventory-bar.js';
export { clientToLogical } from './ui/pointer.js';
export { drawDebugOverlay } from './debug/overlay.js';

// p5 addon: adds the p5.clickery namespace and createGameCanvas() to every sketch.
export function clickeryAddon(p5, fn) {
  p5.clickery = { version: VERSION };

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
