/**
 * Finds the hotspot under a point and reports when it changes. The `hover` event carries
 * `{ id, hotspot }`, with `id` `null` when nothing is under the pointer. A game has one: `game.hover`;
 * its pointer controller calls `update` for you.
 *
 * @example
 * game.events.on('hover', ({ id }) => console.log('over', id));
 *
 * @param {EventBus} [events] Where `hover` events are sent.
 */
export class HoverTracker {
  /** The hotspot under the pointer, or `null`. @type {Hotspot|null} */
  hovered = null;

  constructor(events) {
    this.events = events;
    /** The hotspots of the current room. @type {Hotspot[]} */
    this.hotspots = [];
  }

  /**
   * Sets the hotspots to look through, usually on a room change. Clears the hover.
   * @param {Hotspot[]} hotspots
   */
  setHotspots(hotspots) {
    this.hotspots = hotspots;
    this.#set(null);
  }

  /**
   * Looks at a point without changing the hover. When hotspots overlap the highest `z` wins, and a later one beats an earlier one.
   * @param {number} x A room x.
   * @param {number} y A room y.
   * @returns {Hotspot|null}
   */
  at(x, y) {
    let best = null;
    for (const h of this.hotspots) {
      if (h.hit(x, y) && (best === null || h.z >= best.z)) best = h;
    }
    return best;
  }

  /**
   * Moves the pointer: finds the hotspot there and sends a `hover` event if it changed.
   * @param {number} x A room x.
   * @param {number} y A room y.
   * @returns {Hotspot|null}
   */
  update(x, y) {
    const hit = this.at(x, y);
    this.#set(hit);
    return hit;
  }

  /**
   * Forgets the hover, for example when the pointer leaves the game.
   */
  clear() {
    this.#set(null);
  }

  #set(hotspot) {
    if (hotspot === this.hovered) return;
    this.hovered = hotspot;
    this.events?.emit('hover', { id: hotspot?.id ?? null, hotspot });
  }
}
