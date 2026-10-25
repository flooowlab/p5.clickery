// p5 drawing for rooms (browser only). `images` maps image names from the room
// JSON to loaded p5.Image objects: await loadImage() them in async setup().
// A game's draw() does all of this; these are for drawing a room by hand.
function drawLayers(p, room, camera, images, depth) {
  const layers = room.layers.filter((l) => l.depth === depth);
  if (depth === 'bg' && room.background && images[room.background]) {
    p.image(images[room.background], -camera.x, -camera.y);
  }
  for (const layer of layers) {
    const img = images[layer.image];
    if (!img) continue;
    const { x, y } = camera.layerOffset(layer.parallax);
    p.image(img, x, y);
  }
}

/**
 * Draws a room's background (its colour or picture) and its `bg` layers. Draw your own things after it.
 * @param {Object} p The p5 sketch.
 * @param {Room} room
 * @param {Camera} camera
 * @param {Object<string, Object>} [images] Loaded p5 images by the names the room uses: `{ 'hall.png': img }`.
 * @example
 * drawBackground(p, scene.room, scene.camera, images);
 * // ...your objects and actors, drawn at (x - camera.x, y - camera.y)...
 * drawForeground(p, scene.room, scene.camera, images);
 * drawFade(p, scene.fade);
 */
export function drawBackground(p, room, camera, images = {}) {
  if (!room.background) {
    p.noStroke();
    p.fill(room.color);
    p.rect(-camera.x, -camera.y, room.width, room.height);
  }
  drawLayers(p, room, camera, images, 'bg');
}

/**
 * Draws a room's `fg` layers, in front of everything else.
 * @param {Object} p The p5 sketch.
 * @param {Room} room
 * @param {Camera} camera
 * @param {Object<string, Object>} [images] See {@link drawBackground}.
 */
export function drawForeground(p, room, camera, images = {}) {
  drawLayers(p, room, camera, images, 'fg');
}

/**
 * Draws the black overlay of a fade. Draw it last, in screen space.
 * @param {Object} p The p5 sketch.
 * @param {Fade} fade
 */
export function drawFade(p, fade) {
  if (fade.alpha <= 0) return;
  p.noStroke();
  p.fill(0, 0, 0, fade.alpha * 255);
  p.rect(0, 0, p.width, p.height);
}
