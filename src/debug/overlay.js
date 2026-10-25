/**
 * Draws the debug outlines in room space: walkable areas (blue), obstacles (green) and hotspots (red;
 * yellow when hovered), with the hovered hotspot's id. Draw it after the scene; the camera offset is
 * applied here. A game draws it when `game.debug` is on (the D key). Browser only.
 * @param {Object} p The p5 sketch.
 * @param {Object} scene
 * @param {Hotspot[]} [scene.hotspots]
 * @param {Room} [scene.room]
 * @param {Camera} scene.camera
 * @param {Hotspot|null} [scene.hovered]
 */
export function drawDebugOverlay(p, { hotspots = [], room = null, camera, hovered = null }) {
  p.push();
  p.translate(-camera.x, -camera.y);
  p.strokeWeight(2);
  p.textSize(11);
  p.noFill();

  if (room) {
    p.stroke(80, 200, 255, 200);
    for (const area of room.walkable) {
      p.beginShape();
      for (const [x, y] of area.points) p.vertex(x, y);
      p.endShape(p.CLOSE);
    }
    p.stroke(120, 255, 120, 200);
    for (const o of room.obstacles) {
      p.beginShape();
      for (const [x, y] of o.points) p.vertex(x, y);
      p.endShape(p.CLOSE);
    }
  }

  for (const h of hotspots) {
    const hot = h === hovered;
    p.stroke(hot ? p.color(255, 255, 0) : p.color(255, 80, 80, 220));
    p.fill(255, 80, 80, hot ? 70 : 25);
    p.drawingContext.save();
    h.provider.debugDraw?.(p);
    p.drawingContext.restore();
  }
  p.pop();

  p.noStroke();
  p.fill(255, 255, 0);
  p.text(hovered ? `hover: ${hovered.id} (${hovered.provider.kind})` : 'hover: -', 6, p.height - 8);
}
