// Mouse and touch input in screen (logical canvas) coordinates. Feed it
// down/move/up from DOM pointer events. Behaviour:
//   mouse:  hover shows a label; click acts; right-click or long press looks.
//   touch:  first tap on a hotspot highlights it (shows its label), a second tap
//           acts; long press looks; tapping the floor walks at once.
// Taps on the inventory bar select, combine or (long press) look at items.
export class PointerController {
  highlighted = null; // touch: hotspot waiting for its second tap
  hoveredItem = null;
  pointer = null; // last screen position, for drawing the label
  #press = null;
  #timer = null;

  constructor({ interactor, hover, camera, bar, scheduler, longPressMs = 500, moveTolerance = 12 }) {
    Object.assign(this, { interactor, hover, camera, bar, scheduler, longPressMs, moveTolerance });
    this.onError = (err) => console.error(err);
  }

  move({ x, y }) {
    this.pointer = { x, y };
    if (this.#press && Math.hypot(x - this.#press.x, y - this.#press.y) > this.moveTolerance) this.#cancelPress();
    if (this.#press?.pointerType === 'touch') return;
    this.#updateHover(x, y);
  }

  leave() {
    this.pointer = null;
    this.hoveredItem = null;
    this.#cancelPress();
    this.hover.clear();
  }

  down({ x, y, pointerType = 'mouse', button = 0 }) {
    this.pointer = { x, y };
    this.#cancelPress();
    if (button === 2) { this.#run(this.#look(x, y)); return; }
    this.#press = { x, y, pointerType, consumed: false };
    const press = this.#press;
    this.#timer = this.scheduler.after(this.longPressMs, () => {
      press.consumed = true;
      this.#run(this.#look(x, y));
    });
  }

  up({ x, y } = this.#press ?? {}) {
    const press = this.#press;
    if (!press) return;
    this.#cancelPress();
    if (press.consumed) return;
    this.#run(this.#tap(x ?? press.x, y ?? press.y, press.pointerType));
  }

  // Pending cancel, e.g. when a cutscene starts or the pointer leaves.
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
