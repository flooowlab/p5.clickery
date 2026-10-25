import { LetterboxScaler } from '../ui/scaling.js';
import { clientToLogical } from '../ui/pointer.js';
import { drawBackground, drawForeground, drawFade } from '../scene/render.js';
import { drawAnimation } from '../actor/animation.js';
import { sortByBaseline } from '../nav/depth.js';
import { hoverLabel } from '../interact/label.js';
import { drawHoverLabel } from '../ui/inventory-bar.js';
import { hitSkipButton, drawSkipButton } from '../ui/skip-button.js';
import { drawDebugOverlay } from '../debug/overlay.js';
import { StateInspector } from '../debug/inspector.js';
import { driveUntilDrawing } from './setup-driver.js';

/**
 * Connects a game to a p5 sketch: the canvas, fitting it to the page, mouse, touch and keys, loading
 * pictures, and `game.draw()`. {@link createGame} does this for you; call it to attach a game made with
 * `new Game(options)` to a sketch later.
 * @param {Game} game
 * @param {Object} p The p5 sketch.
 * @param {Object} [options]
 * @param {boolean} [options.canvas=true] Create the canvas. `false` uses one you made.
 * @param {HTMLElement|string} [options.parent] An element, or its id, to put the canvas in.
 * @param {boolean} [options.fit=true] Scale to the page or the parent with letterbox bars.
 * @returns {Game} The same game.
 */
export function attachP5(game, p, { canvas = true, parent = null, fit = true } = {}) {
  const { width, height } = game.options;
  game.p = p;
  const renderer = canvas ? p.createGameCanvas(width, height) : null;
  const el = renderer?.elt ?? p.canvas ?? p._renderer?.elt;
  if (parent && el) {
    const node = typeof parent === 'string' ? el.ownerDocument.getElementById(parent) : parent;
    if (!node) throw new Error(`no element with id "${parent}" to put the game in`);
    node.appendChild(el);
  }
  if (fit && el) game.scaler = new LetterboxScaler({ canvas: el, container: prepareContainer(el, width, height), width, height }).start();
  if (el) bindInput(game, el);
  game.audio?.unlockOnGesture(globalThis.window ?? globalThis);

  game.loadAssets = () => loadImages(game, p);
  /**
   * Draws everything: the room, the hero, subtitles, choices, the inventory bar, hover label and
   * fades. Call it in `draw()`. Added to the game by {@link createGame}.
   * @function Game#draw
   * @example
   * function draw() {
   *   game.draw();
   * }
   */
  game.draw = () => drawGame(game, p);
  /**
   * Draws the room's floors, obstacles and hotspots in room coordinates. Replace it to draw your own
   * art; the default is {@link drawRoomShapes}, so a replacement can call it and add to it.
   * @function Game#drawRoom
   * @param {Object} p The p5 sketch.
   * @param {Object} room The current room.
   * @param {Game} game
   * @example
   * game.drawRoom = (p, room, game) => {
   *   p.background(30, 40, 60);
   *   p5.clickery.drawRoomShapes(p, room, game);
   * };
   */
  game.drawRoom ??= drawRoomShapes;
  /**
   * Draws the hero, feet at `(hero.x, hero.y)`. Replace it to draw your own character; the default is {@link drawHeroDefault}.
   * @function Game#drawHero
   * @param {Object} p The p5 sketch.
   * @param {Actor} hero
   * @param {Game} game
   */
  game.drawHero ??= drawHeroDefault;
  /**
   * Draws the line the hero is saying, while there is one. The default is {@link drawSpeechDefault}.
   * @function Game#drawSpeech
   * @param {Object} p The p5 sketch.
   * @param {Actor} hero
   * @param {Game} game
   */
  game.drawSpeech ??= drawSpeechDefault;

  (p._clickeryGames ??= new Set()).add(game);
  driveUntilDrawing(game); // so an async setup() can await a cutscene: see setup-driver.js
  return game;
}

