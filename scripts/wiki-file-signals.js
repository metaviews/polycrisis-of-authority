'use strict';

/**
 * wiki-file-signals.js (polycrisis)
 *
 * Deterministically files published Pressure Systems editions from the
 * parent metaviews-website project (../metaviews-website/src/signal/) into
 * polycrisis's wiki/signals/ directory. Updates the Signals section in
 * polycrisis's wiki/index.md.
 *
 * This is a bookkeeping step (no LLM calls, deterministic).
 *
 * Cycle: 10 — signal-filing pipeline.
 *
 * Usage:
 *   node scripts/wiki-file-signals.js
 *   node scripts/wiki-file-signals.js --force         # overwrite existing filings
 *   node scripts/wiki-file-signals.js --source-dir <path>  # override source signals dir
 *   node scripts/wiki-file-signals.js --limit 18     # only file the N most recent
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT_DIR = path.join(__dirname, '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');
const WIKI_SIGNAL_DIR = path.join(WIKI_DIR, 'signals');
// Default source signals location: parent metaviews-website.
// On user's server: ~/polycrisis-of-authority/../metaviews-website/src/signal/
const DEFAULT_SOURCE_SIGNAL_DIR = path.join(ROOT_DIR, '..', 'metaviews-website', 'src', 'signal');

function hasFlag(args, name) {
  return args.includes('--' + name);
}

function getFlagValue(args, name, defaultValue) {
  const idx = args.indexOf('--' + name);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

function firstSentence(text, max = 180) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.match(/^(.+?[.!?])\s/);
  const candidate = sentence ? sentence[1] : cleaned;
  if (candidate.length <= max) return candidate;
  return candidate.slice(0, max).trimEnd() + '…';
}

function parseFrontmatter(content, filePath) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter: ${filePath}`);
  const data = yaml.load(match[1]) || {};
  return { data, body: match[2] || '' };
}

function readSignalEdition(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data, body } = parseFrontmatter(content, filePath);
  const filename = path.basename(filePath);
  const date = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : String(data.date || filename.slice(0, 10));
  return {
    filename,
    href: `signals/${filename}`,
    sourcePath: `../metaviews-website/src/signal/${filename}`,
    title: String(data.title || filename.replace(/\.md$/, '')).trim(),
    slug: data.slug ? String(data.slug) : filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
    date,
    synthesis: String(data.synthesis || data.description || '').trim(),
    items: Array.isArray(data.items) ? data.items : [],
    body,
  };
}

function renderItem(item, index) {
  const title = item.title || `Item ${index + 1}`;
  const linkedTitle = item.url ? `[${title}](${item.url})` : title;
  const lines = [`${index + 1}. ${linkedTitle}`];
  if (item.source) lines.push(`   - Source: ${item.source}`);
  if (item.pubDate) lines.push(`   - Published: ${item.pubDate}`);
  if (item.relevanceScore !== undefined) lines.push(`   - Relevance score: ${item.relevanceScore}`);
  if (Array.isArray(item.themes) && item.themes.length) lines.push(`   - Themes: ${item.themes.join(', ')}`);
  if (item.excerpt) lines.push(`   - Excerpt: ${String(item.excerpt).replace(/\s+/g, ' ').trim()}`);
  return lines.join('\n');
}

function renderSignalWikiPage(edition) {
  return [
    `# ${edition.title}`,
    '',
    `Date: ${edition.date}`,
    `Source edition: \`${edition.sourcePath}\``,
    '',
    '## Synthesis',
    '',
    edition.synthesis || '_No synthesis recorded in source edition._',
    '',
    '## Monitored items',
    '',
    edition.items.length ? edition.items.map(renderItem).join('\n\n') : '_No monitored items recorded._',
    '',
    '## Retrieval notes',
    '',
    'This page files a published Pressure Systems edition from the parent metaviews-website project into the polycrisis internal llm-wiki, so operator retrieval can include the live intelligence stream alongside the durable archive.',
    '',
  ].join('\n');
}

function listPublishedSignals(signalDir) {
  if (!fs.existsSync(signalDir)) return [];
  return fs.readdirSync(signalDir)
    .filter(name => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(name))
    .filter(name => !name.includes('-draft'))
    .sort()
    .map(name => path.join(signalDir, name));
}

function signalIndexLines(editions) {
  return editions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    .map(edition => `- [${edition.date} — ${edition.title}](${edition.href}) — ${firstSentence(edition.synthesis) || 'Filed Pressure Systems edition.'}`);
}

function updateIndexSignals(indexContent, editions) {
  const lines = signalIndexLines(editions);
  const replacement = ['## Signals', '', ...lines, ''].join('\n');
  if (/## Signals[\s\S]*$/m.test(indexContent)) {
    return indexContent.replace(/## Signals[\s\S]*$/m, replacement + '\n');
  }
  return `${indexContent.trimEnd()}\n\n${replacement}\n`;
}

function readExistingFiledSignals(wikiSignalDir) {
  if (!fs.existsSync(wikiSignalDir)) return [];
  return fs.readdirSync(wikiSignalDir)
    .filter(name => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(name))
    .sort()
    .map(name => {
      const filePath = path.join(wikiSignalDir, name);
      const content = fs.readFileSync(filePath, 'utf8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const dateMatch = content.match(/^Date:\s+(.+)$/m);
      const synthesisMatch = content.match(/## Synthesis\n\n([\s\S]*?)(\n\n## |$)/m);
      return {
        filename: name,
        href: `signals/${name}`,
        title: titleMatch ? titleMatch[1].trim() : name.replace(/\.md$/, ''),
        date: dateMatch ? dateMatch[1].trim().slice(0, 10) : name.slice(0, 10),
        synthesis: synthesisMatch ? synthesisMatch[1].trim() : '',
      };
    });
}

function fileSignals({ sourceDir = DEFAULT_SOURCE_SIGNAL_DIR, force = false, limit = null } = {}) {
  const wikiDir = WIKI_DIR;
  const indexPath = INDEX_PATH;
  const wikiSignalDir = WIKI_SIGNAL_DIR;

  if (!fs.existsSync(indexPath)) throw new Error(`Wiki index not found: ${indexPath}`);

  fs.mkdirSync(wikiSignalDir, { recursive: true });
  const filed = [];
  const skipped = [];
  const editions = [];

  let signals = listPublishedSignals(sourceDir);
  // Apply --limit (only file the N most recent)
  if (limit && limit > 0) {
    signals = signals.slice(-limit);
  }

  if (!fs.existsSync(sourceDir)) {
    return { filed, skipped, indexed: 0, sourceDir, error: 'source directory not found' };
  }

  for (const signalPath of signals) {
    const edition = readSignalEdition(signalPath);
    const outPath = path.join(wikiSignalDir, edition.filename);
    if (fs.existsSync(outPath) && !force) {
      skipped.push(edition.filename);
    } else {
      fs.writeFileSync(outPath, renderSignalWikiPage(edition));
      filed.push(edition.filename);
    }
    editions.push(edition);
  }

  // Also include pre-existing wiki signal entries that weren't touched
  // by this run, so the index stays comprehensive.
  const existing = readExistingFiledSignals(wikiSignalDir)
    .filter(existingEdition => !editions.some(edition => edition.filename === existingEdition.filename));
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, updateIndexSignals(indexContent, [...editions, ...existing]));

  return { filed, skipped, indexed: editions.length + existing.length, sourceDir };
}

function main() {
  const args = process.argv.slice(2);
  const force = hasFlag(args, 'force');
  const sourceDir = getFlagValue(args, 'source-dir', DEFAULT_SOURCE_SIGNAL_DIR);
  const limit = parseInt(getFlagValue(args, 'limit', ''), 10) || null;

  const result = fileSignals({ sourceDir, force, limit });

  if (result.error) {
    console.error(`[wiki-file-signals] ${result.error}: ${sourceDir}`);
    console.error('[wiki-file-signals] tip: ensure the parent project is at ' + path.dirname(sourceDir) + ' or pass --source-dir explicitly');
    process.exit(2);
  }

  console.log(`[wiki-file-signals] source=${sourceDir}`);
  console.log(`[wiki-file-signals] filed=${result.filed.length} skipped=${result.skipped.length} indexed=${result.indexed}`);
  for (const filename of result.filed) console.log(`  filed ${filename}`);
  for (const filename of result.skipped) console.log(`  skipped (already filed) ${filename}`);

  // Exit non-zero if limit was used and limit > filings — that's a config error
  if (limit && result.filed.length === 0 && result.skipped.length < limit) {
    console.error(`[wiki-file-signals] warning: --limit=${limit} but only ${result.skipped.length} were available`);
  }
}

if (require.main === module) main();

module.exports = {
  fileSignals,
  readSignalEdition,
  renderSignalWikiPage,
  listPublishedSignals,
  readExistingFiledSignals,
  updateIndexSignals,
  DEFAULT_SOURCE_SIGNAL_DIR,
};
