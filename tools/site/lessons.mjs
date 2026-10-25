// Lessons are Markdown files in site/learn/. A file is a topic; it holds pages:
//
//   ---
//   title: Game
//   blurb: One line for the topic's card.
//   ---
//   <!-- page: A first game -->
//   <!-- covers: createGame, Game#start -->
//   Text, then one ```js block: the runnable sketch.
//
// `covers` names what the page teaches. The names must exist in the JSDoc, so a renamed
// function breaks the build instead of leaving a stale lesson.
import fs from 'node:fs';
import path from 'node:path';

const FENCE = /```js\n([\s\S]*?)```/;

// A Markdown file with "key: value" lines between --- lines at the top: { meta, body }.
export function parseFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const [, front = '', body = raw] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const meta = Object.fromEntries(front.split('\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  return { meta, body };
}

export function parseLesson(file) {
  const { meta, body: rest } = parseFrontmatter(file);
  const slug = path.basename(file, '.md').replace(/^\d+-/, '');
  const pages = rest.split(/^<!-- page: (.*) -->$/m).slice(1);
  const out = [];
  for (let i = 0; i < pages.length; i += 2) {
    let text = pages[i + 1];
    const covers = (text.match(/^<!-- covers: (.*) -->$/m)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    text = text.replace(/^<!-- covers: .* -->\n?/m, '');
    const code = text.match(FENCE)?.[1].replace(/\s+$/, '') ?? null;
    out.push({ title: pages[i].trim(), covers, code, text: text.replace(FENCE, '').trim() });
  }
  if (!meta.title || !out.length) throw new Error(`${file}: needs a title and at least one page`);
  return { slug, file, ...meta, pages: out };
}

export function loadLessons(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => parseLesson(path.join(dir, f)));
}

// Fails when a page covers a name the JSDoc does not know, or has nothing to run.
export function checkLessons(lessons, byId) {
  const problems = [];
  for (const lesson of lessons) {
    lesson.pages.forEach((p, i) => {
      const where = `${lesson.slug}.md page ${i} "${p.title}"`;
      if (!p.code) problems.push(`${where}: no \`\`\`js block`);
      if (!p.covers.length) problems.push(`${where}: no covers comment`);
      for (const name of p.covers) if (!byId.has(name)) problems.push(`${where}: covers "${name}", which is not in the JSDoc`);
    });
  }
  return problems;
}

// What the Learn index lists: { group: [{ label, href }] }, grouped by the class a name belongs to.
export function coverageIndex(lessons, byId) {
  const groups = new Map();
  for (const lesson of lessons) {
    lesson.pages.forEach((p, i) => {
      for (const name of p.covers) {
        const owner = name.includes('#') ? name.split('#')[0] : byId.get(name)?.kind === 'typedef' ? 'Types' : 'Functions';
        const label = name.includes('#') ? name.split('#')[1] : name;
        const list = groups.get(owner) ?? groups.set(owner, []).get(owner);
        if (!list.some((e) => e.name === name)) list.push({ name, label, href: `learn/${lesson.slug}.html?page=${i}` });
      }
    });
  }
  return groups;
}
