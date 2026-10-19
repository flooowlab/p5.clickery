import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

describe('release', () => {
  it('the version is the same everywhere and has a changelog entry', () => {
    assert.equal(pkg.version, VERSION);
    assert.match(read('CHANGELOG.md'), new RegExp(`^## ${VERSION.replaceAll('.', '\\.')} \\(\\d{4}-\\d{2}-\\d{2}\\)`, 'm'));
  });

  it('is MIT licensed, and not marked private', () => {
    assert.equal(pkg.license, 'MIT');
    assert.match(read('LICENSE'), /^MIT License/);
    assert.notEqual(pkg.private, true);
  });

  it('the entry points and every published file or folder exist', () => {
    assert.ok(fs.existsSync(path.join(root, pkg.main)));
    assert.equal(pkg.exports['.'], `./${pkg.main}`);
    for (const entry of pkg.files) {
      const file = entry.replace(/^!/, ''); // "!x" excludes x from the package; it should still exist
      assert.ok(fs.existsSync(path.join(root, file)), `files entry "${entry}" is missing`);
    }
  });

  it('p5 is a peer dependency that the dev copy satisfies; the library itself needs no runtime dependencies', () => {
    assert.equal(pkg.dependencies, undefined);
    assert.match(pkg.peerDependencies.p5, /^>=2/);
    assert.match(pkg.devDependencies.p5, /^2\./);
  });

  it('the source does not import inkjs or p5 (both stay optional for the library)', () => {
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (e.name.endsWith('.js')) files.push(rel);
      }
    };
    walk('src');
    assert.ok(files.length > 30);
    const realImport = /^\s*(import|export)\b.*from ['"](inkjs|p5)/m; // statements only, not examples in comments
    for (const file of files) assert.doesNotMatch(read(file), realImport, file);
  });
});

describe('documentation', () => {
  // Every relative link in the main documents points at a file that exists.
  for (const doc of ['README.md', 'docs/reference.md']) {
    it(`${doc}: relative links resolve`, () => {
      const dir = path.dirname(path.join(root, doc));
      const links = [...read(doc).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((l) => !/^(https?:|mailto:|#)/.test(l));
      assert.ok(links.length > 0);
      for (const link of links) {
        const target = path.resolve(dir, link.split('#')[0]);
        assert.ok(fs.existsSync(target), `${doc} links to missing ${link}`);
      }
    });
  }

  it('the README lists the example and the reference', () => {
    const readme = read('README.md');
    assert.match(readme, /examples\/lighthouse/);
    assert.match(readme, /docs\/reference\.md/);
  });

  it('the in-page links in the README contents point at real headings', () => {
    const readme = read('README.md');
    const slug = (h) => h.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    const headings = new Set([...readme.matchAll(/^#{1,4} (.+)$/gm)].map((m) => slug(m[1])));
    const contents = readme.slice(0, readme.indexOf('## What you get'));
    for (const [, anchor] of contents.matchAll(/\]\(#([^)]+)\)/g)) assert.ok(headings.has(anchor), `no heading for #${anchor}`);
  });
});
