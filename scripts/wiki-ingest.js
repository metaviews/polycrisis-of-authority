'use strict';

/**
 * wiki-ingest.js
 *
 * Cycle 4a. Scans the parent Metaviews archive for AI-policy-relevant
 * posts and writes draft proposals to wiki/proposals/ for orchestrator
 * review.
 *
 * Inherits conventions from /home/situation/metaviews-website/scripts/wiki-ingest.js
 * with two key differences:
 *
 *   1. Polycrisis is narrower (AI policy only, 60-100 seed docs) so we
 *      pre-filter by tag/title before any LLM call.
 *   2. We never auto-merge into the curated wiki. Every proposal lands
 *      in wiki/proposals/ with status: pending. The orchestrator accepts
 *      or rejects via `node scripts/wiki-ingest.js review` (or by editing
 *      the frontmatter and running `node scripts/wiki-ingest.js commit`).
 *      This matches the roadmap's Phase 4 ship criterion:
 *      "A wiki-ingest cycle from the parent project produces a draft
 *       proposal set that the orchestrator can review and accept/reject."
 *
 * Usage:
 *   node scripts/wiki-ingest.js scan --days 60       # default 60-day window
 *   node scripts/wiki-ingest.js scan --days 30       # 30-day window
 *   node scripts/wiki-ingest.js review               # show pending proposals
 *   node scripts/wiki-ingest.js accept <file>        # move proposal to wiki/
 *   node scripts/wiki-ingest.js reject <file>        # mark proposal rejected
 *   node scripts/wiki-ingest.js commit               # process all accepted
 *
 * Requires: OPENROUTER_API_KEY and OPENROUTER_MODEL in .env (LLM calls only)
 */

const fs = require('fs');
const path = require('path');

const { loadEnv, createClient } = require('./lib/openrouter');

const ROOT = path.join(__dirname, '..');
const PARENT_ARCHIVE = '/home/situation/metaviews-website/src/intelligence/archive';
const PARENT_SIGNAL = '/home/situation/metaviews-website/src/signal';
const WIKI_DIR = path.join(ROOT, 'wiki');
const PROPOSALS_DIR = path.join(WIKI_DIR, 'proposals');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');
const LOG_PATH = path.join(WIKI_DIR, 'log.md');

// AI-policy-related tags from the corpus synthesis (docs/01-corpus-synthesis.md).
// These are the only tags the pre-filter accepts. A post without one of these
// tags is skipped without an LLM call.
const AI_POLICY_TAGS = new Set([
  'AI', 'Ai',
  'Future of Authority', 'Algorithmic Authority', 'Cognitive Authority',
  'Algorithmic Transparency', 'AI Governance', 'AI Policy',
  'AI Arms Race', 'AI Bubble', 'Automation', 'Automation of Law',
  'Memetic Warfare', 'Epistemic War', 'Epistemic', 'Narrative',
  'Bubble', 'Bursts',
  'Like', // (legacy tag, often co-occurs with AI)
]);

// Title-keyword pre-filter: even without a tag, a post with these terms
// in the title is worth considering. Catches posts tagged loosely.
const TITLE_KEYWORDS = [
  'ai', 'artificial intelligence', 'algorithm', 'algorithmic',
  'automation', 'agentic', 'frontier', 'llm', 'model', 'machine learning',
  'neural', 'openai', 'anthropic', 'mythos', 'palantir', 'compute',
  'epistemic', 'memetic', 'narrative', 'cognitive authority',
  'future of authority', 'arms race', 'bubble',
];

// ---------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------

