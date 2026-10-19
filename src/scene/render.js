// p5 drawing for rooms (browser only). `images` maps image names from the room
// JSON to loaded p5.Image objects: await loadImage() them in async setup().
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

export function drawBackground(p, room, camera, images = {}) {
  if (!room.background) {
    p.noStroke();
    p.fill(room.color);
    p.rect(-camera.x, -camera.y, room.width, room.height);
  }
  drawLayers(p, room, camera, images, 'bg');
}

export function drawForeground(p, room, camera, images = {}) {
  drawLayers(p, room, camera, images, 'fg');
}

// Black overlay for transitions. Draw last, in screen space.
export function drawFade(p, fade) {
  if (fade.alpha <= 0) return;
  p.noStroke();
  p.fill(0, 0, 0, fade.alpha * 255);
  p.rect(0, 0, p.width, p.height);
}
