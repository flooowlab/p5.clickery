// Finds the hotspot under a point and reports changes. The interaction layer
// (P5) listens for "hover" events: { id, hotspot } with id null when nothing is hit.
export class HoverTracker {
  hovered = null;

  constructor(events) {
    this.events = events;
    this.hotspots = [];
  }

  setHotspots(hotspots) {
    this.hotspots = hotspots;
    this.#set(null);
  }

  // Topmost hotspot at a room point: highest z wins, later entries beat earlier ones.
  at(x, y) {
    let best = null;
    for (const h of this.hotspots) {
      if (h.hit(x, y) && (best === null || h.z >= best.z)) best = h;
    }
    return best;
  }

  update(x, y) {
    const hit = this.at(x, y);
    this.#set(hit);
    return hit;
  }

  clear() {
    this.#set(null);
  }

  #set(hotspot) {
    if (hotspot === this.hovered) return;
    this.hovered = hotspot;
    this.events?.emit('hover', { id: hotspot?.id ?? null, hotspot });
  }
}
