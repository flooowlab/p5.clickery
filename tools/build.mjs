// Builds dist/ from src/:
//   dist/p5.clickery.js       for a <script> tag after p5.js (registers itself, exposes p5.clickery)
//   dist/p5.clickery.min.js   the same, minified: the file most people use
//   dist/p5.clickery.esm.js   for `import` and bundlers
//
//   node tools/build.mjs           build once            (npm run build; also runs before npm test)
//   node tools/build.mjs --watch   rebuild on every change in src/   (npm run dev)
//   node tools/build.mjs --check   fail if dist/ is not what src/ builds to
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version, license, homepage } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const banner = { js: `/*! p5.clickery v${version} | ${license} License | ${homepage.replace(/#.*$/, '')} */` };

const common = { bundle: true, target: 'es2022', banner, legalComments: 'none', logLevel: 'warning', absWorkingDir: root };
const builds = [
  { ...common, entryPoints: ['src/global.js'], outfile: 'dist/p5.clickery.js', format: 'iife' },
  { ...common, entryPoints: ['src/global.js'], outfile: 'dist/p5.clickery.min.js', format: 'iife', minify: true },
  { ...common, entryPoints: ['src/index.js'], outfile: 'dist/p5.clickery.esm.js', format: 'esm' },
];

const mode = process.argv[2];

if (mode === '--check') {
  const stale = [];
  for (const options of builds) {
    const result = await esbuild.build({ ...options, write: false });
    const fresh = result.outputFiles[0].text;
    const file = path.join(root, options.outfile);
    const lf = (text) => text.replaceAll('\r\n', '\n'); // a checkout may have turned LF into CRLF
    if (!fs.existsSync(file) || lf(fs.readFileSync(file, 'utf8')) !== lf(fresh)) stale.push(options.outfile);
  }
  if (stale.length) {
    console.error(`out of date: ${stale.join(', ')}. Run: npm run build`);
    process.exit(1);
  }
  console.log('dist/ is up to date');
} else if (mode === '--watch') {
  for (const options of builds) await (await esbuild.context(options)).watch();
  console.log('watching src/ ... (Ctrl+C to stop)');
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  for (const { outfile } of builds) console.log(`${outfile}  ${(fs.statSync(path.join(root, outfile)).size / 1024).toFixed(1)} KB`);
}
