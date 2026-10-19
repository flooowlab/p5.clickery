import { DIRECTIONS } from './model.js';

// The side panel: room settings, the shape list, an inspector for the selected
// shape, the start positions and the list of problems. It is redrawn from the
// model whenever something changes; edits go back through the model, so every
// rule (valid ids, undo) is enforced in one place.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dirOptions = (current) => DIRECTIONS.map((d) => `<option${d === current ? ' selected' : ''}>${d}</option>`).join('');

export function renderPanel(root, ed) {
  const { model } = ed;
  const sel = model.shape(ed.selected);
  const kinds = { walkable: 'Walkable areas', obstacle: 'Obstacles (holes in the floor)', hotspot: 'Hotspots' };

  const list = Object.entries(kinds).map(([kind, title]) => `
    <h3>${title}</h3>
    <ul class="shapes">
      ${model.shapesOf(kind).map((s) => `<li data-select="${s.uid}" class="${s.uid === ed.selected ? 'on' : ''} ${kind}">
        <span>${esc(s.id)}</span><button data-delete="${s.uid}" title="Delete">×</button></li>`).join('') || '<li class="empty">none yet</li>'}
    </ul>`).join('');

  let inspector = '<p class="hint">Select a shape (Select tool) to edit it.</p>';
  if (sel) {
    inspector = `<h3>${esc(sel.kind)} "${esc(sel.id)}"</h3>
      <label>id <input data-field="id" value="${esc(sel.id)}"></label>`;
    if (sel.kind === 'hotspot') {
      inspector += `
        <label>name key <input data-field="name" value="${esc(sel.name ?? '')}" placeholder="obj.${esc(sel.id)}"></label>
        <label>z (higher is on top) <input data-field="z" type="number" value="${sel.z}"></label>
        <label>walk-to <span class="mono">${sel.walkTo ? `${sel.walkTo.x}, ${sel.walkTo.y}` : 'not set (use the Walk-to tool)'}</span></label>
        <label>facing <select data-field="walkToDir">${dirOptions(sel.walkTo?.dir ?? 'up')}</select></label>
        <button data-action="clear-walkto"${sel.walkTo ? '' : ' disabled'}>Clear walk-to</button>`;
    }
    if (sel.kind === 'walkable') {
      const [far, near] = sel.scale ?? [[0, 1], [0, 1]];
      inspector += `
        <p class="hint">Depth scale: the hero is drawn smaller further up the screen.</p>
        <label>far: y <input data-field="scaleFarY" type="number" value="${far[0]}"> scale <input data-field="scaleFarS" type="number" step="0.05" value="${far[1]}"></label>
        <label>near: y <input data-field="scaleNearY" type="number" value="${near[0]}"> scale <input data-field="scaleNearS" type="number" step="0.05" value="${near[1]}"></label>
        <button data-action="clear-scale"${sel.scale ? '' : ' disabled'}>No scaling</button>`;
    }
    inspector += `<p class="hint mono">${sel.points.length} points</p>`;
  }

  const starts = Object.entries(model.starts).map(([name, s]) => `
    <li><span>${esc(name)} <span class="mono">${s.x}, ${s.y} ${esc(s.dir)}</span></span><button data-delete-start="${esc(name)}" title="Delete">×</button></li>`).join('') || '<li class="empty">none yet</li>';

  const problems = model.problems().map((p) => `<li class="${p.level}">${esc(p.message)}</li>`).join('') || '<li class="ok">No problems found.</li>';

  root.innerHTML = `
    <h3>Room</h3>
    <label>id <input data-room="id" value="${esc(model.room.id)}"></label>
    <label>music <input data-room="music" value="${esc(model.room.music ?? '')}" placeholder="sound id (optional)"></label>
    <p class="hint mono">${model.room.width} × ${model.room.height}${model.room.background ? ` · ${esc(model.room.background)}` : ''}</p>
    ${list}
    <h3>Inspector</h3>
    ${inspector}
    <h3>Start positions</h3>
    <ul class="shapes starts">${starts}</ul>
    <h3>Check</h3>
    <ul class="problems">${problems}</ul>`;
}

// Wires the panel's events once. `act` is the controller: it carries out edits and reports errors.
export function bindPanel(root, ed, act) {
  root.addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete]');
    if (del) return act(() => ed.model.removeShape(Number(del.dataset.delete)));
    const delStart = e.target.closest('[data-delete-start]');
    if (delStart) return act(() => ed.model.removeStart(delStart.dataset.deleteStart));
    const pick = e.target.closest('[data-select]');
    if (pick) return act(() => { ed.selected = Number(pick.dataset.select); }, { redrawOnly: true });
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'clear-walkto') return act(() => ed.model.updateShape(ed.selected, { walkTo: null }));
    if (action === 'clear-scale') return act(() => ed.model.updateShape(ed.selected, { scale: null }));
    return undefined;
  });

  root.addEventListener('change', (e) => {
    const t = e.target;
    const sel = ed.model.shape(ed.selected);
    if (t.dataset.room) {
      const value = t.dataset.room === 'music' ? (t.value.trim() === '' ? undefined : t.value.trim()) : t.value.trim();
      return act(() => ed.model.setRoom({ [t.dataset.room]: value }));
    }
    const field = t.dataset.field;
    if (!field || !sel) return undefined;
    const num = (name) => Number(root.querySelector(`[data-field="${name}"]`).value);
    return act(() => {
      if (field === 'id') ed.model.updateShape(sel.uid, { id: t.value.trim() });
      else if (field === 'name') ed.model.updateShape(sel.uid, { name: t.value.trim() || null });
      else if (field === 'z') ed.model.updateShape(sel.uid, { z: Number(t.value) });
      else if (field === 'walkToDir' && sel.walkTo) ed.model.updateShape(sel.uid, { walkTo: { ...sel.walkTo, dir: t.value } });
      else if (field.startsWith('scale')) {
        ed.model.updateShape(sel.uid, { scale: [[num('scaleFarY'), num('scaleFarS')], [num('scaleNearY'), num('scaleNearS')]] });
      }
    });
  });
}
