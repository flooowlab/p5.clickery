/**
 * Mouse and touch input in screen (logical canvas) coordinates. Feed it `move`, `down` and `up` from
 * browser pointer events ({@link createGame} does). With a mouse, hovering shows a label, a click acts, and a
 * right-click or long press looks. With touch, the first tap on a hotspot highlights it (shows its label), a
 * second tap acts, a long press looks, and tapping the floor walks at once. Taps on the inventory bar select,
 * combine or (long press) look at items. A game has one: `game.pointer`.
 *
 * @param {Object} options
 * @param {Interactor} options.interactor
 * @param {HoverTracker} options.hover
 * @param {Camera} options.camera
 * @param {InventoryBar} options.bar
 * @param {Scheduler} options.scheduler Times the long press.
 * @param {number} [options.longPressMs=500]
 * @param {number} [options.moveTolerance=12] How far the pointer may move during a press, in pixels.
 */
export class PointerController {
  /**
   * Touch: the hotspot waiting for its second tap.
   * @type {Hotspot|null}
   */
  highlighted = null; // touch: hotspot waiting for its second tap
  /**
   * The inventory item under the pointer.
   * @type {string|null}
   */
  hoveredItem = null;
  /**
   * The last screen position, for drawing the label.
   * @type {{x: number, y: number}|null}
   */
  pointer = null; // last screen position, for drawing the label
  #press = null;
  #timer = null;

  constructor({ interactor, hover, camera, bar, scheduler, longPressMs = 500, moveTolerance = 12 }) {
    Object.assign(this, { interactor, hover, camera, bar, scheduler, longPressMs, moveTolerance });
    this.onError = (err) => console.error(err);
  }

  /**
   * The pointer moved.
   * @param {{x: number, y: number}} position In screen (logical canvas) coordinates.
   */
  move({ x, y }) {
    this.pointer = { x, y };
    if (this.#press && Math.hypot(x - this.#press.x, y - this.#press.y) > this.moveTolerance) this.#cancelPress();
    if (this.#press?.pointerType === 'touch') return;
    this.#updateHover(x, y);
  }

  /**
   * The pointer left the game.
   */
  leave() {
    this.pointer = null;
    this.hoveredItem = null;
    this.#cancelPress();
    this.hover.clear();
  }

  /**
   * A press began.
   * @param {Object} event
   * @param {number} event.x
   * @param {number} event.y
   * @param {string} [event.pointerType='mouse'] `'mouse'`, `'touch'` or `'pen'`.
   * @param {number} [event.button=0] `2` is a right-click, which looks.
   */
  down({ x, y, pointerType = 'mouse', button = 0 }) {
    this.pointer = { x, y };
    this.#cancelPress();
    if (this.interactor.locked) return; // cutscene
    if (button === 2) { this.#run(this.#look(x, y)); return; }
    this.#press = { x, y, pointerType, consumed: false };
    const press = this.#press;
    this.#timer = this.scheduler.after(this.longPressMs, () => {
      press.consumed = true;
      this.#run(this.#look(x, y));
    });
  }

  /**
   * The press ended; a short press is a click or tap.
   * @param {{x: number, y: number}} [position]
   */
  up({ x, y } = this.#press ?? {}) {
    const press = this.#press;
    if (!press) return;
    this.#cancelPress();
    if (press.consumed) return;
    this.#run(this.#tap(x ?? press.x, y ?? press.y, press.pointerType));
  }

  /**
   * Cancels a pending press, for example when a cutscene starts.
   */
  cancel() {
    this.#cancelPress();
    this.highlighted = null;
  }

  // ---- internals ----

  #cancelPress() {
    this.#timer?.cancel();
    this.#timer = null;
    this.#press = null;
  }

  #run(promise) {
    promise?.catch?.((err) => this.onError(err));
  }

  #worldAt(x, y) {
    return this.camera.screenToWorld(x, y);
  }

  #updateHover(x, y) {
    const item = this.bar.contains(x, y) ? this.bar.itemAt(x, y, this.interactor.inventory.list) : null;
    this.hoveredItem = item;
    if (this.bar.contains(x, y)) { this.hover.clear(); return; }
    const w = this.#worldAt(x, y);
    this.hover.update(w.x, w.y);
  }

  #look(x, y) {
    if (this.bar.contains(x, y)) {
      const item = this.bar.itemAt(x, y, this.interactor.inventory.list);
      return item ? this.interactor.lookItem(item) : null;
    }
    const world = this.#worldAt(x, y);
    const hit = this.hover.update(world.x, world.y);
    return hit ? this.interactor.lookHotspot(hit) : null;
  }

  #tap(x, y, pointerType) {
    if (this.bar.contains(x, y)) {
      this.highlighted = null;
      const item = this.bar.itemAt(x, y, this.interactor.inventory.list);
      return item ? this.interactor.clickItem(item) : null;
    }
    const world = this.#worldAt(x, y);
    const hit = this.hover.update(world.x, world.y);
    if (!hit) {
      this.highlighted = null;
      return this.interactor.clickGround(world);
    }
    if (pointerType === 'touch' && this.highlighted !== hit) {
      this.highlighted = hit;
      return null;
    }
    this.highlighted = null;
    return this.interactor.clickHotspot(hit);
  }
}
