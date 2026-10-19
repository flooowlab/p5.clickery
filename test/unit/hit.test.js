import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EventBus, Hotspot, HoverTracker, createHotspot, createHotspots, parseRoom,
  pointInPolygon, parseColor, parseSvgPaths, clientToLogical,
} from '../../src/index.js';

// One room, one shape: a 100x100 box. The same shape is described three ways.
const W = 400;
const H = 300;
const BOX = [[100, 100], [200, 100], [200, 200], [100, 200]];
const insideBox = (x, y) => x > 100 && x < 200 && y > 100 && y < 200;

const maskPixels = (w, h, shape, scale = 1) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!shape((px + 0.5) / scale, (py + 0.5) / scale)) continue;
      data.set([255, 0, 0, 255], (py * w + px) * 4);
    }
  }
  return { data, width: w, height: h };
};

// Path2D / canvas stand-ins that understand "M x y L x y ... Z" only.
class FakePath2D {
  constructor(d) {
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    this.points = [];
    for (let i = 0; i < nums.length; i += 2) this.points.push([nums[i], nums[i + 1]]);
  }
}
const fakeCtx = { isPointInPath: (path, x, y) => pointInPolygon(path.points, x, y) };

const room = parseRoom({ id: 'r', width: W, height: H, starts: { default: { x: 0, y: 0 } } });
const SVG_TEXT = `<svg><path id="box" inkscape:label="crate" d="M100 100 L200 100 L200 200 L100 200 Z"/>
  <path d='M0 0 L5 5 L0 5 Z' id='other'/></svg>`;

const providers = {
  polygon: () => createHotspot({ id: 'box', provider: 'polygon', points: BOX }, {}, room),
  colorMask: () => createHotspot(
    { id: 'box', provider: 'colorMask', mask: 'm.png', color: '#ff0000' },
    { pixels: () => maskPixels(W, H, insideBox) }, room,
  ),
  svg: () => createHotspot(
    { id: 'box', provider: 'svg', svg: 'r.svg' },
    { text: () => SVG_TEXT, Path2D: FakePath2D, ctx: fakeCtx }, room,
  ),
};

describe('providers on the same room', () => {
  const points = [];
  for (let y = 0.5; y < H; y += 7) for (let x = 0.5; x < W; x += 7) points.push([x, y]);

  for (const [name, make] of Object.entries(providers)) {
    it(`${name} agrees with the shape at ${points.length} points`, () => {
      const h = make();
      assert.ok(h instanceof Hotspot);
      const wrong = points.filter(([x, y]) => h.hit(x, y) !== insideBox(x, y));
      assert.deepEqual(wrong, []);
    });
  }

  it('all three give identical answers to each other', () => {
    const [a, b, c] = Object.values(providers).map((make) => make());
    for (const [x, y] of points) {
      assert.equal(a.hit(x, y), b.hit(x, y));
      assert.equal(b.hit(x, y), c.hit(x, y));
    }
  });

  it('a colorMask at half resolution still maps room coordinates', () => {
    const h = createHotspot(
      { id: 'box', provider: 'colorMask', mask: 'm', color: '#ff0000' },
      { pixels: () => maskPixels(W / 2, H / 2, insideBox, 0.5) }, room,
    );
    assert.equal(h.hit(150, 150), true);
    assert.equal(h.hit(50, 50), false);
    assert.equal(h.hit(250, 150), false);
  });
});

