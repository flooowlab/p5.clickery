// The shell every page shares: head, top navigation, theme toggle.
import { escapeHtml } from './markdown.mjs';

export const SECTIONS = [
  ['learn', 'Learn', 'learn/'],
  ['docs', 'Docs', 'docs/'],
  ['tools', 'Tools', 'tools/'],
  ['examples', 'Examples', 'examples/'],
];

// Changes with every build. It is added to the addresses of the site's scripts and styles, and of the
// library the lessons run, so a browser that kept an older copy (GitHub Pages lets it for ten minutes)
// fetches the new one instead of mixing a new page with an old library.
export const BUILD = Date.now().toString(36);

// Runs before the page paints so the chosen theme does not flash.
const THEME_BOOT = `try{var t=localStorage.getItem('clickery-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

// root: the path from this page back to the site root ('' or '../' or '../../').
export function page({ title, root, section = '', body, head = '', scripts = '', description = '' }) {
  const nav = SECTIONS.map(([id, label, href]) =>
    `<a href="${root}${href}"${id === section ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
<script>${THEME_BOOT}</script>
<link rel="stylesheet" href="${root}assets/site.css?v=${BUILD}">
${head}
</head>
<body class="section-${section}">
<header class="top">
  <a class="brand" href="${root}">p5.clickery</a>
  <nav>${nav}<a href="https://github.com/flooowlab/p5.clickery">GitHub</a></nav>
  <button class="theme" type="button" id="theme" aria-label="Switch between light and dark">◐</button>
</header>
${body}
<script src="${root}assets/theme.js?v=${BUILD}"></script>
${scripts}
</body>
</html>
`;
}
