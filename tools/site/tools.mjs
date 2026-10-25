// The Tools section: site/tools/*.md, one file per tool (the room editor, command line helpers,
// and ideas that are not built yet). Front matter: title, status (available | planned), summary,
// and for a tool with a page to open: open (a path from the site root) and openLabel.
import fs from 'node:fs';
import path from 'node:path';
import { page } from './layout.mjs';
import { parseFrontmatter } from './lessons.mjs';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

const STATUSES = { available: 'Available', planned: 'Planned' };

export function loadTools(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const { meta, body } = parseFrontmatter(path.join(dir, f));
    return { slug: f.replace(/\.md$/, '').replace(/^\d+-/, ''), file: f, ...meta, body };
  });
}

export function checkTools(tools) {
  const problems = [];
  for (const t of tools) {
    for (const key of ['title', 'summary']) if (!t[key]) problems.push(`tools/${t.file}: missing ${key}`);
    if (!STATUSES[t.status]) problems.push(`tools/${t.file}: status must be ${Object.keys(STATUSES).join(' or ')}, got "${t.status}"`);
  }
  return problems;
}

const badge = (status) => `<span class="badge ${status}">${STATUSES[status]}</span>`;

function indexPage(tools) {
  const group = (status, heading, blurb) => {
    const list = tools.filter((t) => t.status === status);
    if (!list.length) return '';
    return `<h2>${heading}</h2><p class="muted">${blurb}</p><div class="tool-grid">${list.map((t) =>
      `<a class="tool-card" href="${t.slug}.html"><b>${escapeHtml(t.title)}</b>${badge(t.status)}<span>${escapeHtml(t.summary)}</span></a>`).join('')}</div>`;
  };
  return page({
    title: 'Tools · p5.clickery', root: '../', section: 'tools',
    description: 'The room editor and the other helpers for making a point-and-click game.',
    body: `<main class="tools-index"><h1>Tools</h1>
<p>Making a game is more than code. These help with the rest: drawing rooms, preparing conversations, finding mistakes.</p>
${group('available', 'Available now', 'Ready to use.')}
${group('planned', 'Planned', 'Ideas for what comes next. Nothing here exists yet; each page says what it would do.')}
</main>`,
  });
}

function toolPage(tool) {
  const open = tool.open ? `<p><a class="button" href="../${tool.open}">${escapeHtml(tool.openLabel ?? 'Open')}</a></p>` : '';
  return page({
    title: `${tool.title} · Tools · p5.clickery`, root: '../', section: 'tools', description: tool.summary,
    body: `<main class="doc tool"><p class="crumb"><a href="./">Tools</a></p>
<h1>${escapeHtml(tool.title)} ${badge(tool.status)}</h1>
<p class="lead">${escapeHtml(tool.summary)}</p>
${open}
${renderMarkdown(tool.body)}
</main>`,
  });
}

// Returns { 'tools/index.html': html, 'tools/room-editor.html': html, ... }.
export function renderTools(tools) {
  const files = { 'tools/index.html': indexPage(tools) };
  for (const tool of tools) files[`tools/${tool.slug}.html`] = toolPage(tool);
  return files;
}
