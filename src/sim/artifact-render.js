'use strict';

/**
 * artifact-render.js
 *
 * Renders the 8-section artifact markdown as a self-contained static HTML
 * file suitable for sharing. Per docs/09-artifact-template.md:
 *
 *   - Distribution form: "Self-contained URL. The markdown rendered as a
 *     static HTML page hosted at a stable URL. The URL contains a hash
 *     of the run log for verification."
 *   - Tone: "Austere, archival. Mono for chrome. Serif for prose. No
 *     gradients, no shadows, no decorative AI styling."
 *
 * The output is a single HTML file with inline CSS (no external assets,
 * no JS). The hash is computed over the run log and embedded as a meta
 * tag, then re-computable by anyone reading the page.
 *
 * This is a minimal markdown-to-HTML converter — it handles the subset
 * of markdown used in artifact-generator.js output: h1-h3, blockquotes,
 * tables, bold, italic, inline code, code blocks, bullet lists, and
 * horizontal rules. No external dependencies.
 */

// ---------------------------------------------------------------
// Markdown → HTML (minimal)
// ---------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  let s = escapeHtml(text);
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let inList = false;
  let inBlockquote = false;

  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const closeBlockquote = () => { if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false; } };

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      out.push('<hr>');
      i += 1;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      closeList();
      closeBlockquote();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Table (header | row separator | rows)
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      closeBlockquote();
      const headerCells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      i += 2; // skip header and separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        rows.push(cells);
        i += 1;
      }
      out.push('<table>');
      out.push('<thead><tr>');
      for (const c of headerCells) out.push(`<th>${renderInline(c)}</th>`);
      out.push('</tr></thead>');
      out.push('<tbody>');
      for (const r of rows) {
        out.push('<tr>');
        for (const c of r) out.push(`<td>${renderInline(c)}</td>`);
        out.push('</tr>');
      }
      out.push('</tbody>');
      out.push('</table>');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeList();
      if (!inBlockquote) { out.push('<blockquote>'); inBlockquote = true; }
      out.push(`<p>${renderInline(line.slice(2))}</p>`);
      i += 1;
      continue;
    }
    if (inBlockquote && line.trim() === '') {
      // Blank line ends blockquote
      closeBlockquote();
      i += 1;
      continue;
    }
    if (inBlockquote && !line.startsWith('> ')) {
      closeBlockquote();
      // fall through to handle the new line
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      closeBlockquote();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${renderInline(line.slice(2))}</li>`);
      i += 1;
      continue;
    }
    if (inList && line.trim() === '') {
      closeList();
      i += 1;
      continue;
    }
    if (inList && !line.startsWith('- ') && !line.startsWith('* ')) {
      closeList();
      // fall through
    }

    // Blank line
    if (line.trim() === '') {
      closeList();
      closeBlockquote();
      out.push('');
      i += 1;
      continue;
    }

    // Paragraph (consume contiguous non-empty, non-special lines)
    closeList();
    closeBlockquote();
    const paraLines = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('- ') &&
      !lines[i].startsWith('* ') &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('|')
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${renderInline(paraLines.join(' '))}</p>`);
  }

  closeList();
  closeBlockquote();
  return out.join('\n');
}

// ---------------------------------------------------------------
// CSS (Metavisions register: mono chrome, serif prose)
// ---------------------------------------------------------------

const CSS = `
  :root {
    --ink: #1a1a1a;
    --paper: #f8f6f1;
    --rule: #c8c2b6;
    --muted: #6b6357;
    --accent: #5a3e2b;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: 'Iowan Old Style', 'Charter', 'Georgia', serif;
    font-size: 16px;
    line-height: 1.55;
  }
  main {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 1.5rem;
  }
  header.artifact-header {
    border-bottom: 1px solid var(--rule);
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }
  header.artifact-header h1 {
    font-size: 1.4rem;
    margin: 0 0 0.75rem 0;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  header.artifact-header .meta {
    font-family: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.6;
  }
  h1, h2, h3 {
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  h1 { font-size: 1.5rem; margin: 2.5rem 0 1rem 0; }
  h2 { font-size: 1.15rem; margin: 2rem 0 0.75rem 0; border-bottom: 1px solid var(--rule); padding-bottom: 0.4rem; }
  h3 { font-size: 1rem; margin: 1.5rem 0 0.5rem 0; color: var(--accent); }
  p { margin: 0.6rem 0; }
  blockquote {
    margin: 0.8rem 0;
    padding: 0.4rem 0 0.4rem 1.2rem;
    border-left: 2px solid var(--rule);
    color: var(--accent);
    font-style: italic;
  }
  blockquote p { margin: 0.2rem 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-family: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.82rem;
  }
  th, td {
    text-align: left;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }
  th {
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.72rem;
  }
  ul { padding-left: 1.4rem; margin: 0.5rem 0; }
  li { margin: 0.2rem 0; }
  code {
    font-family: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.88em;
    background: rgba(0,0,0,0.04);
    padding: 0.05em 0.3em;
    border-radius: 2px;
  }
  hr {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 2rem 0;
  }
  footer.artifact-footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--rule);
    font-family: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.72rem;
    color: var(--muted);
  }
  strong { font-weight: 600; }
  em { font-style: italic; }
`;

// ---------------------------------------------------------------
// Hash for verification (FNV-1a 32-bit, hex)
// ---------------------------------------------------------------

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/**
 * Render a markdown artifact to a self-contained HTML string.
 * @param {string} markdownArtifact - the markdown text of the artifact
 * @param {object} meta - { runId, model, outcome, hashOf }
 *   hashOf is the canonical string that was hashed (e.g. the run log)
 */
function renderArtifactHtml(markdownArtifact, { runId, model, outcome, hashOf }) {
  const hash = fnv1a32(hashOf);
  const body = renderMarkdown(markdownArtifact);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Polycrisis of Authority — Run report ${escapeHtml(runId)}</title>
  <meta name="polycrisis:run-id" content="${escapeHtml(runId)}">
  <meta name="polycrisis:model" content="${escapeHtml(model)}">
  <meta name="polycrisis:outcome" content="${escapeHtml(outcome)}">
  <meta name="polycrisis:hash" content="${hash}">
  <style>${CSS}</style>
</head>
<body>
  <main>
    <header class="artifact-header">
      <h1>Polycrisis of Authority — Run report</h1>
      <div class="meta">
        <div>Run ID: ${escapeHtml(runId)}</div>
        <div>Model: ${escapeHtml(model)}</div>
        <div>Outcome: ${escapeHtml(outcome)}</div>
        <div>Content hash (FNV-1a 32): ${hash}</div>
      </div>
    </header>
    <article>
${body}
    </article>
    <footer class="artifact-footer">
      <div>Polycrisis of Authority — github.com/metaviews/polycrisis-of-authority</div>
      <div>Content hash: ${hash}</div>
    </footer>
  </main>
</body>
</html>
`;
}

module.exports = {
  renderArtifactHtml,
  renderMarkdown,
  fnv1a32,
};