describe('Hotspot', () => {
  it('disabled hotspots never hit; name defaults to the id', () => {
    const h = providers.polygon();
    assert.equal(h.name, 'box');
    h.enabled = false;
    assert.equal(h.hit(150, 150), false);
  });

  it('rejects unknown providers and missing assets', () => {
    assert.throws(() => createHotspot({ id: 'x', provider: 'magic' }), /unknown provider/);
    assert.throws(() => createHotspot({ id: 'x', provider: 'colorMask', color: '#f00' }), /assets.pixels/);
    assert.throws(() => createHotspot({ id: 'x', provider: 'svg', svg: 'f' }, { text: () => SVG_TEXT, Path2D: FakePath2D }), /no path "x"/);
    assert.throws(() => createHotspot({ id: 'x', provider: 'polygon', points: [[0, 0]] }), RangeError);
  });

  it('svg paths can be addressed by id, Inkscape label, or inline d', () => {
    const asset = { text: () => SVG_TEXT, Path2D: FakePath2D, ctx: fakeCtx };
    const byLabel = createHotspot({ id: 'x', provider: 'svg', svg: 'f', pathId: 'crate' }, asset);
    assert.equal(byLabel.hit(150, 150), true);
    const inline = createHotspot({ id: 'y', provider: 'svg', d: 'M0 0 L10 0 L10 10 Z' }, asset);
    assert.equal(inline.hit(8, 2), true);
    assert.equal(inline.hit(2, 8), false);
  });

  it('createHotspots builds every hotspot in a parsed room', () => {
    const r = parseRoom({
      id: 'r', width: W, height: H, starts: { default: { x: 0, y: 0 } },
      hotspots: [{ id: 'a', provider: 'polygon', points: BOX }, { id: 'b', provider: 'polygon', points: BOX, z: 2 }],
    });
    assert.deepEqual(createHotspots(r, {}).map((h) => h.id), ['a', 'b']);
  });
});

describe('helpers', () => {
  it('parseColor accepts 3 and 6 digit hex and rejects junk', () => {
    assert.deepEqual(parseColor('#ff8000'), [255, 128, 0]);
    assert.deepEqual(parseColor('f80'), [255, 136, 0]);
    assert.throws(() => parseColor('red'), TypeError);
  });

  it('colorMask tolerance and transparent pixels', () => {
    const data = new Uint8ClampedArray([250, 3, 0, 255, 255, 0, 0, 0]);
    const make = (tolerance) => createHotspot(
      { id: 'm', provider: 'colorMask', mask: 'm', color: '#ff0000', tolerance },
      { pixels: () => ({ data, width: 2, height: 1 }) },
    );
    assert.equal(make(4).hit(0.5, 0.5), false);
    assert.equal(make(5).hit(0.5, 0.5), true);
    assert.equal(make(5).hit(1.5, 0.5), false);
    assert.equal(make(5).hit(-1, 0), false);
    assert.equal(make(5).hit(2, 0), false);
  });

  it('parseSvgPaths keys by id and inkscape:label', () => {
    const paths = parseSvgPaths(SVG_TEXT);
    assert.equal(paths.box, paths.crate);
    assert.equal(paths.other, 'M0 0 L5 5 L0 5 Z');
  });

  it('clientToLogical undoes CSS scaling', () => {
    const rect = { left: 10, top: 20, width: 320, height: 180 };
    assert.deepEqual(clientToLogical(170, 110, rect, 640, 360), { x: 320, y: 180 });
    assert.deepEqual(clientToLogical(0, 0, { left: 0, top: 0, width: 0, height: 0 }, 640, 360), { x: 0, y: 0 });
  });
});

describe('HoverTracker', () => {
  const tri = (id, z) => createHotspot({ id, provider: 'polygon', points: BOX, z });

  it('reports the hovered id once per change', () => {
    const events = new EventBus();
    const seen = [];
    events.on('hover', (e) => seen.push(e.id));
    const hover = new HoverTracker(events);
    hover.setHotspots([tri('a', 0)]);
    hover.update(150, 150);
    hover.update(160, 160);
    hover.update(0, 0);
    hover.update(1, 1);
    assert.deepEqual(seen, ['a', null]);
  });

  it('highest z wins, then the later entry; disabled ones are skipped', () => {
    const hover = new HoverTracker();
    const [a, b, c] = [tri('a', 1), tri('b', 1), tri('c', 0)];
    hover.setHotspots([a, b, c]);
    assert.equal(hover.at(150, 150).id, 'b');
    b.enabled = false;
    assert.equal(hover.at(150, 150).id, 'a');
    a.enabled = false;
    assert.equal(hover.at(150, 150).id, 'c');
    c.enabled = false;
    assert.equal(hover.at(150, 150), null);
  });

  it('changing hotspots clears the hover', () => {
    const events = new EventBus();
    const seen = [];
    events.on('hover', (e) => seen.push(e.id));
    const hover = new HoverTracker(events);
    hover.setHotspots([tri('a', 0)]);
    hover.update(150, 150);
    hover.setHotspots([]);
    assert.deepEqual(seen, ['a', null]);
  });
});
