// Inventory strip along the bottom of the screen. Layout and hit-testing are
// pure (screen coordinates); draw() uses p5. Slots show item images from
// `images[itemId]` when given, otherwise the item id as text.
export class InventoryBar {
  constructor({ viewWidth, viewHeight, slot = 40, gap = 4, margin = 6 }) {
    Object.assign(this, { viewWidth, viewHeight, slot, gap, margin });
  }

  get top() {
    return this.viewHeight - this.slot - this.margin * 2;
  }

  get perRow() {
    return Math.max(1, Math.floor((this.viewWidth - this.margin * 2 + this.gap) / (this.slot + this.gap)));
  }

  // Top-left of slot i.
  slotRect(i) {
    return { x: this.margin + i * (this.slot + this.gap), y: this.top + this.margin, w: this.slot, h: this.slot };
  }

  // The bar's whole strip, so clicks on it never fall through to the room.
  contains(x, y) {
    return y >= this.top && y <= this.viewHeight && x >= 0 && x <= this.viewWidth;
  }

  // Item id under a screen point, or null.
  itemAt(x, y, items) {
    for (let i = 0; i < Math.min(items.length, this.perRow); i++) {
      const r = this.slotRect(i);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return items[i];
    }
    return null;
  }

  draw(p, items, held = null, images = {}) {
    p.noStroke();
    p.fill(0, 0, 0, 150);
    p.rect(0, this.top, this.viewWidth, this.viewHeight - this.top);
    items.slice(0, this.perRow).forEach((id, i) => {
      const r = this.slotRect(i);
      p.stroke(id === held ? p.color(255, 220, 80) : p.color(120));
      p.strokeWeight(id === held ? 3 : 1);
      p.fill(30, 30, 40);
      p.rect(r.x, r.y, r.w, r.h, 4);
      p.noStroke();
      if (images[id]) p.image(images[id], r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      else { p.fill(230); p.textSize(10); p.textAlign(p.CENTER, p.CENTER); p.text(id, r.x + r.w / 2, r.y + r.h / 2); }
    });
  }
}

// Text near the pointer, kept on screen. Browser only.
export function drawHoverLabel(p, text, x, y) {
  if (!text) return;
  p.textSize(14);
  p.textAlign(p.LEFT, p.TOP);
  const w = p.textWidth(text) + 12;
  const lx = Math.min(Math.max(x + 12, 2), p.width - w - 2);
  const ly = Math.max(y - 28, 2);
  p.noStroke();
  p.fill(0, 0, 0, 190);
  p.rect(lx, ly, w, 22, 4);
  p.fill(255);
  p.text(text, lx + 6, ly + 4);
}
