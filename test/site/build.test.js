// Builds the whole website and checks it as a visitor would meet it: every page links only to
// things that exist, examples and tool apps sit inside the site's own pages, and what was removed
// is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const site = path.join(root, '_site');

const build = spawnSync(process.execPath, ['tools/build-site.mjs'], { cwd: root, encoding: 'utf8' });

const htmlFiles = (dir = site) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const file = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'src' ? [] : htmlFiles(file);
  return e.name.endsWith('.html') ? [file] : [];
});

test('the site builds', () => {
  assert.equal(build.status, 0, build.stderr || build.stdout);
  assert.match(build.stdout, /site built: \d+ pages/);
});

test('every relative link, picture, stylesheet and script in every page points at a file that exists', () => {
  const broken = [];
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, 'utf8')
      .replace(/<textarea[\s\S]*?<\/textarea>/g, '') // lesson code is text, not links
      .replace(/<pre[\s\S]*?<\/pre>/g, '')
      .replace(/<code[\s\S]*?<\/code>/g, '');
    for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url === '?' || url.startsWith('?')) continue; // other sites, anchors, the page itself
      const clean = url.split('#')[0].split('?')[0];
      const target = path.resolve(path.dirname(file), clean);
      const exists = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
      if (!exists) broken.push(`${path.relative(site, file)} -> ${url}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('examples are pages of the site with the example running inside, and the old demos are gone', () => {
  for (const name of ['quickstart', 'adventure', 'lighthouse']) {
    const wrapper = fs.readFileSync(path.join(site, 'examples', name, 'index.html'), 'utf8');
    assert.match(wrapper, /<header class="top">/, `${name}: has the site's navigation`);
    assert.match(wrapper, /<iframe src="play\.html"/);
    assert.ok(fs.existsSync(path.join(site, 'examples', name, 'play.html')), `${name}: the example itself`);
  }
  assert.equal(fs.existsSync(path.join(site, 'examples', 'core')), false);
  assert.equal(fs.existsSync(path.join(site, 'examples', 'rooms')), false);
  const index = fs.readFileSync(path.join(site, 'examples', 'index.html'), 'utf8');
  assert.match(index, /<header class="top">/);
  assert.doesNotMatch(index, /examples\/core|Under the hood/i);
});

test('the tool apps are pages of the site with the app running inside, sharing one stylesheet', () => {
  for (const app of ['editor', 'dialogue', 'animation']) {
    const wrapper = fs.readFileSync(path.join(site, 'tools', app, 'index.html'), 'utf8');
    assert.match(wrapper, /<header class="top">/, `${app}: has the site's navigation`);
    assert.match(wrapper, /<iframe src="app\.html"/);
    const own = fs.readFileSync(path.join(site, 'tools', app, 'app.html'), 'utf8');
    assert.match(own, /href="\.\.\/shared\/app\.css"/, `${app}: uses the shared stylesheet`);
    assert.match(own, /<body class="app">/);
  }
  assert.ok(fs.existsSync(path.join(site, 'tools', 'shared', 'app.css')));
});

test('the apps and the examples still run on their own in the repository', () => {
  for (const file of ['examples/quickstart/index.html', 'examples/adventure/index.html', 'examples/lighthouse/index.html',
    'tools/editor/index.html', 'tools/dialogue/index.html', 'tools/animation/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /<iframe src="(?:play|app)\.html"/, `${file} is the thing itself, not its site page`);
  }
});
