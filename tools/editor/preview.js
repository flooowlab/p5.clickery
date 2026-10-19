// Runs a room exported by the editor in the real engine: the same JSON the game
// loads. The room comes from the editor (localStorage) or from ?room=<url>&image=<url>.
import {
  registerClickery, createCore, SceneManager, HoverTracker, createHotspots, Navigator, Actor, Inventory, Interactor,
  PointerController, InventoryBar, LetterboxScaler, hoverLabel, defaultStrings, drawBackground, drawFade, drawDebugOverlay,
  drawHoverLabel,
} from '../../src/index.js';

registerClickery(p5);
const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);

async function source() {
  if (query.get('room')) {
    return { room: await (await fetch(query.get('room'))).json(), imageURL: query.get('image'), imageName: null };
  }
  const saved = JSON.parse(localStorage.getItem('p5.clickery.editor.preview') ?? 'null');
  if (!saved) throw new Error('Nothing to preview. Press Preview in the editor.');
  return saved;
}

const { room: roomJson, imageURL } = await source().catch((err) => {
  document.body.insertAdjacentHTML('afterbegin', `<div id="error">${err.message}</div>`);
  throw err;
});
const W = roomJson.width;
const H = roomJson.height;

const core = createCore();
// Hotspot names are text keys; for the preview each key simply shows its hotspot's id.
core.i18n.add('en', { ...defaultStrings, ...Object.fromEntries(roomJson.hotspots.map((h) => [h.name ?? h.id, h.id])) });

const scene = new SceneManager({ ...core, viewWidth: W, viewHeight: H, loadRoom: async () => roomJson, fadeMs: 0 });
const hero = new Actor({ id: 'hero', speed: 150, directions: 4, translate: (k) => core.i18n.t(k) });
const hover = new HoverTracker(core.events);
const inventory = new Inventory({ state: core.state, events: core.events, items: {} });
const interactor = new Interactor({ hero, state: core.state, events: core.events, inventory, hover });
const bar = new InventoryBar({ viewWidth: W, viewHeight: H });
const pointer = new PointerController({ interactor, hover, camera: scene.camera, bar, scheduler: core.scheduler });

core.events.on('room:enter', ({ room, start }) => {
  hover.setHotspots(createHotspots(room));
  hero.navigator = Navigator.fromRoom(room);
  hero.teleport(room.starts[start].x, room.starts[start].y);
  if (room.starts[start].dir) hero.face(room.starts[start].dir);
});
core.events.on('update', (dt) => hero.update(dt));
core.loop.start();
await scene.goTo(roomJson.id);

let debug = true;
const images = {};

new p5((p) => {
  p.setup = async () => {
    const canvas = p.createGameCanvas(W, H);
    if (imageURL && roomJson.background) images[roomJson.background] = await p.loadImage(imageURL);
    const scaler = new LetterboxScaler({ canvas: canvas.elt, container: $('stage'), width: W, height: H }).start();
    const at = (e) => scaler.toLogical(e.clientX, e.clientY);
    const el = canvas.elt;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointermove', (e) => pointer.move(at(e)));
    el.addEventListener('pointerleave', () => pointer.leave());
    el.addEventListener('pointerdown', (e) => pointer.down({ ...at(e), pointerType: e.pointerType, button: e.button }));
    el.addEventListener('pointerup', (e) => pointer.up(at(e)));
    window.preview = { core, scene, hero, hover, interactor, pointer, scaler, room: roomJson };
  };

  p.keyPressed = () => { if (p.key === 'd' || p.key === 'D') debug = !debug; };

  p.draw = () => {
    const r = scene.room;
    if (!r) return;
    drawBackground(p, r, scene.camera, images);
    const s = hero.scale;
    p.noStroke();
    p.fill(240, 120, 90);
    p.rect(hero.x - 14 * s, hero.y - 70 * s, 28 * s, 70 * s, 6);
    if (hero.speech) {
      p.fill(255, 240, 160);
      p.textSize(16);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(hero.speech.text, Math.min(Math.max(hero.x, 120), W - 120), hero.y - 80 * s);
    }
    if (debug) drawDebugOverlay(p, { hotspots: hover.hotspots, room: r, camera: scene.camera, hovered: hover.hovered });
    const label = hoverLabel({ hotspot: pointer.highlighted ?? hover.hovered, held: null, inventory, t: (k, v) => core.i18n.t(k, v) });
    if (pointer.pointer) drawHoverLabel(p, label, pointer.pointer.x, pointer.pointer.y);
    drawFade(p, scene.fade);
    $('info').textContent = `hero ${Math.round(hero.x)}, ${Math.round(hero.y)}  scale ${hero.scale.toFixed(2)}`;
  };
}, $('stage'));
