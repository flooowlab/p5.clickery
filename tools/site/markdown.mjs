// Markdown to HTML for descriptions and lesson text, plus a very small JavaScript highlighter.
import { Marked } from 'marked';

const marked = new Marked({ gfm: true });

export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// {@link Game#say} and {@link Game#say|the say method} become links when `hrefOf` knows the name.
export function renderMarkdown(text = '', hrefOf = () => null) {
  const linked = text.replace(/\{@link\s+([^}\s|]+)(?:[\s|]+([^}]*))?\}/g, (_, name, label) => {
    const href = hrefOf(name);
    const shown = `\`${(label || name).trim()}\``;
    return href ? `[${shown}](${href})` : shown;
  });
  return marked.parse(linked);
}

const TOKENS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|async|await|return|if|else|for|while|new|true|false|null|undefined|import|export|from|of|in|typeof|class)\b|\b(\d+(?:\.\d+)?)\b/g;

export function highlight(code) {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKENS)) {
    out += escapeHtml(code.slice(last, m.index));
    const kind = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n';
    out += `<span class="tok-${kind}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + escapeHtml(code.slice(last));
}

export const codeBlock = (code) => `<pre class="code"><code>${highlight(code.replace(/\s+$/, ''))}</code></pre>`;