// The canvas fills its parent. When the parent is the page itself, the page is made
// full-window; a parent with no height gets the game's shape.
function prepareContainer(el, width, height) {
  const parent = el.parentElement;
  const doc = el.ownerDocument;
  const isPage = parent === doc.body || (parent.tagName === 'MAIN' && parent.parentElement === doc.body);
  if (isPage) {
    for (const node of [doc.documentElement, doc.body]) Object.assign(node.style, { height: '100%', margin: '0' });
    doc.body.style.overflow = 'hidden';
    doc.body.style.background ||= '#000';
    if (parent !== doc.body) Object.assign(parent.style, { width: '100%', height: '100%' });
  } else if (parent.clientHeight === 0) {
    Object.assign(parent.style, { width: '100%', aspectRatio: `${width} / ${height}` });
  }
  el.style.touchAction = 'none';
  return parent;
}

function bindInput(game, el) {
  const { width, height, debugKey, inspectorKey } = game.options;
  const { pointer, menu, subtitles, dialogue, cutscenes, scene } = game;
  const at = (e) => (game.scaler ? game.scaler.toLogical(e.clientX, e.clientY)
    : clientToLogical(e.clientX, e.clientY, el.getBoundingClientRect(), width, height));

  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointermove', (e) => {
    const pt = at(e);
    if (menu.open) menu.move(pt.x, pt.y);
    pointer.move(pt);
  });
  el.addEventListener('pointerleave', () => pointer.leave());
  el.addEventListener('pointerdown', (e) => {
    const pt = at(e);
    if (dialogue.active) {
      if (menu.open) menu.click(pt.x, pt.y);
      else subtitles.advance();
      return;
    }
    if (cutscenes.active) {
      if (hitSkipButton(pt.x, pt.y, width)) cutscenes.skip();
      return;
    }
    if (!scene.busy) pointer.down({ ...pt, pointerType: e.pointerType, button: e.button });
  });
  el.addEventListener('pointerup', (e) => pointer.up(at(e)));
  el.addEventListener('pointercancel', () => pointer.cancel());

  el.ownerDocument.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape') { cutscenes.skip(); subtitles.skip(); }
    else if (/^[1-9]$/.test(e.key) && menu.open) menu.pick(Number(e.key) - 1);
    else if (debugKey && e.key.toLowerCase() === debugKey.toLowerCase()) game.debug = !game.debug;
    else if (inspectorKey && e.key.toLowerCase() === inspectorKey.toLowerCase()) {
      game.inspector ??= new StateInspector(game, { document: el.ownerDocument });
      game.inspector.toggle();
    }
  });
}

// Room pictures load relative to the room's file (or the page), item pictures relative to the page.
async function loadImages(game, p) {
  const base = globalThis.document?.baseURI;
  const load = async (name, relativeTo) => {
    try { return await p.loadImage(new URL(name, relativeTo ?? base).href); } catch {
      console.warn(`could not load the picture "${name}"`);
      return null;
    }
  };
  for (const [id, room] of game.rooms) {
    const names = [room.background, ...(room.layers ?? []).map((l) => l.image)].filter(Boolean);
    const images = game.images.get(id) ?? {};
    for (const name of names) images[name] ??= await load(name, game.roomURLs.get(id));
    game.images.set(id, images);
    await loadHotspotFiles(game, id, room, load);
  }
  for (const [id, item] of Object.entries(game.inventory.items)) {
    if (item.image && !game.itemImages[id]) game.itemImages[id] = await load(item.image);
  }
}

// colorMask hotspots need their mask picture's pixels (read once, here, never per frame) and svg
// hotspots with a file need its text. Both load relative to the room file, like its pictures.
async function loadHotspotFiles(game, roomId, room, load) {
  for (const def of room.hotspots ?? []) {
    if (def.provider === 'colorMask' && def.mask && !game.hotspotFiles.has(`${roomId}:${def.mask}`)) {
      const img = await load(def.mask, game.roomURLs.get(roomId));
      if (!img) continue;
      img.loadPixels();
      game.hotspotFiles.set(`${roomId}:${def.mask}`, { pixels: { data: img.pixels, width: img.width, height: img.height } });
    } else if (def.provider === 'svg' && def.svg && !def.d && !game.hotspotFiles.has(`${roomId}:${def.svg}`)) {
      try {
        const url = new URL(def.svg, game.roomURLs.get(roomId) ?? globalThis.document?.baseURI).href;
        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));
        game.hotspotFiles.set(`${roomId}:${def.svg}`, { text: await response.text() });
      } catch (err) {
        console.warn(`could not load the svg file "${def.svg}": ${err.message}`);
      }
    }
  }
}

