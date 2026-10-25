// The Docs section: one page per class, one for the functions and one for the types, all from JSDoc.
import { page } from './layout.mjs';
import { anchor, byArea, signature, typeText } from './jsdoc.mjs';
import { codeBlock, escapeHtml, renderMarkdown } from './markdown.mjs';

const PAGES = { functions: 'docs/functions.html', types: 'docs/types.html', constants: 'docs/constants.html' };

// Where each documented name lives, relative to the site root.
export function docsLinks({ classes, functions, types, constants }) {
  const links = new Map();
  for (const { doc, members } of classes) {
    links.set(doc.longname, `docs/${doc.name}.html`);
    for (const m of members) links.set(m.longname, `docs/${doc.name}.html#${anchor(m.longname)}`);
  }
  for (const f of functions) links.set(f.longname, `${PAGES.functions}#${anchor(f.longname)}`);
  for (const t of types) links.set(t.longname, `${PAGES.types}#${anchor(t.longname)}`);
  for (const c of constants) links.set(c.longname, `${PAGES.constants}#${anchor(c.longname)}`);
  return links;
}

const params = (doc) => {
  const list = doc.params ?? [];
  if (!list.length) return '';
  const rows = list.map((p) => `<tr><td><code>${escapeHtml(p.name)}</code></td><td><code>${escapeHtml(typeText(p.type))}</code></td>`
    + `<td>${p.optional ? 'optional' : ''}${p.defaultvalue !== undefined ? ` (default <code>${escapeHtml(p.defaultvalue)}</code>)` : ''}</td>`
    + `<td>${p.description ? renderMarkdown(p.description).replace(/^<p>|<\/p>\s*$/g, '') : ''}</td></tr>`).join('');
  return `<table class="params"><thead><tr><th>Parameter</th><th>Type</th><th></th><th>Meaning</th></tr></thead><tbody>${rows}</tbody></table>`;
};

const properties = (doc) => {
  const rows = (doc.properties ?? []).map((p) => `<tr><td><code>${escapeHtml(p.name)}</code></td><td><code>${escapeHtml(typeText(p.type))}</code></td>`
    + `<td>${p.defaultvalue !== undefined ? `<code>${escapeHtml(p.defaultvalue)}</code>` : ''}</td>`
    + `<td>${renderMarkdown(p.description ?? '').replace(/^<p>|<\/p>\s*$/g, '')}</td></tr>`).join('');
  return rows ? `<table class="params"><thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Meaning</th></tr></thead><tbody>${rows}</tbody></table>` : '';
};

function member(doc, owner, hrefOf) {
  const returns = (doc.returns ?? []).map((r) =>
    `<p class="returns"><b>Returns</b> <code>${escapeHtml(typeText(r.type))}</code> ${renderMarkdown(r.description ?? '', hrefOf).replace(/^<p>|<\/p>\s*$/g, '')}</p>`).join('');
  const type = doc.kind === 'member' || doc.kind === 'constant' ? typeText(doc.type) : '';
  return `<section class="member" id="${anchor(doc.longname)}">
  <h3><a href="#${anchor(doc.longname)}">${escapeHtml(doc.name)}</a></h3>
  <p class="sig"><code>${escapeHtml(signature(doc, owner))}</code>${type ? ` <span class="type">${escapeHtml(type)}</span>` : ''}</p>
  ${renderMarkdown(doc.description ?? '', hrefOf)}
  ${doc.kind === 'typedef' ? properties(doc) : params(doc)}${returns}
  ${(doc.examples ?? []).map((e) => `<p class="label">Example</p>${codeBlock(e)}`).join('')}
</section>`;
}

function sidebar(model, current, root) {
  const item = (href, label, active, members = []) =>
    `<li><a href="${root}${href}"${active ? ' class="active"' : ''}>${escapeHtml(label)}</a>`
    + (active && members.length ? `<ul>${members.map((m) => `<li><a href="#${anchor(m.longname)}">${escapeHtml(m.name)}</a></li>`).join('')}</ul>` : '') + '</li>';
  return `<aside class="side"><ul>
  <li class="group">Start here</li>
  ${item(PAGES.functions, 'Functions', current === 'functions', model.functions)}
  ${item(PAGES.types, 'Types', current === 'types', model.types)}
  ${item(PAGES.constants, 'Constants', current === 'constants', model.constants)}
  ${byArea(model.classes, (c) => c.doc).map(([area, list]) => `<li class="group">${escapeHtml(area)}</li>`
    + list.map(({ doc, members }) => item(`docs/${doc.name}.html`, doc.name, current === doc.name, members)).join('')).join('')}
</ul></aside>`;
}

function docsPage(model, key, title, intro, sections, hrefOf) {
  return page({
    title: `${title} · p5.clickery docs`, root: '../', section: 'docs',
    body: `<div class="docs">${sidebar(model, key, '../')}<main class="doc"><h1>${escapeHtml(title)}</h1>${intro}${sections}</main></div>`,
  });
}

// Returns { 'docs/Game.html': html, ... }.
export function renderDocs(model) {
  const links = docsLinks(model);
  const hrefOf = (name) => (links.has(name) ? `../${links.get(name)}` : null);
  const files = {};
  for (const { doc, members } of model.classes) {
    const props = members.filter((m) => m.kind === 'member');
    const methods = members.filter((m) => m.kind === 'function');
    const list = (label, items) => (items.length ? `<h2>${label}</h2>${items.map((m) => member(m, doc.name, hrefOf)).join('')}` : '');
    const intro = `<p class="sig"><code>${escapeHtml(signature(doc, doc.name))}</code></p>${renderMarkdown(doc.classdesc ?? doc.description ?? '', hrefOf)}`
      + (doc.examples ?? []).map((e) => `<p class="label">Example</p>${codeBlock(e)}`).join('') + params(doc);
    files[`docs/${doc.name}.html`] = docsPage(model, doc.name, doc.name, intro, list('Properties', props) + list('Methods', methods), hrefOf);
  }
  const section = (items) => byArea(items).map(([area, list]) => `<h2>${escapeHtml(area)}</h2>${list.map((d) => member(d, '', hrefOf)).join('')}`).join('');
  files[PAGES.functions] = docsPage(model, 'functions', 'Functions', '<p>Functions you call directly, without an object, grouped by the part of the library they belong to.</p>', section(model.functions), hrefOf);
  files[PAGES.types] = docsPage(model, 'types', 'Types', '<p>The shape of the objects you pass in and get back.</p>', section(model.types), hrefOf);
  files[PAGES.constants] = docsPage(model, 'constants', 'Constants', '<p>Fixed values the library provides.</p>', section(model.constants), hrefOf);
  const summary = (d) => escapeHtml((d.description ?? d.classdesc ?? '').split(/\n|\. /)[0].replace(/[`*]|\{@link ([^}]*)\}/g, '$1'));
  const entry = (d) => `<li><a href="../${links.get(d.longname)}">${escapeHtml(d.name)}</a> <span class="muted">${summary(d)}</span></li>`;
  const everything = [...model.functions, ...model.classes.map((c) => c.doc), ...model.types, ...model.constants];
  const index = byArea(everything).map(([area, list]) => `<h2>${escapeHtml(area)}</h2><ul class="toc">${list.map(entry).join('')}</ul>`).join('');
  files['docs/index.html'] = docsPage(model, '', 'Documentation', `<p>Every function, class and option of the library, generated from the comments in its source. Looking for a guided tour with live examples instead? Try <a href="../learn/">Learn</a>.</p>${index}`, '', hrefOf);
  return files;
}
