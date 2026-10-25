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
import { APPS, loadExamples, checkEmbeds, renderEmbeds, renames } from './site/embed.mjs';
import { homePage } from './site/home.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');

const model = organise(loadDoclets(root));
const lessons = loadLessons(path.join(root, 'site', 'learn'));
const tools = loadTools(path.join(root, 'site', 'tools'));
const examples = loadExamples(path.join(root, 'site', 'examples'));
const problems = [...checkLessons(lessons, model.byId), ...checkTools(tools), ...checkEmbeds(examples, root)];
if (problems.length) {
  console.error(`the site's lessons, tools or examples have problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
const write = (rel, text) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const copy = (from, to, filter) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true, filter });

copy('site/assets', 'assets');
copy('dist', 'dist');
copy('src', 'src'); // the room editor and the Lighthouse example import from ../../src
copy('node_modules/p5/lib/p5.min.js', 'vendor/p5.min.js');
// The examples load p5 and inkjs from ../../node_modules; keep those paths working.
for (const f of ['p5/lib/p5.min.js', 'inkjs/dist/ink.js', 'inkjs/dist/ink.mjs']) copy(`node_modules/${f}`, `node_modules/${f}`);
copy('examples', 'examples');
copy('tools/shared', 'tools/shared');
for (const app of APPS) copy(`tools/${app.dir}`, `tools/${app.dir}`);

// Examples and tool apps keep working on their own in the repository. On the site their page moves
// aside (play.html, app.html) and a page with the site's header and navigation takes its place.
for (const [from, to] of renames(examples)) fs.renameSync(path.join(out, from), path.join(out, to));

const links = docsLinks(model);
const pages = {
  ...renderDocs(model), ...renderLearn(lessons, { byId: model.byId, links }), ...renderTools(tools),
  ...renderEmbeds(examples), 'index.html': homePage(),
};
for (const [rel, html] of Object.entries(pages)) write(rel, html);
write('.nojekyll', '');

console.log(`site built: ${Object.keys(pages).length} pages, ${lessons.reduce((n, l) => n + l.pages.length, 0)} lessons -> ${path.relative(root, out)}/`);
