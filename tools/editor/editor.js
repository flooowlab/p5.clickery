import { EditorModel, createShapesFromMask, DIRECTIONS } from './model.js';
import { floodSelect, unionMask, subtractMask, maskCount } from './select.js';
import { draw, fitView, maskToCanvas } from './render.js';
import { renderPanel, bindPanel } from './panel.js';
import { bindInput } from './input.js';

// The room editor page. State lives in `ed`; the document is ed.model.
const AUTOSAVE = 'p5.clickery.editor.autosave';
const PREVIEW = 'p5.clickery.editor.preview';
const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

const ed = {
  model: new EditorModel({ id: 'room', width: 640, height: 360, color: '#2d3a55' }),
  image: null, imageData: null, imageURL: null,
  tool: 'select', kind: 'hotspot', tolerance: 24, epsilon: 1.5,
  view: { zoom: 1, x: 0, y: 0 },
  draft: [], hover: null, selected: null, drag: null, dragOverride: null,
  mask: null, maskCanvas: null, wand: null,
};
let unsubscribe = () => {};

// ---- helpers ----

function status(text, isError = false) {
  const el = $('status');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

// Runs an edit; shows a model error (bad id and so on) in the status bar instead of crashing.
function act(fn, { redrawOnly = false } = {}) {
  try {
    fn();
    status('');
  } catch (err) {
    status(err.message, true);
  }
  if (redrawOnly) refresh();
}

function refresh() {
  renderPanel($('side'), ed);
  $('undo').disabled = !ed.model.canUndo;
  $('redo').disabled = !ed.model.canRedo;
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.tool === ed.tool);
  render();
}

function render() {
  draw(ctx, ed);
}

function resize() {
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width));
  canvas.height = Math.max(1, Math.round(r.height));
  render();
}

function fit() {
  fitView(ed.view, canvas.width, canvas.height, ed.model.room.width, ed.model.room.height);
  render();
}

function attachModel(model) {
  unsubscribe();
  ed.model = model;
  ed.selected = null;
  ed.draft = [];
  clearMask();
  unsubscribe = model.onChange(() => { autosave(); refresh(); });
  refresh();
}

function setTool(tool) {
  ed.tool = tool;
  ed.draft = [];
  status(HINTS[tool]);
  refresh();
}

const HINTS = {
  select: 'Select: click a shape. Drag corners or the inside. Alt-click a corner deletes it. Double-click an edge adds a corner.',
  polygon: 'Polygon: click corners; double-click or Enter finishes; Esc cancels; Backspace removes the last corner.',
  wand: 'Wand: click a coloured area. Shift adds, Alt subtracts, Ctrl = that colour everywhere. Enter creates the shape.',
  start: 'Start: click where the hero should appear. The name is in the toolbar.',
  walkto: 'Walk-to: select a hotspot first, then click where the hero should stand.',
};

// ---- loading and saving ----

function loadImage(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      ed.image = img;
      ed.imageData = cx.getImageData(0, 0, c.width, c.height);
      ed.imageURL = url;
      const m = ed.model;
      if (m.shapes.length === 0 || m.room.width !== c.width || m.room.height !== c.height) {
        attachModel(new EditorModel({ id: name.replace(/\.[^.]+$/, '').replace(/[^\w-]/g, '_') || 'room', width: c.width, height: c.height, background: name }));
      } else {
        m.setRoom({ background: name });
      }
      fit();
      status(`Loaded ${name} (${c.width} × ${c.height}).`);
      resolve();
    };
    img.onerror = () => { status(`Could not load ${name}`, true); reject(new Error('image failed')); };
    img.src = url;
  });
}

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE, JSON.stringify({ room: ed.model.toRoomJSON(), imageName: ed.model.room.background, imageURL: ed.imageURL }));
    } catch { /* storage full or blocked: autosave is a convenience only */ }
  }, 300);
}

async function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTOSAVE) ?? 'null');
    if (!saved) return false;
    if (saved.imageURL) await loadImage(saved.imageURL, saved.imageName ?? 'room.png');
    attachModel(EditorModel.fromRoomJSON(saved.room));
    fit();
    status('Restored your last session.');
    return true;
  } catch { return false; }
}

function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

const roomText = () => JSON.stringify(ed.model.toRoomJSON(), null, 2);

// ---- wand ----

function clearMask() {
  ed.mask = null;
  ed.maskCanvas = null;
  ed.wand = null;
}

// A click with the wand. Shift adds to the selection, Alt subtracts, Ctrl selects the colour everywhere.
function wandSelect(x, y, { add = false, subtract = false, everywhere = false } = {}) {
  if (!ed.imageData) return status('Open an image first.', true);
  ed.wand = { x, y, add, subtract, everywhere, base: add || subtract ? ed.mask : null };
  return applyWand();
}

