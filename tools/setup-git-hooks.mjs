// Runs on `npm install` (the "prepare" script): points git at .githooks/, whose
// pre-commit hook rebuilds dist/ so it is always committed in step with src/.
// Does nothing outside a git checkout (for example when installed from npm).
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (fs.existsSync('.git') && fs.existsSync('.githooks')) {
  try {
    execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
    console.log('git hooks: .githooks (dist/ is rebuilt on every commit)');
  } catch { /* git not available: skip */ }
}
