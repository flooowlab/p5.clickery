/**
 * The view onto a room that is larger than the screen. `x` and `y` are the room coordinate shown at
 * the top-left of the screen. A game's scene manager owns one: `game.scene.camera`, and it follows
 * the hero unless `followHero` is off.
 *
 * @example
 * const cam = game.scene.camera;
 * cam.centerOn(hero.x, hero.y);   // jump
 * cam.moveTo(200, 0);             // set the top-left corner (it never leaves the room)
 * p.rect(x - cam.x, y - cam.y, w, h); // drawing your own thing in room coordinates
 *
 * @param {number} viewWidth The screen width, in logical pixels.
 * @param {number} viewHeight The screen height.
 * @param {number} [roomWidth] The room width. Default: as wide as the screen.
 * @param {number} [roomHeight] The room height. Default: as tall as the screen.
 */
export class Camera {
  /** The room x shown at the left edge. @type {number} */
  x = 0;
  /** The room y shown at the top edge. @type {number} */
  y = 0;

  constructor(viewWidth, viewHeight, roomWidth = viewWidth, roomHeight = viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.setRoom(roomWidth, roomHeight);
  }

  /**
   * Tells the camera the size of the room it is looking at. The scene manager does this on every room change.
   * @param {number} roomWidth
   * @param {number} roomHeight
   */
  setRoom(roomWidth, roomHeight) {
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;
    this.moveTo(this.x, this.y);
  }

  /**
   * The furthest right the camera can be.
   * @type {number}
   */
  get maxX() {
    return Math.max(0, this.roomWidth - this.viewWidth);
  }

  /**
   * The furthest down the camera can be.
   * @type {number}
   */
  get maxY() {
    return Math.max(0, this.roomHeight - this.viewHeight);
  }

  /**
   * Puts the top-left of the view somewhere, kept inside the room.
   * @param {number} x
   * @param {number} y
   */
  moveTo(x, y) {
    this.x = clamp(x, 0, this.maxX);
    this.y = clamp(y, 0, this.maxY);
  }

  /**
   * Centres the view on a room point, usually the hero.
   * @param {number} x
   * @param {number} y
   */
  centerOn(x, y) {
    this.moveTo(x - this.viewWidth / 2, y - this.viewHeight / 2);
  }

  /**
   * Eases towards centring on a point. Call it every frame.
   * @param {number} x
   * @param {number} y
   * @param {number} dtMs Milliseconds since the last frame.
   * @param {number} [speed=5] The fraction of the distance closed per second.
   */
  follow(x, y, dtMs, speed = 5) {
    const t = 1 - Math.exp(-speed * dtMs / 1000);
    this.moveTo(this.x + (x - this.viewWidth / 2 - this.x) * t, this.y + (y - this.viewHeight / 2 - this.y) * t);
  }

  /**
   * Where a layer with a parallax factor is drawn on screen. `1` moves with the room, `0` stays fixed on the screen.
   * @param {number} [parallax=1]
   * @returns {{x: number, y: number}}
   */
  layerOffset(parallax = 1) {
    return { x: -this.x * parallax, y: -this.y * parallax };
  }

  /**
   * Converts a room position to a screen position.
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}}
   */
  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }

  /**
   * Converts a screen position to a room position.
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}}
   */
  screenToWorld(x, y) {
    return { x: x + this.x, y: y + this.y };
  }
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
