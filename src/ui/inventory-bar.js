/**
 * The inventory strip along the bottom of the screen. Layout and hit-testing are plain screen
 * coordinates; only `draw()` uses p5. A slot shows the item's picture from `images[itemId]` when
 * there is one, otherwise the item's id as text. A game has one: `game.bar`.
 *
 * @param {Object} options
 * @param {number} options.viewWidth The screen width.
 * @param {number} options.viewHeight The screen height.
 * @param {number} [options.slot=40] The size of a slot.
 * @param {number} [options.gap=4] The space between slots.
 * @param {number} [options.margin=6] The space around the strip.
 */
export class InventoryBar {
  constructor({ viewWidth, viewHeight, slot = 40, gap = 4, margin = 6 }) {
    Object.assign(this, { viewWidth, viewHeight, slot, gap, margin });
  }

  /**
   * The y where the strip starts.
   * @type {number}
   */
  get top() {
    return this.viewHeight - this.slot - this.margin * 2;
  }

  /**
   * How many slots fit in the strip.
   * @type {number}
   */
  get perRow() {
    return Math.max(1, Math.floor((this.viewWidth - this.margin * 2 + this.gap) / (this.slot + this.gap)));
  }

  /**
   * The screen rectangle of slot `i`.
   * @param {number} i
   * @returns {{x: number, y: number, w: number, h: number}}
   */
  slotRect(i) {
    return { x: this.margin + i * (this.slot + this.gap), y: this.top + this.margin, w: this.slot, h: this.slot };
  }

  /**
   * Asks whether a screen point is on the strip, so clicks on it never fall through to the room.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  contains(x, y) {
    return y >= this.top && y <= this.viewHeight && x >= 0 && x <= this.viewWidth;
  }

  /**
   * Which item is at a screen point.
   * @param {number} x
   * @param {number} y
   * @param {string[]} items The ids of the items carried, in order.
   * @returns {string|null}
   */
  itemAt(x, y, items) {
    for (let i = 0; i < Math.min(items.length, this.perRow); i++) {
      const r = this.slotRect(i);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return items[i];
    }
    return null;
  }

  /**
   * Draws the strip, with the held item outlined. Browser only.
   * @param {Object} p The p5 sketch.
   * @param {string[]} items The ids of the items carried.
   * @param {string|null} [held] The item being held.
   * @param {Object<string, Object>} [images] Loaded p5 images by item id.
   */
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

/**
 * Draws a small label near the pointer, kept on screen: "Door", or "Use rope with Door" while
 * holding the rope. Browser only. See {@link hoverLabel} for the text.
 * @param {Object} p The p5 sketch.
 * @param {string|null} text Nothing is drawn for an empty label.
 * @param {number} x The pointer's screen x.
 * @param {number} y The pointer's screen y.
 */
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