function drawGame(game, p) {
  const room = game.room;
  p.push();
  p.background(room?.color ?? 0);
  if (room) {
    const cam = game.scene.camera;
    const images = game.images.get(room.id) ?? {};
    drawBackground(p, room, cam, images);
    p.push();
    p.translate(-cam.x, -cam.y); // the parts below draw in room coordinates
    game.drawRoom(p, room, game);
    const actors = [{ baseline: game.hero.baseline, draw: () => game.drawHero(p, game.hero, game) }, ...(game.actors ?? [])];
    for (const a of sortByBaseline(actors)) { p.push(); a.draw(p); p.pop(); }
    if (game.hero.speech) game.drawSpeech(p, game.hero, game);
    p.pop();
    drawForeground(p, room, cam, images);
  }
  p.push(); game.subtitles.draw(p); p.pop();
  p.push(); game.menu.draw(p); p.pop();
  p.push(); game.bar.draw(p, game.inventory.list, game.interactor.held, game.itemImages); p.pop();
  if (game.cutscenes.active) { p.push(); drawSkipButton(p, game.options.width); p.pop(); }
  const { pointer } = game;
  if (pointer.pointer && !game.dialogue.active && !game.cutscenes.active) {
    const label = hoverLabel({
      hotspot: pointer.highlighted ?? game.hover.hovered, item: pointer.hoveredItem, held: game.interactor.held,
      inventory: game.inventory, mode: game.interactor.mode, verb: game.interactor.verb, t: (k, v) => game.i18n.t(k, v),
    });
    p.push(); drawHoverLabel(p, label, pointer.pointer.x, pointer.pointer.y); p.pop();
  }
  if (game.debug && room) drawDebugOverlay(p, { hotspots: game.hover.hotspots, room, camera: game.scene.camera, hovered: game.hover.hovered });
  drawFade(p, game.scene.fade);
  p.pop();
}

/**
 * The default room drawing: every walkable area, obstacle and enabled hotspot that has a `color` is
 * filled with it, which is handy before there is any art. Switched-off hotspots are not drawn. Replace
 * `game.drawRoom` to draw your own, and call this inside it to keep the shapes.
 * @param {Object} p The p5 sketch.
 * @param {Room} room
 * @param {Game} game
 */
export function drawRoomShapes(p, room, game) {
  p.noStroke();
  const shapes = [...room.walkable, ...room.obstacles, ...room.hotspots.filter((h) => game.hotspot(h.id)?.enabled !== false)];
  for (const shape of shapes) {
    if (!shape.color || !shape.points) continue;
    p.fill(shape.color);
    p.beginShape();
    for (const [x, y] of shape.points) p.vertex(x, y);
    p.endShape(p.CLOSE);
  }
}

/**
 * The default hero: its animation if it has one, otherwise a simple figure. Feet at `(hero.x, hero.y)`.
 * Replace `game.drawHero` to draw your own.
 * @param {Object} p The p5 sketch.
 * @param {Actor} hero
 */
export function drawHeroDefault(p, hero) {
  if (drawAnimation(p, hero.anim, hero.x, hero.y, hero.scale)) return;
  const s = hero.scale;
  p.noStroke();
  p.fill(240, 120, 90);
  p.rect(hero.x - 14 * s, hero.y - 70 * s, 28 * s, 70 * s, 6 * s);
  p.fill(255);
  const eye = hero.dir.includes('left') ? -9 : hero.dir.includes('right') ? 3 : -3;
  p.rect(hero.x + eye * s, hero.y - 62 * s, 6 * s, 6 * s);
}

/**
 * The default speech: the line above the hero's head, kept on screen. Replace `game.drawSpeech` to draw your own.
 * @param {Object} p The p5 sketch.
 * @param {Actor} hero
 * @param {Game} game
 */
export function drawSpeechDefault(p, hero, game) {
  const { width } = game.options;
  const cam = game.scene.camera;
  const s = hero.scale;
  const x = Math.min(Math.max(hero.x, cam.x + 160), cam.x + width - 160);
  const y = hero.y - 78 * s;
  p.textSize(16);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.noStroke();
  p.fill(0);
  p.text(hero.speech.text, x - 150 + 1, y - 80 + 1, 300, 80);
  p.fill(255, 240, 160);
  p.text(hero.speech.text, x - 150, y - 80, 300, 80);
}
