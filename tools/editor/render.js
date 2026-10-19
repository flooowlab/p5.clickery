// Drawing for the editor canvas (plain 2D canvas). All coordinates are image
// pixels; the view transform (zoom and pan) is applied here.
const COLORS = {
  hotspot: '255, 90, 90',
  walkable: '80, 170, 255',
  obstacle: '90, 220, 120',
};

export function screenToImage(view, x, y) {
  return { x: (x - view.x) / view.zoom, y: (y - view.y) / view.zoom };
}

export function fitView(view, canvasWidth, canvasHeight, imageWidth, imageHeight) {
  const zoom = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight) * 0.95;
  view.zoom = zoom;
  view.x = (canvasWidth - imageWidth * zoom) / 2;
  view.y = (canvasHeight - imageHeight * zoom) / 2;
}

// Builds a canvas that tints the selected pixels, redrawn only when the mask changes.
export function maskToCanvas(mask) {
  const canvas = Object.assign(document.createElement('canvas'), { width: mask.width, height: mask.height });
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i]) out.data.set([255, 60, 220, 120], i * 4);
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

function path(ctx, points, close = true) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

export function draw(ctx, ed) {
  const { view, model } = ed;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1b1d24';
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.x, view.y);
  const px = 1 / view.zoom; // one screen pixel in image units

  // the picture, or a flat colour when none is loaded
  if (ed.image) {
    ctx.imageSmoothingEnabled = view.zoom < 2;
    ctx.drawImage(ed.image, 0, 0);
  } else {
    ctx.fillStyle = model.room.color;
    ctx.fillRect(0, 0, model.room.width, model.room.height);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = px;
  ctx.strokeRect(0, 0, model.room.width, model.room.height);

  if (ed.maskCanvas) ctx.drawImage(ed.maskCanvas, 0, 0);

  const drawOrder = ['walkable', 'hotspot', 'obstacle'];
  for (const kind of drawOrder) {
    for (const shape of model.shapesOf(kind)) {
      const points = ed.dragOverride?.uid === shape.uid ? ed.dragOverride.points : shape.points;
      const selected = shape.uid === ed.selected;
      ctx.fillStyle = `rgba(${COLORS[kind]}, ${selected ? 0.32 : 0.18})`;
      ctx.strokeStyle = `rgba(${COLORS[kind]}, ${selected ? 1 : 0.8})`;
      ctx.lineWidth = (selected ? 2.5 : 1.5) * px;
      path(ctx, points);
      ctx.fill();
      ctx.stroke();
      const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
      const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
      ctx.fillStyle = '#fff';
      ctx.font = `${12 * px}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(shape.id, cx, cy);
      if (shape.walkTo) marker(ctx, shape.walkTo.x, shape.walkTo.y, px, '#ffd84a', '→');
      if (selected) {
        for (const [x, y] of points) {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = px;
          ctx.fillRect(x - 4 * px, y - 4 * px, 8 * px, 8 * px);
          ctx.strokeRect(x - 4 * px, y - 4 * px, 8 * px, 8 * px);
        }
      }
    }
  }

  for (const [name, s] of Object.entries(model.starts)) {
    marker(ctx, s.x, s.y, px, '#ffffff', '⚑');
    ctx.fillStyle = '#fff';
    ctx.font = `${11 * px}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(name, s.x + 8 * px, s.y - 8 * px);
  }

  if (ed.draft.length) {
    const pts = ed.hover ? [...ed.draft, [ed.hover.x, ed.hover.y]] : ed.draft;
    ctx.strokeStyle = `rgb(${COLORS[ed.kind]})`;
    ctx.lineWidth = 2 * px;
    ctx.setLineDash([6 * px, 4 * px]);
    path(ctx, pts, false);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of ed.draft) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 3.5 * px, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function marker(ctx, x, y, px, color, glyph) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = px;
  ctx.beginPath();
  ctx.arc(x, y, 6 * px, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.font = `${9 * px}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(glyph, x, y + 3 * px);
}