// (Re)computes the selection from the last click: also used when the tolerance changes.
function applyWand() {
  const { x, y, add, subtract, everywhere, base } = ed.wand;
  const picked = floodSelect(ed.imageData, x, y, ed.tolerance, { contiguous: !everywhere });
  ed.mask = base ? (subtract && !add ? subtractMask(base, picked) : unionMask(base, picked)) : picked;
  ed.maskCanvas = maskToCanvas(ed.mask);
  status(`${maskCount(ed.mask)} pixels selected. Press Enter to create a ${ed.kind}.`);
  render();
  return undefined;
}

function createFromMask() {
  if (!ed.mask || maskCount(ed.mask) === 0) return status('Nothing selected: use the Wand first.', true);
  const made = createShapesFromMask(ed.model, ed.mask, ed.kind, { epsilon: ed.epsilon });
  clearMask();
  if (made.length === 0) return status('The selection was too small to make a shape.', true);
  ed.selected = made[0].uid;
  refresh();
  status(`Created ${made.length} shape${made.length === 1 ? '' : 's'}. Name them in the panel.`);
  return undefined;
}

function finishPolygon() {
  if (ed.draft.length < 3) return status('A polygon needs at least 3 corners.', true);
  const points = ed.draft;
  ed.draft = [];
  act(() => { ed.selected = ed.model.addShape(ed.kind, points).uid; });
  refresh();
  return undefined;
}

// ---- toolbar ----

for (const b of document.querySelectorAll('.tool')) b.addEventListener('click', () => setTool(b.dataset.tool));
$('kind').addEventListener('change', (e) => { ed.kind = e.target.value; });
$('tol').addEventListener('input', (e) => {
  ed.tolerance = Number(e.target.value);
  $('tol-v').textContent = ed.tolerance;
  if (ed.wand) applyWand(); // re-run the last click with the new tolerance
});
$('eps').addEventListener('input', (e) => { ed.epsilon = Number(e.target.value); $('eps-v').textContent = ed.epsilon; });
$('dir').innerHTML = DIRECTIONS.map((d) => `<option${d === 'down' ? ' selected' : ''}>${d}</option>`).join('');
$('create').addEventListener('click', createFromMask);
$('undo').addEventListener('click', () => ed.model.undo());
$('redo').addEventListener('click', () => ed.model.redo());
$('fit').addEventListener('click', fit);

$('open').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadImage(await readAsDataURL(file), file.name);
  e.target.value = '';
});
$('sample').addEventListener('click', async () => {
  const blob = await (await fetch('sample-room.png')).blob();
  await loadImage(await readAsDataURL(blob), 'sample-room.png');
});

function openExport() {
  $('json').value = roomText();
  $('export-dialog').showModal();
  const errors = ed.model.problems().filter((p) => p.level === 'error');
  if (errors.length) status(`Exported with ${errors.length} problem${errors.length === 1 ? '' : 's'}: ${errors[0].message}`, true);
}
$('export').addEventListener('click', openExport);
$('close-export').addEventListener('click', () => $('export-dialog').close());
$('copy').addEventListener('click', () => navigator.clipboard?.writeText($('json').value));
$('download').addEventListener('click', () => download(`${ed.model.room.id}.json`, roomText()));
$('download-strings').addEventListener('click', () => download(`${ed.model.room.id}.strings.json`, JSON.stringify(ed.model.stringsTemplate(), null, 2)));

$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    attachModel(EditorModel.fromRoomJSON(json));
    fit();
    status(`Imported ${file.name}.${json.background && !ed.image ? ` Open the picture "${json.background}" to see it.` : ''}`);
  } catch (err) { status(`Could not import: ${err.message}`, true); }
});

$('preview').addEventListener('click', () => {
  const errors = ed.model.problems().filter((p) => p.level === 'error');
  if (errors.length) return status(`Fix this first: ${errors[0].message}`, true);
  try {
    localStorage.setItem(PREVIEW, JSON.stringify({ room: ed.model.toRoomJSON(), imageURL: ed.imageURL, imageName: ed.model.room.background }));
  } catch {
    localStorage.setItem(PREVIEW, JSON.stringify({ room: ed.model.toRoomJSON(), imageURL: null, imageName: null }));
    status('The picture is too big to pass to the preview; it will show a flat colour.', true);
  }
  window.open('preview.html', 'p5clickeryPreview');
  return undefined;
});

$('help-btn').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());

// ---- start ----

bindPanel($('side'), ed, act);
bindInput({ ed, canvas, $, status, act, render, refresh, setTool, fit, wandSelect, createFromMask, finishPolygon, clearMask, openExport });
new ResizeObserver(resize).observe($('view'));
attachModel(ed.model);
resize();
fit();
setTool('select');
restore();
window.editor = { ed, loadImage, wandSelect, createFromMask, roomText, setTool, finishPolygon, fit };
