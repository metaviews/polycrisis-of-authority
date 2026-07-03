'use strict';

/**
 * wiki-query.js
 *
 * Internal/operator CLI for querying the Metaviews llm-wiki.
 * Loads wiki/index.md, selects relevant wiki pages, reads those pages, and asks
 * an OpenRouter model to synthesize an answer with wiki-page citations.
 *
 * Usage:
 *   node scripts/wiki-query.js "How does Metaviews understand algorithmic authority?"
 *   node scripts/wiki-query.js --question "What does the archive say about food sovereignty?" --limit 5
 *   node scripts/wiki-query.js --dry-run "What pages are relevant to care economy?"
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, createClient, getArg, hasFlag } = require('./lib/openrouter');

const ROOT_DIR = path.join(__dirname, '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');
const DEFAULT_LIMIT = 6;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'does', 'for', 'from',
  'how', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'our', 'the', 'their', 'this',
  'to', 'what', 'when', 'where', 'who', 'why', 'with', 'within', 'metaviews',
  'understand', 'understands', 'say', 'says', 'about', 'through', 'into', 'do'
]);

function parseWikiIndex(indexContent) {
  const pages = [];
  const re = /^- \[([^\]]+)\]\(([^)]+)\)\s*—\s*(.+)$/gm;
  let match;
  while ((match = re.exec(indexContent)) !== null) {
    const [, title, href, description] = match;
    const type = href.split('/')[0];
    pages.push({ title, href, type, description: description.trim() });
  }
  return pages;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function scorePage(questionTokens, page) {
  const haystack = `${page.title} ${page.description} ${page.href}`.toLowerCase();
  let score = 0;
  for (const token of questionTokens) {
    if (haystack.includes(token)) score += 1;
    if (page.title.toLowerCase().includes(token)) score += 2;
  }

  if (score === 0) return 0;

  // Prefer durable synthesis pages for broad operator questions. Filed signal
  // pages are useful continuity, but they can otherwise crowd out the concept,
  // entity, and theme pages that explain the Metaviews frame. Apply the boost
  // only after a lexical match so unrelated pages are never selected solely by
  // type.
  const durableTypeBoosts = {
    concepts: 3,
    themes: 3,
    entities: 2,
    signals: -1,
  };
  score += durableTypeBoosts[page.type] || 0;

  return score;
}

function rankPagesForQuestion(question, pages, limit = DEFAULT_LIMIT) {
  const tokens = tokenize(question);
  return pages
    .map(page => ({ ...page, score: scorePage(tokens, page) }))
    .filter(page => page.score > 0)
    .sort((a, b) => b.score - a.score || a.href.localeCompare(b.href))
    .slice(0, limit);
}

function readSelectedPages(selectedPages, wikiDir = WIKI_DIR) {
  return selectedPages.map(page => {
    const fullPath = path.resolve(wikiDir, page.href);
    const wikiRoot = path.resolve(wikiDir);
    if (!fullPath.startsWith(wikiRoot + path.sep)) {
      throw new Error(`Refusing to read outside wiki/: ${page.href}`);
    }
    if (!fs.existsSync(fullPath)) {
      return { ...page, missing: true, content: '' };
    }
    return { ...page, missing: false, content: fs.readFileSync(fullPath, 'utf8') };
  });
}

function buildAnswerPrompt(question, pages) {
  const sources = pages.map((page, i) => [
    `## Source ${i + 1}: ${page.title}`,
    `Source: ${page.href}`,
    page.description ? `Index description: ${page.description}` : '',
    'Content:',
    truncate(page.content || '', 6000),
  ].filter(Boolean).join('\n')).join('\n\n---\n\n');

  return [
    'You are answering a Polycrisis project query using the llm-wiki.',
    'The wiki is grounded in the Metaviews archive of curated, dated, citable source material on AI policy and the politics of authority.',
    'Use only the supplied wiki pages as grounding. If the supplied pages are weak or incomplete, say so plainly.',
    'Cite the wiki pages used inline or in a short "Sources" section. Use page paths as citations.',
    'Do not invent public product capabilities or imply that this is a public query interface.',
    '',
    `Question: ${question}`,
    '',
    'Relevant wiki pages:',
    sources || '(No wiki pages selected.)',
    '',
    'Answer with a concise synthesis first, then supporting notes and citations.',
    'Cite the wiki pages used.',
  ].join('\n');
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trimEnd() + '\n…[truncated]';
}

function extractQuestion(args) {
  const fromEquals = getArg(args, 'question');
  if (fromEquals) return fromEquals.trim();
  const ignoredWithValue = new Set(['--limit', '--model']);
  const parts = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--question') {
      if (args[i + 1]) parts.push(args[i + 1]);
      i += 1;
      continue;
    }
    if (ignoredWithValue.has(arg)) {
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) continue;
    parts.push(arg);
  }
  return parts.join(' ').trim();
}

async function answerQuestion({ question, limit = DEFAULT_LIMIT, dryRun = false, client = null, wikiDir = WIKI_DIR, indexPath = INDEX_PATH } = {}) {
  if (!question) throw new Error('Question required. Pass text or --question "...".');
  if (!fs.existsSync(indexPath)) throw new Error(`Wiki index not found: ${indexPath}`);

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const pages = parseWikiIndex(indexContent);
  const selected = rankPagesForQuestion(question, pages, limit);
  const selectedWithContent = readSelectedPages(selected, wikiDir);

  if (dryRun) {
    return {
      question,
      selectedPages: selectedWithContent.map(({ content, ...page }) => page),
      prompt: null,
      answer: null,
    };
  }

  if (!selectedWithContent.length) {
    return {
      question,
      selectedPages: [],
      prompt: null,
      answer: 'No relevant wiki pages were selected from wiki/index.md. Try a more specific question or update the wiki index.',
    };
  }

  const prompt = buildAnswerPrompt(question, selectedWithContent.filter(page => !page.missing));
  const llm = client || createClient({ title: 'Polycrisis Wiki Query', temperature: 0.2 });
  const answer = await llm.ask(prompt, { temp: 0.2 });
  return {
    question,
    selectedPages: selectedWithContent.map(({ content, ...page }) => page),
    prompt,
    answer: answer.trim(),
  };
}

function printDryRun(result) {
  console.log(`# Wiki query dry run\n`);
  console.log(`Question: ${result.question}\n`);
  if (!result.selectedPages.length) {
    console.log('No relevant pages selected.');
    return;
  }
  console.log('Selected pages:');
  for (const page of result.selectedPages) {
    const suffix = page.missing ? ' [missing]' : '';
    console.log(`- ${page.href} (${page.title}) score=${page.score}${suffix}`);
  }
}

function printAnswer(result) {
  console.log(result.answer);
  if (result.selectedPages.length) {
    console.log('\n---\nWiki pages used:');
    for (const page of result.selectedPages) {
      const suffix = page.missing ? ' [missing]' : '';
      console.log(`- ${page.href}${suffix}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const question = extractQuestion(args);
  const limitArg = getArg(args, 'limit');
  const limit = limitArg ? Number.parseInt(limitArg, 10) : DEFAULT_LIMIT;
  const dryRun = hasFlag(args, 'dry-run');

  if (!dryRun) loadEnv(ROOT_DIR);

  const result = await answerQuestion({ question, limit, dryRun });
  if (dryRun) printDryRun(result);
  else printAnswer(result);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`wiki-query: ${err.message}`);
    process.exit(1);
  });
}

// Cycle 5e: extract a single sentence-quote from a wiki page. Used by the
// play loop to display a corpus quote alongside the "Interpreting your move"
// spinner. The quote gives the spinner some texture beyond the pendulum dot.
//
// Strategy: split content into sentences, filter out short headers / bullets /
// formatting, pick a sentence that's neither too short nor too long, and
// belongs to a paragraph (not a heading or list).
function extractQuote(page) {
  if (!page || !page.content) return null;
  // Split on sentence boundaries (period, exclamation, question mark followed
  // by whitespace or end of string). The regex is loose; we filter afterwards.
  const candidates = [];
  const sentences = page.content.split(/(?<=[.!?])\s+/);
  // Cycle 5i: meta-doc marker filter. Even when wiki/mechanics/ entries
  // slip through the path filter in pickCorpusQuote, individual sentences
  // that smell like project documentation (referencing internal files,
  // sections, cycle numbers, version stamps) are rejected here. These
  // markers never appear in substantive corpus prose.
  const META_PATTERNS = [
    /\bdocs\//,           // filename references like docs/08-crisis-anatomy.md
    /\bwiki\/[a-z]+\//,   // cross-references to other wiki sections
    /§/,                  // section symbol
    /\bAuthored per\b/,   // authoring markers
    /\bLast updated\b/,
    /\bCycle \d/,         // project version markers like "Cycle 5h"
    /\bPhase \d/,
    /\bPrinciple \d/,
    /\bMVP-/,
    /\b\d+\.\d+\.\d+\b/,  // semver versions
    /^\s*`/,             // lines starting with backtick
    /`[^`]*\.md`/,        // inline code with .md files
  ];
  for (const s of sentences) {
    const trimmed = s.trim();
    // Skip headings, list items, blank lines, very short or very long sentences
    if (trimmed.length < 40 || trimmed.length > 280) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('|')) continue; // table row
    if (trimmed.startsWith('---')) continue; // frontmatter delimiter
    // Reject sentences that match any meta-doc marker.
    if (META_PATTERNS.some((re) => re.test(trimmed))) continue;
    candidates.push(trimmed);
  }
  if (candidates.length === 0) return null;
  // Pick a random candidate (deterministic seed from the page title would
  // be better, but randomness is fine — the quote is ambient texture).
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Cycle 5e: pick a single random wiki quote for the spinner. Used by the
 * interactive CLI to add corpus-grounded texture to the LLM wait.
 *
 * Cycle 5i: restricted the candidate pool to substantive corpus sections
 * only. Previously the pool included `mechanics/`, `prototypes/`, and
 * project-doc index entries — these contain sentences like "Authored per
 * `docs/08-crisis-anatomy.md` § Crisis 5" that leaked into the spinner as
 * apparent corpus quotes, confusing the player (the doc references speak
 * to how the simulation is built, not what it governs).
 *
 * Substantive sections: concepts/, entities/, themes/, signals/. The
 * extractQuote function also has a defense-in-depth meta-doc marker
 * filter in case any meta-doc slips through the path filter.
 *
 * @param {string|null} preferHref - optional wiki path to prefer (e.g. one
 *   of the world's grounding entries); falls back to any page if the
 *   preferred one has no extractable sentence.
 * @returns {{text: string, href: string, title: string}|null}
 */
