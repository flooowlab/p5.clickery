// Builds the website (Learn + Docs + Examples) into _site/, ready for GitHub Pages.
//
//   node tools/build-site.mjs     (npm run build:site)
//
// Docs come from the JSDoc comments in src/. Learn comes from site/learn/*.md. The library is
// copied from dist/, so run `npm run build` first (npm run build:site does it for you).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDoclets, organise } from './site/jsdoc.mjs';
import { renderDocs, docsLinks } from './site/render-docs.mjs';
import { loadLessons, checkLessons } from './site/lessons.mjs';
import { renderLearn } from './site/render-learn.mjs';
import { loadTools, checkTools, renderTools } from './site/tools.mjs';
import { homePage } from './site/home.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');

const model = organise(loadDoclets(root));
const lessons = loadLessons(path.join(root, 'site', 'learn'));
const tools = loadTools(path.join(root, 'site', 'tools'));
const problems = [...checkLessons(lessons, model.byId), ...checkTools(tools)];
if (problems.length) {
  console.error(`site/learn or site/tools has problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
const write = (rel, text) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const copy = (from, to, filter) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true, filter });

const links = docsLinks(model);
const pages = { ...renderDocs(model), ...renderLearn(lessons, { byId: model.byId, links }), ...renderTools(tools), 'index.html': homePage() };
for (const [rel, html] of Object.entries(pages)) write(rel, html);

copy('site/assets', 'assets');
copy('dist', 'dist');
copy('src', 'src'); // the room editor and the Lighthouse example import from ../../src
copy('node_modules/p5/lib/p5.min.js', 'vendor/p5.min.js');
// The examples load p5 and inkjs from ../../node_modules; keep those paths working.
for (const f of ['p5/lib/p5.min.js', 'inkjs/dist/ink.js', 'inkjs/dist/ink.mjs']) copy(`node_modules/${f}`, `node_modules/${f}`);
copy('examples', 'examples');
for (const dir of ['editor', 'dialogue', 'animation']) if (fs.existsSync(path.join(root, 'tools', dir))) copy(`tools/${dir}`, `tools/${dir}`);
write('.nojekyll', '');

console.log(`site built: ${Object.keys(pages).length} pages, ${lessons.reduce((n, l) => n + l.pages.length, 0)} lessons -> ${path.relative(root, out)}/`);
