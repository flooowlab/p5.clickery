// The animation previewer page: cut a sprite sheet into frames, name the animations, watch them play
// the way the game will (using the library's own AnimationState), and copy the code.
import { AnimationState } from '../../src/actor/animation.js';
import { DIRECTIONS, parseFrameList, sheetGrid, frameRect, checkAnimations, buildSnippet } from './frames.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);

let image = null;
let fileName = 'hero.png';
let rows = [];      // { name, frames: text, delay, loop }
let facing = 'down';
let anim = new AnimationState({});

function makeSampleSheet() {
  const canvas = el('canvas', { width: 256, height: 192 });
  const g = canvas.getContext('2d');
  for (let i = 0; i < 12; i++) {
    const x = (i % 4) * 64;
    const y = Math.floor(i / 4) * 64;
    g.fillStyle = `hsl(${i * 30}, 60%, 45%)`;
    g.fillRect(x + 8, y + 8, 48, 48);
    g.fillStyle = '#fff';
    g.font = 'bold 22px system-ui';
    g.textAlign = 'center';
    g.fillText(String(i), x + 32, y + 40);
  }
  return canvas;
}

function readRows() {
  const animations = {};
  const problems = [];
  for (const row of rows) {
    if (!row.name.trim()) continue;
    try {
      animations[row.name.trim()] = { frames: parseFrameList(row.frames), delay: Number(row.delay), loop: row.loop };
      row.bad = false;
    } catch (err) {
      row.bad = true;
      problems.push(`"${row.name}": ${err.message}`);
    }
  }
  return { animations, problems };
}

function geometry() {
  const fw = Math.max(1, Number($('fw').value) || 1);
  const fh = Math.max(1, Number($('fh').value) || 1);
  const grid = image ? sheetGrid(image.width, image.height, fw, fh) : { columns: 0, rows: 0, count: 0 };
  return { fw, fh, ...grid };
}

function drawSheet() {
  const canvas = $('sheet');
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (!image) { g.fillStyle = '#8f98ad'; g.font = '14px system-ui'; g.fillText('Open a sprite sheet, or press Sample sheet.', 16, 28); return; }
  const scale = Math.min(canvas.width / image.width, canvas.height / image.height, 4);
  const { fw, fh, columns, count } = geometry();
  g.imageSmoothingEnabled = false;
  g.drawImage(image, 0, 0, image.width * scale, image.height * scale);
  g.strokeStyle = 'rgba(255,214,120,.8)';
  g.fillStyle = '#ffd678';
  g.font = '11px ui-monospace, monospace';
  for (let i = 0; i < count; i++) {
    const r = frameRect(i, fw, fh, columns);
    g.strokeRect(r.x * scale + 0.5, r.y * scale + 0.5, r.w * scale, r.h * scale);
    g.fillText(String(i), r.x * scale + 3, r.y * scale + 12);
  }
}

function update() {
  const { animations, problems } = readRows();
  const geo = geometry();
  $('grid').textContent = image ? `${image.width} x ${image.height} px: ${geo.columns} columns, ${geo.rows} rows, ${geo.count} frames` : '';
  const warnings = [...problems, ...checkAnimations(animations, geo.count)];
  const box = $('warnings');
  box.textContent = '';
  for (const w of warnings) box.appendChild(el('div', { textContent: w }));
  if (!warnings.length) box.appendChild(el('div', { className: 'ok', textContent: 'The animations look fine.' }));

  anim = new AnimationState(animations);
  anim.face(facing);
  anim.set($('state').value);
  $('code').value = geo.count ? buildSnippet({ file: fileName, frameWidth: geo.fw, frameHeight: geo.fh, columns: geo.columns, animations, directions: Number($('directions').value) }) : '';
  for (const input of document.querySelectorAll('#rows .frames')) input.classList.toggle('bad', rows[input.dataset.i]?.bad === true);
  drawSheet();
}

