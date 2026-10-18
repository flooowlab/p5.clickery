// Horizontal and vertical scrolling for rooms larger than the screen.
// x/y is the room coordinate shown at the top-left of the screen.
export class Camera {
  x = 0;
  y = 0;

  constructor(viewWidth, viewHeight, roomWidth = viewWidth, roomHeight = viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.setRoom(roomWidth, roomHeight);
  }

  setRoom(roomWidth, roomHeight) {
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;
    this.moveTo(this.x, this.y);
  }

  get maxX() {
    return Math.max(0, this.roomWidth - this.viewWidth);
  }

  get maxY() {
    return Math.max(0, this.roomHeight - this.viewHeight);
  }

  // Top-left of the view, clamped so the view never leaves the room.
  moveTo(x, y) {
    this.x = clamp(x, 0, this.maxX);
    this.y = clamp(y, 0, this.maxY);
  }

  // Centre the view on a room point (usually the hero).
  centerOn(x, y) {
    this.moveTo(x - this.viewWidth / 2, y - this.viewHeight / 2);
  }

  // Ease towards centring on a point; `speed` is the fraction closed per second.
  follow(x, y, dtMs, speed = 5) {
    const t = 1 - Math.exp(-speed * dtMs / 1000);
    this.moveTo(this.x + (x - this.viewWidth / 2 - this.x) * t, this.y + (y - this.viewHeight / 2 - this.y) * t);
  }

  // Where a layer with this parallax factor is drawn on screen.
  layerOffset(parallax = 1) {
    return { x: -this.x * parallax, y: -this.y * parallax };
  }

  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }

  screenToWorld(x, y) {
    return { x: x + this.x, y: y + this.y };
  }
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
