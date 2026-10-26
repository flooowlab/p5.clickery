// A lesson topic: shows the page chosen by ?page=N, and runs each sketch in a sandboxed frame.
const sections = [...document.querySelectorAll('.lesson')];
const links = [...document.querySelectorAll('.pagelist a[data-page]')];
const site = new URL('../', location.href).href;
const build = document.currentScript?.dataset.build ?? ''; // makes a browser fetch the library again after a new build
const ran = new Set();

// The sketch runs in its own page with p5 and p5.clickery loaded, so a mistake cannot break this one.
function frameSource(code) {
  const safe = code.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#14161c;overflow:hidden}</style>
<script src="${site}vendor/p5.min.js?v=${build}"><\/script>
<script src="${site}dist/p5.clickery.min.js?v=${build}"><\/script>
<script>
  // in a function, so none of these names can clash with the lesson's own
  (() => {
    const report = (m) => parent.postMessage({ clickeryError: String(m) }, '*');
    addEventListener('error', (e) => report(e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')));
    addEventListener('unhandledrejection', (e) => report(e.reason?.message ?? e.reason));
    // tells the page how many frames p5 has drawn (it does not start until an async setup() returns)
    let frames = 0;
    p5.registerAddon((_p5, _fn, lifecycles) => { lifecycles.predraw = () => { frames += 1; }; });
    setInterval(() => parent.postMessage({ clickeryFrames: frames }, '*'), 400);
  })();
<\/script></head><body><script>
${safe}
<\/script></body></html>`;
}

function run(section) {
  const frame = section.querySelector('iframe');
  const error = section.querySelector('.error');
  error.hidden = true;
  frame.srcdoc = frameSource(section.querySelector('textarea').value);
  ran.add(section);
}

function show(index) {
  const n = Math.min(Math.max(index, 0), sections.length - 1);
  sections.forEach((s, i) => { s.hidden = i !== n; });
  links.forEach((a) => a.classList.toggle('active', Number(a.dataset.page) === n));
  if (!ran.has(sections[n])) run(sections[n]);
  links.find((a) => Number(a.dataset.page) === n)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  sections[n].querySelector('.text').scrollTop = 0;
  return n;
}

function go(n, push = true) {
  const page = show(n);
  if (push) history.pushState(null, '', `?page=${page}`);
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-page]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  go(Number(link.dataset.page));
});
addEventListener('popstate', () => show(Number(new URLSearchParams(location.search).get('page')) || 0));

for (const section of sections) {
  const area = section.querySelector('textarea');
  const original = area.value;
  const fit = () => { area.rows = Math.max(area.value.split('\n').length + 1, 12); };
  fit();
  section.querySelector('.run').addEventListener('click', () => run(section));
  section.querySelector('.reset').addEventListener('click', () => { area.value = original; run(section); });
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run(section);
    }
  });
}

// Pane widths (percent of the page) are shared by every lesson and kept between visits.
const topic = document.querySelector('.learn-topic');
const widths = { text: 24, code: 30 };
try { Object.assign(widths, JSON.parse(localStorage.getItem('clickery-panes'))); } catch { /* defaults */ }
function applyWidths() {
  widths.text = Math.min(Math.max(widths.text, 12), 45);
  widths.code = Math.min(Math.max(widths.code, 15), 60);
  topic.style.setProperty('--w-text', `${widths.text}%`);
  topic.style.setProperty('--w-code', `${widths.code}%`);
}
function saveWidths() { try { localStorage.setItem('clickery-panes', JSON.stringify(widths)); } catch { /* private mode */ } }
applyWidths();
for (const bar of document.querySelectorAll('.split')) {
  const which = bar.dataset.split;
  bar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    const section = bar.closest('.lesson');
    const total = section.getBoundingClientRect().width;
    const startX = e.clientX, start = widths[which];
    section.classList.add('dragging'); // the sketch frame would swallow the pointer events otherwise
    const move = (m) => { widths[which] = start + ((m.clientX - startX) / total) * 100; applyWidths(); };
    const end = () => {
      section.classList.remove('dragging');
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', end);
      bar.removeEventListener('pointercancel', end);
      saveWidths();
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  });
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    widths[which] += e.key === 'ArrowRight' ? 2 : -2;
    applyWidths(); saveWidths();
  });
  bar.addEventListener('dblclick', () => { widths[which] = which === 'text' ? 24 : 30; applyWidths(); saveWidths(); });
}

addEventListener('message', (e) => {
  if (typeof e.data?.clickeryFrames === 'number') {
    const shown = sections.find((s) => !s.hidden);
    if (shown) shown.dataset.frames = String(e.data.clickeryFrames);
    return;
  }
  if (typeof e.data?.clickeryError !== 'string') return;
  const visible = sections.find((s) => !s.hidden);
  const box = visible?.querySelector('.error');
  if (box) { box.textContent = e.data.clickeryError; box.hidden = false; }
});

show(Number(new URLSearchParams(location.search).get('page')) || 0);
