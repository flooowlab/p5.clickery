import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { clickeryAddon, registerClickery, VERSION } from '../../src/index.js';

describe('clickeryAddon', () => {
  it('exposes the namespace on the p5 constructor', () => {
    const p5 = {};
    clickeryAddon(p5, {});
    assert.equal(p5.clickery.version, VERSION);
  });

  it('adds createGameCanvas to the prototype', () => {
    const fn = {};
    clickeryAddon({}, fn);
    assert.equal(typeof fn.createGameCanvas, 'function');
  });

  it('creates the canvas at the logical size and stores it on the instance', () => {
    const fn = {};
    clickeryAddon({}, fn);
    const instance = { createCanvas: mock.fn(() => 'canvas-element') };
    const result = fn.createGameCanvas.call(instance, 640, 360);
    assert.deepEqual(instance.createCanvas.mock.calls[0].arguments, [640, 360]);
    assert.deepEqual(instance.clickery, { logicalWidth: 640, logicalHeight: 360 });
    assert.equal(result, 'canvas-element');
  });

  for (const [w, h] of [[0, 360], [640, -1], [640.5, 360], ['640', 360]]) {
    it(`rejects invalid size ${w} x ${h}`, () => {
      const fn = {};
      clickeryAddon({}, fn);
      const instance = { createCanvas: mock.fn() };
      assert.throws(() => fn.createGameCanvas.call(instance, w, h), RangeError);
      assert.equal(instance.createCanvas.mock.callCount(), 0);
    });
  }
});

describe('registerClickery', () => {
  it('registers the addon with p5', () => {
    const p5 = { registerAddon: mock.fn() };
    registerClickery(p5);
    assert.deepEqual(p5.registerAddon.mock.calls[0].arguments, [clickeryAddon]);
  });
});