const SUBSTANTIVE_SECTIONS = new Set(['concepts/', 'entities/', 'themes/', 'signals/']);

function pickCorpusQuote(preferHref = null) {
  try {
    const content = fs.readFileSync(INDEX_PATH, 'utf8');
    const pages = parseWikiIndex(content);
    if (pages.length === 0) return null;
    // Try the preferred href first (only if it's in a substantive section)
    if (preferHref) {
      const isSubstantive = Array.from(SUBSTANTIVE_SECTIONS).some((s) => preferHref.startsWith(s));
      if (isSubstantive) {
        const preferred = pages.find(p => p.href === preferHref);
        if (preferred) {
          const pageContent = readSelectedPages([preferred], WIKI_DIR)[0];
          const quote = extractQuote(pageContent);
          if (quote) return { text: quote, href: preferred.href, title: preferred.title };
        }
      }
    }
    // Restrict candidate pool to substantive sections.
    const candidates = pages.filter(p => Array.from(SUBSTANTIVE_SECTIONS).some((s) => p.href.startsWith(s)));
    if (candidates.length === 0) return null;
    const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
    for (const p of shuffled.slice(0, 5)) {
      const pageContent = readSelectedPages([p], WIKI_DIR)[0];
      const quote = extractQuote(pageContent);
      if (quote) return { text: quote, href: p.href, title: p.title };
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  parseWikiIndex,
  rankPagesForQuestion,
  readSelectedPages,
  buildAnswerPrompt,
  extractQuestion,
  answerQuestion,
  extractQuote,
  pickCorpusQuote,
};
