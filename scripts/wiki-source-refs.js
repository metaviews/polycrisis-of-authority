'use strict';

/**
 * wiki-source-refs.js
 *
 * Deterministically enriches wiki concept/entity/theme pages with source path
 * references by matching their `## Key posts` bullets to local archive post
 * frontmatter titles. This improves operator auditability without asking an LLM
 * to rewrite synthesized pages.
 */

const fs = require('fs');
const path = require('path');

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/^\s*\d{4}-\d{2}-\d{2}\s*[-–—:]\s*/, '')
    .replace(/^\s*\d+\s*:\s*/, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const block = content.slice(3, end).trim();
  const data = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    data[match[1]] = value;
  }
  return data;
}


function findSectionRange(content, heading) {
  const lines = String(content || '').split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${heading}\\b`, 'i').test(line));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const offsets = [];
  let cursor = 0;
  for (const line of lines) {
    offsets.push(cursor);
    cursor += line.length + 1;
  }
  return {
    text: lines.slice(start, end).join('\n'),
    start: offsets[start],
    end: end < lines.length ? offsets[end] : content.length,
  };
}

function sectionBody(content, heading) {
  const lines = String(content || '').split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${heading}\\b`, 'i').test(line));
  if (start === -1) return '';
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

function parseKeyPostTitles(content) {
  const titles = [];
  const body = sectionBody(content, 'Key posts');
  if (!body) return titles;

  for (const line of body.split(/\r?\n/)) {
    if (!line.trim().startsWith('-')) continue;
    const bracketMatch = line.match(/\*\*\[([^\]]+)\]\*\*/);
    const boldMatch = line.match(/\*\*([^*]+)\*\*/);
    const raw = (bracketMatch && bracketMatch[1]) || (boldMatch && boldMatch[1]);
    if (!raw) continue;
    const title = raw
      .replace(/^\[([^\]]+)\]\([^)]*\)$/, '$1')
      .replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, '')
      .replace(/^\d{4}-\d{2}-\d{2}\]\s*/, '')
      .replace(/^\d{4}-\d{2}-\d{2}\s+/, '')
      .trim();
    if (title) titles.push(title);
  }
  return titles;
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files.sort();
}

function readArchiveCatalog(rootDir) {
  const archiveDir = path.join(rootDir, 'src/intelligence/archive');
  const catalog = new Map();
  for (const filePath of walkMarkdown(archiveDir)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter.title) continue;
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
    const entry = {
      title: frontmatter.title,
      date: frontmatter.date || '',
      relativePath,
    };
    const normalized = normalizeTitle(frontmatter.title);
    if (normalized && !catalog.has(normalized)) catalog.set(normalized, entry);
  }
  return catalog;
}

function candidateTitles(title) {
  const raw = String(title || '').trim();
  return [
    raw,
    raw.replace(/^\d+\s*:\s*/, ''),
    raw.replace(/^#?\d+\s*[-–—:]\s*/, ''),
    raw.replace(/^\d{4}-\d{2}-\d{2}\s*[-–—:]\s*/, ''),
  ].map(normalizeTitle).filter(Boolean);
}

function matchKeyPostsToArchive(titles, catalog) {
  const matches = [];
  const seen = new Set();
  for (const title of titles) {
    let match = null;
    for (const candidate of candidateTitles(title)) {
      if (catalog.has(candidate)) {
        match = catalog.get(candidate);
        break;
      }
    }
    if (!match || seen.has(match.relativePath)) continue;
    seen.add(match.relativePath);
    matches.push(match);
  }
  return matches;
}

function appendRelatedArchivePosts(content, matches) {
  if (!matches.length) return content;
  const existing = new Set();
  const existingSection = findSectionRange(content, 'Related archive posts');
  if (existingSection) {
    for (const match of existingSection.text.matchAll(/`([^`]+)`/g)) existing.add(match[1]);
  }
  const paths = matches.map((match) => match.relativePath).filter((relativePath) => !existing.has(relativePath));
  if (!paths.length) return content;

  if (existingSection) {
    const replacement = existingSection.text.replace(/\s*$/, '') + '\n' + paths.map((relativePath) => `- \`${relativePath}\``).join('\n') + '\n';
    return content.slice(0, existingSection.start) + replacement + content.slice(existingSection.end);
  }

  return content.replace(/\s*$/, '') + '\n\n## Related archive posts\n\n' + paths.map((relativePath) => `- \`${relativePath}\``).join('\n') + '\n';
}

function wikiSourceFiles(rootDir) {
  const wikiDir = path.join(rootDir, 'wiki');
  return ['concepts', 'entities', 'themes']
    .flatMap((section) => walkMarkdown(path.join(wikiDir, section)));
}

function enrichWikiSourceRefs(rootDir = process.cwd(), options = {}) {
  const catalog = readArchiveCatalog(rootDir);
  const updated = [];
  const unmatched = [];
  const dryRun = Boolean(options.dryRun);

  for (const filePath of wikiSourceFiles(rootDir)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const titles = parseKeyPostTitles(content);
    if (!titles.length) continue;
    const matches = matchKeyPostsToArchive(titles, catalog);
    if (!matches.length) {
      unmatched.push({ wikiPath: path.relative(rootDir, filePath).split(path.sep).join('/'), titles });
      continue;
    }
    const next = appendRelatedArchivePosts(content, matches);
    if (next !== content) {
      if (!dryRun) fs.writeFileSync(filePath, next);
      updated.push({
        wikiPath: path.relative(rootDir, filePath).split(path.sep).join('/'),
        sourceCount: matches.length,
        sources: matches.map((match) => match.relativePath),
      });
    }
    const matchedTitles = new Set(matches.map((match) => normalizeTitle(match.title)));
    const missingTitles = titles.filter((title) => !candidateTitles(title).some((candidate) => matchedTitles.has(candidate)));
    if (missingTitles.length) unmatched.push({ wikiPath: path.relative(rootDir, filePath).split(path.sep).join('/'), titles: missingTitles });
  }

  return { updated, unmatched, catalogSize: catalog.size };
}

function formatResult(result, options = {}) {
  const lines = [
    '# Wiki source reference enrichment',
    '',
    options.dryRun ? 'Mode: dry run' : 'Mode: write',
    `Archive posts indexed: ${result.catalogSize}`,
    `Wiki pages updated: ${result.updated.length}`,
    `Pages with unmatched key posts: ${result.unmatched.length}`,
    '',
  ];
  if (result.updated.length) {
    lines.push('## Updated pages', '');
    for (const item of result.updated) lines.push(`- ${item.wikiPath} (${item.sourceCount} source refs)`);
    lines.push('');
  }
  if (result.unmatched.length) {
    lines.push('## Unmatched key posts', '');
    for (const item of result.unmatched.slice(0, 25)) lines.push(`- ${item.wikiPath}: ${item.titles.join('; ')}`);
    if (result.unmatched.length > 25) lines.push(`- ... ${result.unmatched.length - 25} more`);
  }
  return lines.join('\n').trimEnd() + '\n';
}

function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');
  const result = enrichWikiSourceRefs(process.cwd(), { dryRun });
  process.stdout.write(formatResult(result, { dryRun }));
}

if (require.main === module) main();

module.exports = {
  normalizeTitle,
  parseKeyPostTitles,
  readArchiveCatalog,
  matchKeyPostsToArchive,
  appendRelatedArchivePosts,
  enrichWikiSourceRefs,
  formatResult,
};