function renderRows() {
  const box = $('rows');
  box.textContent = '';
  rows.forEach((row, i) => {
    const on = (key, convert = (v) => v) => (e) => { row[key] = convert(e.target.type === 'checkbox' ? e.target.checked : e.target.value); update(); };
    const line = el('div', { className: 'row' });
    line.append(
      el('input', { type: 'text', value: row.name, placeholder: 'walk_right', oninput: on('name') }),
      el('input', { type: 'text', value: row.frames, placeholder: '4-7', className: 'frames', oninput: on('frames') }),
      Object.assign(el('input', { type: 'number', value: row.delay, min: 10, step: 10, title: 'milliseconds per frame', oninput: on('delay') })),
      Object.assign(el('label', { textContent: ' loop' }), {}),
      el('button', { textContent: 'remove', onclick: () => { rows.splice(i, 1); renderRows(); update(); } }),
    );
    line.children[1].dataset.i = i;
    const loop = el('input', { type: 'checkbox', checked: row.loop, onchange: on('loop') });
    line.children[3].prepend(loop);
    box.appendChild(line);
  });
}

function renderDirs() {
  const dirs = $('dirs');
  dirs.textContent = '';
  const layout = ['up_left', 'up', 'up_right', 'left', null, 'right', 'down_left', 'down', 'down_right'];
  const eight = $('directions').value === '8';
  for (const d of layout) {
    if (!d || (!eight && d.includes('_'))) { dirs.appendChild(el('span')); continue; }
    dirs.appendChild(el('button', { textContent: { up: '↑', down: '↓', left: '←', right: '→', up_left: '↖', up_right: '↗', down_left: '↙', down_right: '↘' }[d], title: d, className: d === facing ? 'on' : '', onclick: () => { facing = d; renderDirs(); update(); } }));
  }
}

let last = performance.now();
function frameLoop(now) {
  anim.update(now - last);
  last = now;
  const canvas = $('preview');
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  const { current, frame } = anim;
  $('using').textContent = current.key ? `drawing ${current.key}${current.flip ? ' (mirrored)' : ''}, frame ${frame}` : `no animation for ${anim.state}_${anim.dir}: nothing is drawn`;
  if (image && frame !== null && frame !== undefined) {
    const { fw, fh, columns, count } = geometry();
    if (frame < count) {
      const r = frameRect(frame, fw, fh, columns);
      const scale = Math.min(canvas.width / fw, canvas.height / fh);
      g.imageSmoothingEnabled = false;
      g.save();
      g.translate(canvas.width / 2, canvas.height - 8);
      g.scale(current.flip ? -scale : scale, scale);
      g.drawImage(image, r.x, r.y, r.w, r.h, -fw / 2, -fh * 0.97, fw, fh);
      g.restore();
    }
  }
  requestAnimationFrame(frameLoop);
}

function useImage(source, name) {
  image = source;
  fileName = name;
  update();
}

$('open').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', () => {
  const file = $('file').files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => useImage(img, file.name);
  img.src = URL.createObjectURL(file);
});
$('sample').addEventListener('click', () => {
  $('fw').value = 64;
  $('fh').value = 64;
  rows = [
    { name: 'idle', frames: '0', delay: 200, loop: true },
    { name: 'walk_right', frames: '4-7', delay: 120, loop: true },
    { name: 'walk_down', frames: '8-11', delay: 120, loop: true },
    { name: 'talk', frames: '1-2', delay: 150, loop: true },
  ];
  renderRows();
  useImage(makeSampleSheet(), 'hero.png');
});
$('add').addEventListener('click', () => { rows.push({ name: '', frames: '', delay: 120, loop: true }); renderRows(); });
for (const id of ['fw', 'fh', 'state']) $(id).addEventListener('input', update);
$('directions').addEventListener('change', () => { renderDirs(); update(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('code').value); $('copy').textContent = 'Copied'; } catch { $('code').select(); }
  setTimeout(() => { $('copy').textContent = 'Copy code'; }, 1500);
});
$('sheet').addEventListener('click', (e) => {
  const { fw, fh, columns, count } = geometry();
  if (!image || !count) return;
  const box = e.target.getBoundingClientRect();
  const scale = Math.min($('sheet').width / image.width, $('sheet').height / image.height, 4);
  const x = ((e.clientX - box.left) * ($('sheet').width / box.width)) / scale;
  const y = ((e.clientY - box.top) * ($('sheet').height / box.height)) / scale;
  const index = Math.floor(y / fh) * columns + Math.floor(x / fw);
  if (index >= 0 && index < count && x < columns * fw) navigator.clipboard?.writeText(String(index)).catch(() => {});
});

renderDirs();
$('sample').click();
requestAnimationFrame(frameLoop);
