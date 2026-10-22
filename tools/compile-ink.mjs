// Compiles .ink files to .ink.json for the Ink adapter: node tools/compile-ink.mjs examples/lighthouse/dialogue/keeper.ink
import fs from 'node:fs';
import { Compiler } from 'inkjs/full';

for (const file of process.argv.slice(2)) {
  const story = new Compiler(fs.readFileSync(file, 'utf8')).Compile();
  fs.writeFileSync(file.replace(/\.ink$/, '.ink.json'), story.ToJson());
  console.log(`${file} -> ${file.replace(/\.ink$/, '.ink.json')}`);
}
