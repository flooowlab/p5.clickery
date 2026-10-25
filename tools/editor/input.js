import { pointInPolygon } from '../../src/hit/providers.js';
import { screenToImage } from './render.js';
import { signedArea } from './simplify.js';

// Mouse, wheel and keyboard handling for the editor canvas. `c` is the controller
// from editor.js: the editor state plus the actions the input can trigger.
export function bindInput(c) {
  const { ed, canvas, $, status, act, render, refresh, setTool, fit, wandSelect, createFromMask, finishPolygon, clearMask, openExport } = c;

  // ---- hit testing ----

  const vertexAt = (shape, x, y, radius) => shape.points.findIndex(([px, py]) => Math.hypot(px - x, py - y) <= radius);

  function shapeAt(x, y) {
    const inside = ed.model.shapes.filter((s) => pointInPolygon(s.points, x, y));
    return inside.sort((a, b) => Math.abs(signedArea(a.points)) - Math.abs(signedArea(b.points)))[0] ?? null;
  }

  function edgeAt(shape, x, y, radius) {
    const pts = shape.points;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2));
      if (Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) <= radius) return i + 1;
    }
    return -1;
  }

  // ---- pointer input ----

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  let pan = null;
  canvas.addEventListener('pointerdown', (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not an active pointer (synthetic event): fine */ }
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    if (e.button === 1 || e.button === 2 || (e.button === 0 && ed.spaceDown)) {
      pan = { sx, sy, vx: ed.view.x, vy: ed.view.y };
      return;
    }
    if (e.button !== 0) return;
    const p = screenToImage(ed.view, sx, sy);
    const radius = 8 / ed.view.zoom;

    if (ed.tool === 'polygon') {
      const first = ed.draft[0];
      if (first && ed.draft.length >= 3 && Math.hypot(first[0] - p.x, first[1] - p.y) <= radius) finishPolygon();
      else ed.draft.push([p.x, p.y]);
      render();
    } else if (ed.tool === 'wand') {
      wandSelect(p.x, p.y, { add: e.shiftKey, subtract: e.altKey, everywhere: e.ctrlKey || e.metaKey });
    } else if (ed.tool === 'start') {
      const name = $('start-name').value.trim() || 'default';
      act(() => ed.model.setStart(name, p.x, p.y, $('dir').value));
    } else if (ed.tool === 'walkto') {
      const sel = ed.model.shape(ed.selected);
      if (sel?.kind !== 'hotspot') status('Select a hotspot first (Select tool).', true);
      else act(() => ed.model.updateShape(sel.uid, { walkTo: { x: p.x, y: p.y, dir: $('dir').value } }));
    } else {
      const sel = ed.model.shape(ed.selected);
      const v = sel ? vertexAt(sel, p.x, p.y, radius) : -1;
      if (sel && v !== -1 && e.altKey) {
        act(() => ed.model.removePoint(sel.uid, v));
      } else if (sel && v !== -1) {
        ed.drag = { uid: sel.uid, vertex: v, start: p, points: sel.points.map((q) => [...q]) };
      } else {
        const hit = shapeAt(p.x, p.y);
        ed.selected = hit?.uid ?? null;
        if (hit) ed.drag = { uid: hit.uid, vertex: -1, start: p, points: hit.points.map((q) => [...q]) };
        refresh();
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const p = screenToImage(ed.view, sx, sy);
    ed.hover = p;
    if (pan) {
      ed.view.x = pan.vx + (sx - pan.sx);
      ed.view.y = pan.vy + (sy - pan.sy);
    } else if (ed.drag) {
      const { uid, vertex, start, points } = ed.drag;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      ed.dragOverride = { uid, points: vertex === -1 ? points.map(([x, y]) => [x + dx, y + dy]) : points.map((q, i) => (i === vertex ? [q[0] + dx, q[1] + dy] : q)) };
    }
    const near = Math.round(p.x) >= 0 && Math.round(p.y) >= 0;
    if (near && !ed.drag && !pan) status(`${Math.round(p.x)}, ${Math.round(p.y)}`);
    render();
  });

  function endPointer() {
    pan = null;
    if (ed.drag && ed.dragOverride) {
      const { uid, points } = ed.dragOverride;
      const moved = points.some(([x, y], i) => Math.abs(x - ed.drag.points[i][0]) > 0.5 || Math.abs(y - ed.drag.points[i][1]) > 0.5);
      ed.drag = null;
      ed.dragOverride = null;
      if (moved) act(() => ed.model.setPoints(uid, points));
      refresh();
      return;
    }
    ed.drag = null;
    ed.dragOverride = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('dblclick', (e) => {
    const r = canvas.getBoundingClientRect();
    const p = screenToImage(ed.view, e.clientX - r.left, e.clientY - r.top);
    if (ed.tool === 'polygon') {
      ed.draft.pop(); // the double-click added the last corner twice
      finishPolygon();
    } else if (ed.tool === 'select') {
      const sel = ed.model.shape(ed.selected);
      const at = sel ? edgeAt(sel, p.x, p.y, 6 / ed.view.zoom) : -1;
      if (at !== -1) act(() => ed.model.insertPoint(sel.uid, at, p.x, p.y));
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const before = screenToImage(ed.view, sx, sy);
    ed.view.zoom = Math.min(40, Math.max(0.1, ed.view.zoom * Math.exp(-e.deltaY * 0.0015)));
    ed.view.x = sx - before.x * ed.view.zoom;
    ed.view.y = sy - before.y * ed.view.zoom;
    render();
  }, { passive: false });

  // ---- keyboard ----

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === ' ') { ed.spaceDown = true; e.preventDefault(); return; }
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); ed.model.undo(); return; }
    if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); ed.model.redo(); return; }
    if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); openExport(); return; }
    const tools = { v: 'select', p: 'polygon', w: 'wand', s: 'start', t: 'walkto' };
    if (!ctrl && tools[e.key.toLowerCase()]) return setTool(tools[e.key.toLowerCase()]);
    if (e.key.toLowerCase() === 'f') return fit();
    if (e.key === 'Enter') return ed.tool === 'polygon' ? finishPolygon() : createFromMask();
    if (e.key === 'Escape') { ed.draft = []; clearMask(); ed.selected = null; return refresh(); }
    if (e.key === 'Backspace' && ed.draft.length) { ed.draft.pop(); return render(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && ed.selected !== null) return act(() => { ed.model.removeShape(ed.selected); ed.selected = null; });
    return undefined;
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') ed.spaceDown = false; });

}
