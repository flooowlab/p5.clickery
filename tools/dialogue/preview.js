// The dialogue previewer page: edit a conversation on the left, play it on the right.
import { PreviewSession } from './session.js';
import { analyse } from './analyse.js';

const SAMPLE_MARKDOWN = `# start
Merchant: Welcome, traveller. A map costs 5 gold. # sfx:bell
You have {gold} gold.
* {gold >= 5} Buy the map. -> buy
* Haggle. -> haggle
* Leave. -> END

# buy
~ gold -= 5
Merchant: Pleasure doing business. You have {gold} gold left.
-> END

# haggle
Merchant: Five gold, and not a coin less.
* Fine, here is the gold. -> buy
* Then I will leave. -> END

# unfinished
~ mood = angry
Merchant: Nobody links to this section.
`;

const SAMPLE_TWEE = `:: Start
Guard: Halt! Who goes there?
[[A friend->friend]]
[[A thief->thief]]

:: friend
<<set $welcome to 5>>
Guard: Then welcome, friend. Have $welcome gold.

:: thief
Guard: Not on my watch!
`;

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, text = '') => Object.assign(document.createElement(tag), props, text ? { textContent: text } : {});
const STORE = 'p5.clickery:dialogue-previewer';

let session = null;
let timer = null;

function startingVars() {
  const text = $('vars').value.trim() || '{}';
  const vars = JSON.parse(text);
  if (vars === null || typeof vars !== 'object' || Array.isArray(vars)) throw new Error('Variables must be a JSON object, such as {"gold": 7}');
  return vars;
}

function rebuild(keepStart = false) {
  const status = $('status');
  try {
    const start = keepStart ? $('start').value : '';
    session = new PreviewSession($('source').value, { vars: startingVars(), start: start || undefined });
    const analysis = analyse(session.program);
    fillStart(analysis, start);
    renderChecks(analysis);
    status.className = '';
    status.textContent = `${session.format}: ${session.program.sections.size} section${session.program.sections.size === 1 ? '' : 's'}`;
  } catch (err) {
    session = null;
    status.className = 'error';
    status.textContent = err.message;
    $('checks').textContent = '';
  }
  render();
  try { localStorage.setItem(STORE, $('source').value); } catch { /* private window: nothing is remembered */ }
}

function fillStart(analysis, current) {
  const select = $('start');
  select.textContent = '';
  select.appendChild(el('option', { value: '' }, '(first)'));
  for (const s of analysis.sections) select.appendChild(el('option', { value: s.name, selected: s.name === current }, s.name));
  select.disabled = session.format !== 'Markdown';
}

function renderChecks({ sections, unreachable, variables }) {
  const box = $('checks');
  box.textContent = '';
  const add = (text, cls = '') => box.appendChild(el('div', { className: cls }, text));
  if (unreachable.length) add(`Never reached: ${unreachable.join(', ')}`, 'warn');
  if (variables.readNeverSet.length) add(`Read but never set here (give them a starting value above): ${variables.readNeverSet.join(', ')}`, 'warn');
  if (variables.setNeverRead.length) add(`Set but never read: ${variables.setNeverRead.join(', ')}`, 'muted');
  if (!unreachable.length && !variables.readNeverSet.length) add('Every section can be reached.', 'muted');
  const table = el('table');
  for (const s of sections) {
    const row = el('tr', { className: s.reachable ? '' : 'warn' });
    row.append(el('td', {}, s.name), el('td', {}, `${s.lines} line${s.lines === 1 ? '' : 's'}`), el('td', {}, s.ends));
    table.appendChild(row);
  }
  box.appendChild(table);
}

function render() {
  const transcript = $('transcript');
  const options = $('options');
  transcript.textContent = '';
  options.textContent = '';
  $('end').hidden = true;
  $('variables').textContent = '';
  if (!session) return;

  for (const entry of session.transcript) {
    if (entry.type === 'choice') {
      transcript.appendChild(el('div', { className: 'choice-said' }, `› ${entry.text}`));
      continue;
    }
    const line = el('div', { className: 'line' });
    if (entry.speaker) line.appendChild(el('b', {}, `${entry.speaker}: `));
    line.appendChild(document.createTextNode(entry.text));
    for (const [key, value] of Object.entries(entry.tags)) line.appendChild(el('span', { className: 'tag' }, value === true ? key : `${key}: ${value}`));
    transcript.appendChild(line);
  }
  for (const option of session.options) {
    options.appendChild(el('button', { onclick: () => { session.choose(option.index); render(); } }, `${option.index + 1}. ${option.text}`));
  }
  $('end').hidden = !session.done;

  const vars = Object.entries(session.vars);
  const table = el('table');
  for (const [name, value] of vars) {
    const row = el('tr');
    row.append(el('td', {}, name), el('td', {}, JSON.stringify(value)));
    table.appendChild(row);
  }
  $('variables').appendChild(vars.length ? table : el('span', { className: 'muted' }, 'none yet'));
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(), 250);
}

let saved = null;
try { saved = localStorage.getItem(STORE); } catch { /* ignore */ }
$('source').value = saved ?? SAMPLE_MARKDOWN;
$('vars').value = '{"gold": 7}';

$('source').addEventListener('input', schedule);
$('vars').addEventListener('input', schedule);
$('start').addEventListener('change', () => rebuild(true));
$('restart').addEventListener('click', () => rebuild(true));
$('sample-md').addEventListener('click', () => { $('source').value = SAMPLE_MARKDOWN; $('vars').value = '{"gold": 7}'; rebuild(); });
$('sample-twee').addEventListener('click', () => { $('source').value = SAMPLE_TWEE; $('vars').value = '{}'; rebuild(); });
$('open').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (file) { $('source').value = await file.text(); rebuild(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select') || !/^[1-9]$/.test(e.key) || !session) return;
  const option = session.options[Number(e.key) - 1];
  if (option) { session.choose(option.index); render(); }
});

rebuild();
