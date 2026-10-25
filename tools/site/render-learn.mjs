// The Learn section: an index of every function with the page that teaches it, and one paged
// topic per lesson file, each page with an editable sketch next to a live canvas.
import { page } from './layout.mjs';
import { coverageIndex } from './lessons.mjs';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

const tabs = (lessons, current) => `<nav class="tabs">${lessons.map((l) =>
  `<a href="${l.slug}.html"${l.slug === current ? ' class="active"' : ''}>${escapeHtml(l.title)}</a>`).join('')}</nav>`;

function indexPage(lessons, byId, docLinks) {
  const groups = coverageIndex(lessons, byId);
  const grid = [...groups].map(([owner, entries]) => {
    const heading = docLinks.has(owner) ? `<a href="../${docLinks.get(owner)}"><h2>${escapeHtml(owner)}</h2></a>` : `<h2>${escapeHtml(owner)}</h2>`;
    return `<div class="refgroup">${heading}${entries.map((e) => `<a href="../${e.href}">${escapeHtml(e.label)}</a>`).join('')}</div>`;
  }).join('');
  return page({
    title: 'Learn · p5.clickery', root: '../', section: 'learn',
    body: `<main class="learn-index"><h1>Learn</h1>
<p>Short, hands-on lessons. Each page has a small game you can change and run right here: edit the code, press <b>Run</b> and see what happens.</p>
<p>Looking for something particular? Every function below links to the lesson that uses it. For the complete list with every option, see the <a href="../docs/">Docs</a>.</p>
${tabs(lessons, '')}
<div class="refs">${grid}</div></main>`,
  });
}

function topicPage(lessons, lesson, hrefOf) {
  const list = lesson.pages.map((p, i) => `<li><a href="?page=${i}" data-page="${i}">${escapeHtml(p.title)}</a></li>`).join('');
  const sections = lesson.pages.map((p, i) => `<section class="lesson" data-page="${i}" hidden>
  <h1>${escapeHtml(p.title)}</h1>
  <div class="prose">${renderMarkdown(p.text, hrefOf)}</div>
  <p class="covers">${p.covers.map((c) => `<code>${escapeHtml(c.replace('#', '.'))}</code>`).join(' ')}</p>
  <div class="workbench">
    <div class="editor">
      <div class="bar"><span>sketch.js</span><span><button type="button" class="run">Run ▶</button><button type="button" class="reset">Reset</button></span></div>
      <textarea class="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Sketch code">${escapeHtml(p.code)}</textarea>
    </div>
    <div class="stage"><iframe title="Result" sandbox="allow-scripts allow-same-origin"></iframe><pre class="error" hidden></pre></div>
  </div>
  <p class="pager">${i > 0 ? `<a href="?page=${i - 1}" data-page="${i - 1}">← Previous</a>` : '<span></span>'}${i < lesson.pages.length - 1 ? `<a href="?page=${i + 1}" data-page="${i + 1}">Next →</a>` : '<span></span>'}</p>
</section>`).join('');
  return page({
    title: `${lesson.title} · Learn · p5.clickery`, root: '../', section: 'learn', description: lesson.blurb,
    body: `<main class="learn-topic">${tabs(lessons, lesson.slug)}<div class="topic"><aside class="side"><p class="group">${escapeHtml(lesson.title)}</p><ol>${list}</ol></aside><div class="pages">${sections}</div></div></main>`,
    scripts: '<script src="../assets/learn.js"></script>',
  });
}

// Returns { 'learn/index.html': html, 'learn/game.html': html, ... }.
export function renderLearn(lessons, { byId, links }) {
  const hrefOf = (name) => (links.has(name) ? `../${links.get(name)}` : null);
  const files = { 'learn/index.html': indexPage(lessons, byId, links) };
  for (const lesson of lessons) files[`learn/${lesson.slug}.html`] = topicPage(lessons, lesson, hrefOf);
  return files;
}