function parseArgs(argv) {
  const args = { cmd: null, days: 60, file: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === 'scan') args.cmd = 'scan';
    else if (a === 'review') args.cmd = 'review';
    else if (a === 'accept') { args.cmd = 'accept'; args.file = argv[++i]; }
    else if (a === 'reject') { args.cmd = 'reject'; args.file = argv[++i]; }
    else if (a === 'commit') args.cmd = 'commit';
    else if (a === '--days' || a === '-d') args.days = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

// ---------------------------------------------------------------
// Archive walking
// ---------------------------------------------------------------

function walk(dir, ext, acc) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, ext, acc);
    else if (f.endsWith(ext)) acc.push(full);
  }
}

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const out = {};
  // Tags: capture the YAML list
  const tagsMatch = fm.match(/^tags:\s*\n((?:\s*-\s*['"]?[^\n'"]+['"]?\s*\n?)+)/m);
  if (tagsMatch) {
    out.tags = [];
    for (const line of tagsMatch[1].split('\n')) {
      const t = line.match(/^\s*-\s*['"]?([^'"]+?)['"]?\s*$/);
      if (t) out.tags.push(t[1].trim());
    }
  } else {
    // Inline tags: tags: [a, b, c]
    const inlineMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
    if (inlineMatch) {
      out.tags = inlineMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      out.tags = [];
    }
  }
  // Title
  const titleMatch = fm.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  out.title = titleMatch ? titleMatch[1].replace(/^['"]|['"]$/g, '').trim() : path.basename(filePath, '.md');
  // Date
  const dateMatch = fm.match(/^date:\s*(\S+)/m);
  out.date = dateMatch ? dateMatch[1].slice(0, 10) : '0000-00-00';
  // Description
  const descMatch = fm.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
  out.description = descMatch ? descMatch[1].replace(/^['"]|['"]$/g, '').trim() : '';
  // Canonical (Substack URL, used as the dedup key)
  const canonMatch = fm.match(/^canonical:\s*['"]?(.+?)['"]?\s*$/m);
  out.canonical = canonMatch ? canonMatch[1].replace(/^['"]|['"]$/g, '').trim() : null;
  return out;
}

function passesPreFilter(fm) {
  // Tag match
  for (const tag of fm.tags) {
    if (AI_POLICY_TAGS.has(tag)) return { pass: true, reason: `tag:${tag}` };
  }
  // Title keyword match
  const titleLower = fm.title.toLowerCase();
  for (const kw of TITLE_KEYWORDS) {
    if (titleLower.includes(kw)) return { pass: true, reason: `title:${kw}` };
  }
  return { pass: false, reason: 'no tag or title match' };
}

function isInDateRange(date, days) {
  if (date === '0000-00-00') return false;
  const postDate = new Date(date);
  if (Number.isNaN(postDate.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return postDate >= cutoff;
}

function getAlreadyProposed() {
  if (!fs.existsSync(PROPOSALS_DIR)) return new Set();
  const set = new Set();
  for (const f of fs.readdirSync(PROPOSALS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8');
    const m = content.match(/^source_canonical:\s*['"]?(.+?)['"]?\s*$/m);
    if (m) set.add(m[1]);
  }
  return set;
}

// ---------------------------------------------------------------
// Body extraction
// ---------------------------------------------------------------

function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractBody(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  if (!m) return '';
  return stripHtml(m[1] || '');
}

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '…';
}

// ---------------------------------------------------------------
// Index parsing (for the relevance prompt)
// ---------------------------------------------------------------

function readIndex() {
  if (!fs.existsSync(INDEX_PATH)) return '';
  return fs.readFileSync(INDEX_PATH, 'utf8');
}

// ---------------------------------------------------------------
// LLM calls
// ---------------------------------------------------------------

async function generateProposal(client, post, indexContent) {
  // Two-step: first classify the post (which page type fits, which existing
  // pages it relates to), then draft the proposal.
  const classification = await classifyPost(client, post, indexContent);
  if (classification.skip) return { skip: true, reason: classification.reason };
  const draft = await draftProposal(client, post, classification);
  return { skip: false, draft, classification };
}

async function classifyPost(client, post, indexContent) {
  const prompt = [
    'A new Metaviews post has been published. Decide whether it is corpus-worthy',
    'for the Polycrisis of Authority simulation wiki.',
    '',
    `Post title: ${post.title}`,
    `Post date: ${post.date}`,
    post.description ? `Post description: ${post.description}` : '',
    `Post tags: ${post.tags.join(', ')}`,
    `Post content (excerpt): ${truncate(post.fullText, 800)}`,
    '',
    'Polycrisis is an AI policy simulation grounded in the Metaviews archive.',
    'The corpus is narrow: AI policy, AI governance, algorithmic authority,',
    'cognitive authority, future of authority, automation of law, memetic',
    'warfare, AI arms race, capability frontier. Posts about Canadian politics,',
    'housing, climate-only (no AI angle), or general media critique are NOT',
    'corpus-worthy unless they make a load-bearing claim about AI policy.',
    '',
    'Return JSON with:',
    '  - corpus_fit: "high" | "medium" | "low" | "skip"',
    '  - page_type: "concept" | "entity" | "theme" | "signal" | null',
    '  - related_existing_pages: array of existing wiki paths this post updates',
    '  - reason: one-sentence explanation',
    '',
    'Existing wiki index:',
    indexContent.slice(0, 6000),
    '',
    'Return ONLY JSON. No markdown fencing.',
  ].filter(Boolean).join('\n');
  const text = await client.ask(prompt);
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.corpus_fit === 'skip' || parsed.corpus_fit === 'low') {
      return { skip: true, reason: parsed.reason || 'low corpus fit' };
    }
    return parsed;
  } catch (err) {
    return { skip: true, reason: `classification parse error: ${err.message}` };
  }
}

async function draftProposal(client, post, classification) {
  const prompt = [
    'Draft a wiki proposal entry for the Polycrisis of Authority simulation.',
    'The proposal is a stub the orchestrator will review before merging into',
    'the curated wiki. Keep it tight (200-400 words).',
    '',
    `Source post: ${post.title} (${post.date})`,
    post.description ? `Source description: ${post.description}` : '',
    `Source content: ${truncate(post.fullText, 1500)}`,
    '',
    `Proposed page type: ${classification.page_type}`,
    `Corpus fit: ${classification.corpus_fit}`,
    `Related existing pages: ${(classification.related_existing_pages || []).join(', ') || '(none)'}`,
    '',
    'Frontmatter (YAML) must include:',
    '  title: <entry title>',
    '  description: <one-line summary that fits in wiki/index.md>',
    '  type: <concept|entity|theme|signal>',
    `  source: "${post.canonical || post.filePath}"`,
    `  source_date: "${post.date}"`,
    '  status: pending',
    `  corpus_fit: "${classification.corpus_fit}"`,
    '',
    'After frontmatter, write:',
    '  ## Source excerpt',
    '  Two to four sentences from the post that justify the entry.',
    '  ## Why it matters for Polycrisis',
    '  One paragraph connecting the post to the simulation',
    '  (which axis it touches, which failure pattern it grounds,',
    '  which advisor voice it supports).',
    '  ## Draft synthesis',
    '  Two to three paragraphs synthesizing the post into wiki-voice',
    '  prose, with internal links to existing pages where relevant.',
    '',
    'CRITICAL: The proposal will be saved to wiki/proposals/{file}.md.',
    'All internal links must be FILE-RELATIVE: from wiki/proposals/, the path',
    'to wiki/concepts/algorithmic-authority.md is "../concepts/algorithmic-authority.md".',
    'Use "../concepts/<slug>.md", "../entities/<slug>.md",',
    '"../themes/<slug>.md", or "../signals/<slug>.md" accordingly.',
    'Do NOT use root-relative paths like "concepts/foo.md" — they will be',
    'interpreted as relative to the proposal file and break.',
    '',
    'Return ONLY the markdown content (frontmatter + body). No commentary.',
  ].filter(Boolean).join('\n');
  const text = await client.ask(prompt, { temp: 0.2 });
  return text;
}

// ---------------------------------------------------------------
// Proposal file write
// ---------------------------------------------------------------

function proposalFileName(post) {
  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${post.date}-${slug}.md`;
}

function writeProposal(post, draft) {
  fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
  const filename = proposalFileName(post);
  const filepath = path.join(PROPOSALS_DIR, filename);
  if (fs.existsSync(filepath)) {
    console.log(`  [skip] ${filename} already exists`);
    return null;
  }
  // Sanitize LLM output: strip markdown code fences (some models wrap output)
  let body = String(draft || '')
    .replace(/^```(?:markdown|md)?\s*\n/i, '')
    .replace(/\n```\s*$/m, '')
    .trim();
  // Rewrite wiki-root-relative internal links to file-relative paths from
  // wiki/proposals/. The LLM is instructed to use file-relative paths, but
  // occasionally produces root-relative ones; this is the safety net.
  // The replacement prepends "../" to the captured href (which already
  // includes the directory segment, e.g. "concepts/foo.md").
  body = body
    .replace(/\]\((concepts\/[a-z0-9-]+\.md)\)/g, '](../$1)')
    .replace(/\]\((entities\/[a-z0-9-]+\.md)\)/g, '](../$1)')
    .replace(/\]\((themes\/[a-z0-9-]+\.md)\)/g, '](../$1)')
    .replace(/\]\((signals\/[a-z0-9-]+\.md)\)/g, '](../$1)');
  // Ensure frontmatter exists
  if (!/^---\n/.test(body)) {
    body = `---\nstatus: pending\n---\n\n${body}`;
  }
  // Inject proposal metadata if not already present
  if (!/^source_canonical:/m.test(body)) {
    body = body.replace(
      /^---\n/,
      `---\nsource_canonical: "${post.canonical || post.filePath}"\nproposed_at: "${new Date().toISOString().slice(0, 10)}"\nproposed_from: "scan --days ${post._daysWindow}"\n`,
    );
  }
  fs.writeFileSync(filepath, body);
  return filepath;
}

// ---------------------------------------------------------------
// Scan command
// ---------------------------------------------------------------

async function scan({ days }) {
  console.log(`[wiki-ingest] scan: looking at last ${days} days`);
  const indexContent = readIndex();
  const alreadyProposed = getAlreadyProposed();
  console.log(`[wiki-ingest] ${alreadyProposed.size} proposals already in queue`);

  const candidates = [];
  walk(PARENT_ARCHIVE, '.md', candidates);
  walk(PARENT_SIGNAL, '.md', candidates);
  console.log(`[wiki-ingest] ${candidates.length} files in parent archive`);

  // Pre-filter by date and tag/title
  const filtered = [];
  for (const filePath of candidates) {
    const fm = readFrontmatter(filePath);
    if (!fm) continue;
    if (!isInDateRange(fm.date, days)) continue;
    if (fm.canonical && alreadyProposed.has(fm.canonical)) continue;
    const pre = passesPreFilter(fm);
    if (!pre.pass) continue;
    filtered.push({ filePath, fm, preFilterReason: pre.reason });
  }
  console.log(`[wiki-ingest] ${filtered.length} candidates pass pre-filter (date + tag/title)`);

  if (filtered.length === 0) {
    console.log('[wiki-ingest] Nothing to do. Try --days with a larger window.');
    return;
  }

  loadEnv();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[wiki-ingest] ERROR: OPENROUTER_API_KEY not set; cannot run LLM classification');
    console.error('[wiki-ingest] (Pre-filter only — ' + filtered.length + ' candidates ready for LLM triage)');
    process.exit(1);
  }
  const client = createClient({
    title: 'Polycrisis Wiki Ingest',
    referer: 'https://polycrisis.metaviews.ca',
    temperature: 0.2,
  });
  console.log(`[wiki-ingest] using model: ${client.primaryModel}`);

  const results = { proposed: [], skipped: [], errors: [] };
  for (const { filePath, fm, preFilterReason } of filtered) {
    console.log(`\n  ${fm.date} — ${fm.title}`);
    console.log(`    pre-filter: ${preFilterReason}`);
    const fullText = extractBody(filePath);
    const post = { ...fm, fullText, filePath, _daysWindow: days };
    try {
      const result = await generateProposal(client, post, indexContent);
      if (result.skip) {
        console.log(`    skip: ${result.reason}`);
        results.skipped.push({ title: fm.title, reason: result.reason });
        continue;
      }
      const written = writeProposal(post, result.draft);
      if (written) {
        console.log(`    proposed: ${path.basename(written)}`);
        results.proposed.push(written);
      }
    } catch (err) {
      console.log(`    error: ${err.message}`);
      results.errors.push({ title: fm.title, error: err.message });
    }
  }

  console.log('\n[wiki-ingest] Scan complete:');
  console.log(`  proposed: ${results.proposed.length}`);
  console.log(`  skipped:  ${results.skipped.length}`);
  console.log(`  errors:   ${results.errors.length}`);
}

// ---------------------------------------------------------------
// Review command
// ---------------------------------------------------------------

function review() {
  if (!fs.existsSync(PROPOSALS_DIR)) {
    console.log('[wiki-ingest] No proposals yet. Run `scan` first.');
    return;
  }
  const files = fs.readdirSync(PROPOSALS_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('[wiki-ingest] No proposals in queue.');
    return;
  }
  const pending = [];
  const accepted = [];
  const rejected = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8');
    if (/^status:\s*accepted/m.test(content)) accepted.push(f);
    else if (/^status:\s*rejected/m.test(content)) rejected.push(f);
    else pending.push(f);
  }
  console.log(`[wiki-ingest] ${pending.length} pending, ${accepted.length} accepted, ${rejected.length} rejected`);
  console.log('\nPending proposals:');
  for (const f of pending) {
    const content = fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8');
    const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?/m);
    const fitMatch = content.match(/^corpus_fit:\s*['"]?(.+?)['"]?/m);
    console.log(`  ${f}`);
    console.log(`    title: ${titleMatch ? titleMatch[1] : '?'}`);
    console.log(`    fit:   ${fitMatch ? fitMatch[1] : '?'}`);
  }
  console.log('\nTo accept: node scripts/wiki-ingest.js accept <file>');
  console.log('To reject: node scripts/wiki-ingest.js reject <file>');
  console.log('To commit all accepted: node scripts/wiki-ingest.js commit');
}

// ---------------------------------------------------------------
// Accept / reject / commit commands
// ---------------------------------------------------------------

function setStatus(file, status) {
  const filepath = path.join(PROPOSALS_DIR, file);
  if (!fs.existsSync(filepath)) {
    console.error(`[wiki-ingest] Not found: ${filepath}`);
    process.exit(1);
  }
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(/^status:\s*\w+/m, `status: ${status}`);
  if (!/^status:/m.test(content)) {
    content = content.replace(/^---\n/, `---\nstatus: ${status}\n`);
  }
  if (status === 'accepted') {
    content = content.replace(/^status:\s*\w+/m, 'status: accepted');
    const date = new Date().toISOString().slice(0, 10);
    if (!/^accepted_at:/m.test(content)) {
      content = content.replace(/^---\n/, `---\naccepted_at: "${date}"\n`);
    }
  } else if (status === 'rejected') {
    if (!/^rejected_at:/m.test(content)) {
      content = content.replace(/^---\n/, `---\nrejected_at: "${new Date().toISOString().slice(0, 10)}"\n`);
    }
  }
  fs.writeFileSync(filepath, content);
  console.log(`[wiki-ingest] marked ${file} as ${status}`);
}

function commit() {
  if (!fs.existsSync(PROPOSALS_DIR)) {
    console.log('[wiki-ingest] No proposals to commit.');
    return;
  }
  const files = fs.readdirSync(PROPOSALS_DIR).filter(f => f.endsWith('.md'));
  let moved = 0;
  for (const f of files) {
    const filepath = path.join(PROPOSALS_DIR, f);
    const content = fs.readFileSync(filepath, 'utf8');
    if (!/^status:\s*accepted/m.test(content)) continue;
    // Extract the proposed page type to determine target dir
    const typeMatch = content.match(/^type:\s*(\w+)/m);
    if (!typeMatch) {
      console.log(`  [skip] ${f}: no type field, cannot route`);
      continue;
    }
    const pageType = typeMatch[1];
    let targetDir;
    switch (pageType) {
      case 'concept': targetDir = path.join(WIKI_DIR, 'concepts'); break;
      case 'entity': targetDir = path.join(WIKI_DIR, 'entities'); break;
      case 'theme': targetDir = path.join(WIKI_DIR, 'themes'); break;
      case 'signal': targetDir = path.join(WIKI_DIR, 'signals'); break;
      default:
        console.log(`  [skip] ${f}: unknown type "${pageType}"`);
        continue;
    }
    fs.mkdirSync(targetDir, { recursive: true });
    // Strip the proposal-only frontmatter fields before merging
    const merged = content
      .replace(/^status:\s*accepted\s*\n/m, '')
      .replace(/^proposed_at:\s*.+\n/m, '')
      .replace(/^proposed_from:\s*.+\n/m, '')
      .replace(/^corpus_fit:\s*.+\n/m, '')
      .replace(/^source_canonical:\s*.+\n/m, '')
      .replace(/^accepted_at:\s*.+\n/m, '');
    const targetPath = path.join(targetDir, f);
    fs.writeFileSync(targetPath, merged);
    fs.unlinkSync(filepath);
    moved += 1;
    console.log(`  [moved] ${f} → ${path.relative(WIKI_DIR, targetPath)}`);
  }
  console.log(`\n[wiki-ingest] committed ${moved} accepted proposals`);
  if (moved > 0) {
    console.log('[wiki-ingest] Run `node scripts/wiki-audit.js` to verify the new entries.');
  }
}

// ---------------------------------------------------------------
// Help
// ---------------------------------------------------------------

function printHelp() {
  console.log(`Polycrisis wiki ingest (Cycle 4a)

Usage:
  node scripts/wiki-ingest.js scan [--days N]     Scan parent archive; default window 60 days.
  node scripts/wiki-ingest.js review              Show pending proposals.
  node scripts/wiki-ingest.js accept <file>       Mark a proposal as accepted.
  node scripts/wiki-ingest.js reject <file>       Mark a proposal as rejected.
  node scripts/wiki-ingest.js commit              Move all accepted proposals into wiki/.

Pre-filter (no LLM):
  - Post must be within the last N days (default 60).
  - Post must have an AI-policy tag or title keyword.
  - Source canonical URL must not already be in the proposals queue.

LLM classification (only for pre-filter survivors):
  - corpus_fit: high / medium / low / skip
  - page_type: concept / entity / theme / signal
  - related_existing_pages: list of wiki paths this post updates

Proposals land in wiki/proposals/ as markdown stubs with frontmatter:
  status: pending | accepted | rejected
  source_canonical: <parent URL>
  corpus_fit: high | medium | low
  proposed_at: YYYY-MM-DD
`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.cmd) { printHelp(); return; }
  switch (args.cmd) {
    case 'scan': await scan(args); break;
    case 'review': review(); break;
    case 'accept': setStatus(args.file, 'accepted'); break;
    case 'reject': setStatus(args.file, 'rejected'); break;
    case 'commit': commit(); break;
    default: printHelp();
  }
}

// Exposed for testing only — not part of the CLI surface.
// These functions are the pre-filter and write path, which the verification
// script exercises with a mock LLM client.
if (require.main === module) {
  main().catch(err => {
    console.error('[wiki-ingest:fatal]', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else {
  module.exports = {
    parseArgs,
    walk,
    readFrontmatter,
    passesPreFilter,
    isInDateRange,
    getAlreadyProposed,
    extractBody,
    truncate,
    stripHtml,
    proposalFileName,
    writeProposal,
    review,
    setStatus,
    commit,
    // Constants
    AI_POLICY_TAGS,
    TITLE_KEYWORDS,
  };
}