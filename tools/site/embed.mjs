// Pages that show a runnable thing inside the site's own header and navigation: the examples, and
// the tool apps (room editor, dialogue previewer, animation previewer). The thing itself keeps
// working on its own in the repository (examples/<name>/index.html, tools/<app>/index.html); when
// the site is built its page moves to play.html / app.html and a page with the site around it
// takes its place.
import fs from 'node:fs';
import path from 'node:path';
import { page } from './layout.mjs';
import { parseFrontmatter } from './lessons.mjs';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

const REPO = 'https://github.com/flooowlab/p5.clickery';

// Tool apps: the folder in tools/, how the site names it, and the guide page that explains it.
export const APPS = [
  { dir: 'editor', title: 'Room editor', guide: 'room-editor' },
  { dir: 'dialogue', title: 'Dialogue previewer', guide: 'dialogue-previewer' },
  { dir: 'animation', title: 'Animation previewer', guide: 'animation-previewer' },
];

export function loadExamples(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const { meta, body } = parseFrontmatter(path.join(dir, f));
    return { slug: f.replace(/\.md$/, '').replace(/^\d+-/, ''), file: f, ...meta, body };
  });
}

// Every example needs its folder with a runnable index.html, and every app its folder too.
export function checkEmbeds(examples, root) {
  const problems = [];
  for (const e of examples) {
    for (const key of ['title', 'summary']) if (!e[key]) problems.push(`site/examples/${e.file}: missing ${key}`);
    if (!fs.existsSync(path.join(root, 'examples', e.slug, 'index.html'))) problems.push(`site/examples/${e.file}: there is no examples/${e.slug}/index.html`);
  }
  for (const app of APPS) if (!fs.existsSync(path.join(root, 'tools', app.dir, 'index.html'))) problems.push(`tools/${app.dir}/index.html is missing`);
  return problems;
}

// What the site build must move, relative to the site: [from, to].
export function renames(examples) {
  return [
    ...examples.map((e) => [`examples/${e.slug}/index.html`, `examples/${e.slug}/play.html`]),
    ...APPS.map((a) => [`tools/${a.dir}/index.html`, `tools/${a.dir}/app.html`]),
  ];
}

// Keeps the app's colours in step with the site's light / dark choice.
const THEME_SYNC = `<script>
  (() => {
    const frame = document.querySelector('iframe');
    const current = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const apply = () => { try { frame.contentDocument.documentElement.dataset.theme = current(); } catch { /* not the same origin */ } };
    frame.addEventListener('load', apply);
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();
</script>`;

// Gives the example the page's own query string (?adapter=twine), then the theme.
const PASS_QUERY = `<script>
  (() => {
    const frame = document.querySelector('.player iframe');
    if (location.search) frame.src = 'play.html' + location.search;
  })();
</script>`;

function examplePage(e, root = '../../') {
  return page({
    title: `${e.title} · Examples · p5.clickery`, root, section: 'examples', description: e.summary,
    body: `<main class="example">
<p class="crumb"><a href="../">Examples</a></p>
<h1>${escapeHtml(e.title)}</h1>
<p class="lead">${escapeHtml(e.summary)}</p>
<div class="player"><iframe src="play.html" title="${escapeHtml(e.title)}" allow="autoplay; fullscreen"></iframe></div>
<p class="actions"><a class="button" href="play.html" id="full">Open full screen</a> <a href="${REPO}/tree/main/examples/${e.slug}">View the source</a></p>
${e.shows ? `<h2>What it shows</h2><p>${escapeHtml(e.shows)}</p>` : ''}
${renderMarkdown(e.body)}
</main>`,
    scripts: `${PASS_QUERY}<script>document.getElementById('full').href = 'play.html' + location.search;</script>`,
  });
}

function examplesIndex(examples) {
  return page({
    title: 'Examples · p5.clickery', root: '../', section: 'examples',
    description: 'Complete small games to play and read.',
    body: `<main class="tools-index"><h1>Examples</h1>
<p>Complete small games to play, and to read: each one is a single folder. For a step-by-step path, start with <a href="../learn/">Learn</a>.</p>
<div class="tool-grid">${examples.map((e, i) => `<a class="tool-card" href="${e.slug}/"><b>${i + 1}. ${escapeHtml(e.title)}</b><span>${escapeHtml(e.summary)}</span></a>`).join('')}</div>
</main>`,
  });
}

function appPage(app) {
  return page({
    title: `${app.title} · Tools · p5.clickery`, root: '../../', section: 'tools',
    body: `<div class="app-bar"><a href="../">Tools</a> <span>›</span> <b>${escapeHtml(app.title)}</b> <span class="muted">· <a href="../${app.guide}.html">how to use it</a></span></div>
<div class="app-frame"><iframe src="app.html" title="${escapeHtml(app.title)}"></iframe></div>`,
    scripts: THEME_SYNC,
  });
}

// Returns { 'examples/index.html': html, 'examples/quickstart/index.html': html, 'tools/editor/index.html': html, ... }.
export function renderEmbeds(examples) {
  const files = { 'examples/index.html': examplesIndex(examples) };
  for (const e of examples) files[`examples/${e.slug}/index.html`] = examplePage(e);
  for (const app of APPS) files[`tools/${app.dir}/index.html`] = appPage(app);
  return files;
}
