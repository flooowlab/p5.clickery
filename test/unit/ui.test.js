import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fitLetterbox, LetterboxScaler,
} from '../../src/index.js';

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

describe('fitLetterbox', () => {
  it('fills a window with the same shape exactly', () => {
    assert.deepEqual(fitLetterbox(1280, 720, 640, 360), { scale: 2, width: 1280, height: 720, offsetX: 0, offsetY: 0 });
  });

  it('pillarboxes a wide window: bars left and right', () => {
    const l = fitLetterbox(1600, 720, 640, 360);
    assert.equal(l.scale, 2);
    assert.deepEqual([l.offsetX, l.offsetY], [160, 0]);
  });

  it('letterboxes a phone held upright: bars top and bottom', () => {
    const l = fitLetterbox(360, 640, 640, 360);
    assert.equal(l.scale, 0.5625);
    assert.equal(l.width, 360);
    assert.equal(l.height, 202.5);
    assert.deepEqual([l.offsetX, l.offsetY], [0, 218.75]);
  });

  it('a phone held sideways uses the height', () => {
    const l = fitLetterbox(740, 360, 640, 360);
    assert.equal(l.scale, 1);
    assert.equal(l.offsetX, 50);
  });

  it('integer scaling rounds down once there is room for 1x, and maxScale caps it', () => {
    assert.equal(fitLetterbox(1000, 600, 320, 180, { integer: true }).scale, 3);
    assert.equal(fitLetterbox(200, 100, 320, 180, { integer: true }).scale, 100 / 180, 'smaller than 1x stays fractional');
    assert.equal(fitLetterbox(2000, 1200, 640, 360, { maxScale: 2 }).scale, 2);
  });

  it('an empty container gives a zero layout', () => {
    assert.deepEqual(fitLetterbox(0, 500, 640, 360), { scale: 0, width: 0, height: 0, offsetX: 0, offsetY: 0 });
  });
});

describe('LetterboxScaler', () => {
  const make = (cw, ch) => {
    const container = { clientWidth: cw, clientHeight: ch, style: {} };
    const canvas = {
      style: {},
      getBoundingClientRect() {
        return { left: parseFloat(this.style.left) + 10, top: parseFloat(this.style.top) + 20, width: parseFloat(this.style.width), height: parseFloat(this.style.height) };
      },
    };
    const scaler = new LetterboxScaler({ canvas, container, width: 640, height: 360 });
    return { container, canvas, scaler };
  };

  it('sizes and centres the canvas, and reports the layout', () => {
    const { canvas, scaler, container } = make(360, 640);
    let seen;
    scaler.onResize = (l) => { seen = l; };
    scaler.start();
    scaler.stop();
    assert.equal(canvas.style.width, '360px');
    assert.equal(canvas.style.height, '202.5px');
    assert.equal(canvas.style.top, '218.75px');
    assert.equal(canvas.style.position, 'absolute');
    assert.equal(container.style.position, 'relative');
    assert.equal(seen.scale, 0.5625);
  });

  it('follows a resized container', () => {
    const { container, canvas, scaler } = make(640, 360);
    scaler.update();
    assert.equal(canvas.style.width, '640px');
    container.clientWidth = 1280;
    container.clientHeight = 900;
    scaler.update();
    assert.equal(canvas.style.width, '1280px');
    assert.equal(canvas.style.top, '90px');
  });

  it('maps pointer positions back to logical coordinates, also on a scaled phone layout', () => {
    const { scaler, canvas } = make(360, 640);
    scaler.update();
    const rect = canvas.getBoundingClientRect();
    // the centre of the canvas on screen is the centre of the game
    const p = scaler.toLogical(rect.left + rect.width / 2, rect.top + rect.height / 2);
    assert.deepEqual([p.x, p.y], [320, 180]);
    const corner = scaler.toLogical(rect.left, rect.top);
    assert.deepEqual([corner.x, corner.y], [0, 0]);
    assert.ok(scaler.inside(p));
    assert.ok(!scaler.inside(scaler.toLogical(rect.left + 5, rect.top - 30)), 'the bar above the game is outside');
  });
});
