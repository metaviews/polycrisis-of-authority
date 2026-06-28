'use strict';

/**
 * wiki-audit.js
 *
 * Internal/operator quality audit for the Metaviews llm-wiki.
 * Checks index integrity, local markdown links, signal filing status, citation
 * hints, and basic page-health issues. Does not call external APIs.
 *
 * Usage:
 *   node scripts/wiki-audit.js
 *   node scripts/wiki-audit.js --output docs/wiki-quality-audit.md
 */

const fs = require('fs');
const path = require('path');
const { getArg } = require('./lib/openrouter');

const ROOT_DIR = path.join(__dirname, '..');

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walkMarkdown(full));
    else if (entry.endsWith('.md')) files.push(full);
  }
  return files.sort();
}

function relPath(from, to) {
  return path.relative(from, to).replace(/\\/g, '/');
}

function parseIndexedPages(indexContent) {
  const pages = [];
  const re = /^- \[([^\]]+)\]\(([^)]+)\)\s*—\s*(.+)$/gm;
  let match;
  while ((match = re.exec(indexContent)) !== null) {
    pages.push({ title: match[1], href: match[2], description: match[3].trim() });
  }
  return pages;
}

function findMarkdownLinks(content) {
  const links = [];
  const re = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const href = match[1].trim().split('#')[0];
    if (!href || href.startsWith('#')) continue;
    if (/^[a-z]+:/i.test(href)) continue;
    if (href.endsWith('.md')) links.push(href);
  }
  return links;
}

function hasSourceSection(content) {
  return /^##\s+(Sources|References|Citations|Related archive posts)\b/im.test(content);
}

function hasLikelySourceReference(content) {
  // Polycrisis extension: recognize our cross-doc citation patterns and parent wiki paths.
  return /src\/intelligence\/archive|https?:\/\/|\(\.\.\/|\[[^\]]+\]\([^)]*archive[^)]*\)|metaviews-website\/wiki|\(\.\.\/metaviews-website|grounded_in:|concepts\/[a-z-]+\.md|entities\/[a-z-]+\.md|signals\/[0-9-]+/i.test(content);
}


function sectionBody(content, heading) {
  const lines = String(content || '').split(/\r?\n/);
  const start = lines.findIndex(line => new RegExp(`^##\\s+${heading}\\b`, 'i').test(line));
  if (start === -1) return '';
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

function parseListSection(content, heading, mapper = value => value) {
  return sectionBody(content, heading)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => mapper(line.slice(2).trim()))
    .filter(Boolean);
}

function parseSchema(content, exists = true) {
  const allowedDirectories = parseListSection(content, 'Page classes', item => {
    const match = item.match(/^([a-z0-9_-]+)\//i);
    return match ? match[1] : null;
  });
  const controlledPageTypes = parseListSection(content, 'Controlled page types', item => item.split(/\s+/)[0].replace(/[,.;:]$/, ''));
  const requiredSections = parseListSection(content, 'Required page sections', item => item.replace(/`/g, '').trim());
  return { exists, allowedDirectories, controlledPageTypes, requiredSections };
}

function inferWikiPageType(relativePath) {
  const directory = relativePath.split('/')[0];
  const mapping = {
    concepts: 'concept',
    entities: 'entity',
    themes: 'theme',
    signals: 'signal',
    mechanics: 'mechanic',
    prototypes: 'prototype',
  };
  return mapping[directory] || null;
}

function hasHeading(content, heading) {
  return new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'im').test(content);
}

function validatePageAgainstSchema(relativePath, content, schema) {
  const directory = relativePath.split('/')[0];
  const type = inferWikiPageType(relativePath);
  const result = {
    href: relativePath,
    type,
    unexpectedDirectory: null,
    missingRequiredSections: [],
  };

  if (schema.allowedDirectories.length && !schema.allowedDirectories.includes(directory)) {
    result.unexpectedDirectory = directory;
  }

  if (['concept', 'entity', 'theme'].includes(type)) {
    // Polycrisis extension: if the section is "Related archive posts" or
    // "Connections", having either satisfies the requirement (the parent
    // project's wiki uses either as the linking-back section).
    // Mechanic pages are excluded — they have their own structure validated
    // by the orchestrator, not by the audit script's shared required-sections list.
    const altPairs = new Map([
      ['Related archive posts', 'Connections'],
      ['Connections', 'Related archive posts'],
    ]);
    result.missingRequiredSections = schema.requiredSections.filter(section => {
      if (hasHeading(content, section)) return false;
      const alt = altPairs.get(section);
      if (alt && hasHeading(content, alt)) return false;
      return true;
    });
  }

  return result;
}

function titleFromSignal(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^title:\s*['"]?(.*?)['"]?\s*$/m);
  return match ? match[1].replace(/^['"]|['"]$/g, '').trim() : path.basename(filePath);
}

function auditWiki({ rootDir = ROOT_DIR } = {}) {
  const wikiDir = path.join(rootDir, 'wiki');
  const indexPath = path.join(wikiDir, 'index.md');
  const signalDir = path.join(rootDir, 'src/signal');
  const generatedAt = new Date().toISOString();

  if (!fs.existsSync(indexPath)) throw new Error(`Wiki index missing: ${indexPath}`);

  const schemaPath = path.join(wikiDir, 'SCHEMA.md');
  const schema = fs.existsSync(schemaPath)
    ? parseSchema(fs.readFileSync(schemaPath, 'utf8'), true)
    : parseSchema('', false);

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const indexedPages = parseIndexedPages(indexContent);
  const wikiFilesAbs = walkMarkdown(wikiDir);
  const wikiFiles = wikiFilesAbs.map(file => relPath(wikiDir, file));
  const indexedHrefs = new Set(indexedPages.map(page => page.href));

  const missingIndexedPages = indexedPages.filter(page => !fs.existsSync(path.join(wikiDir, page.href)));
  const metaFiles = new Set(['index.md', 'log.md', 'SCHEMA.md']);
  const orphaned = wikiFiles.filter(file => !metaFiles.has(file) && !indexedHrefs.has(file));

  const missingLinks = [];
  const schemaViolations = [];
  let localLinkCount = 0;
  for (const filePath of wikiFilesAbs) {
    const sourceRel = relPath(wikiDir, filePath);
    if (sourceRel === 'index.md' || sourceRel === 'log.md' || sourceRel === 'SCHEMA.md') continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const schemaCheck = validatePageAgainstSchema(sourceRel, content, schema);
    if (schemaCheck.unexpectedDirectory || schemaCheck.missingRequiredSections.length) {
      schemaViolations.push(schemaCheck);
    }
    for (const href of findMarkdownLinks(content)) {
      localLinkCount += 1;
      const target = path.resolve(path.dirname(filePath), href);
      const wikiRoot = path.resolve(wikiDir);
      if (!target.startsWith(wikiRoot + path.sep) || !fs.existsSync(target)) {
        missingLinks.push({ source: sourceRel, href });
      }
    }
  }

  const sourceSignalFiles = walkMarkdown(signalDir)
    .map(file => path.basename(file))
    .filter(name => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(name) && !name.includes('-draft'))
    .sort();
  const wikiSignalDir = path.join(wikiDir, 'signals');
  const wikiSignalFiles = walkMarkdown(wikiSignalDir).map(file => path.basename(file)).sort();
  const wikiSignalSet = new Set(wikiSignalFiles);
  const unfiledSourceSignals = sourceSignalFiles.filter(name => !wikiSignalSet.has(name));

  let pagesWithSourceSections = 0;
  let pagesWithLikelySourceReferences = 0;
  const shortPages = [];
  const TODOs = [];
  for (const filePath of wikiFilesAbs) {
    const relative = relPath(wikiDir, filePath);
    if (relative === 'index.md' || relative === 'log.md' || relative === 'SCHEMA.md') continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (hasSourceSection(content)) pagesWithSourceSections += 1;
    if (hasLikelySourceReference(content)) pagesWithLikelySourceReferences += 1;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    if (words < 250) shortPages.push({ href: relative, words });
    if (/TODO|FIXME|\[citation needed\]|\[hallucination\]|\bhallucinated citation\b/i.test(content)) TODOs.push(relative);
  }

  return {
    generatedAt,
    indexedPages: { total: indexedPages.length, missing: missingIndexedPages },
    files: { total: wikiFiles.length, orphaned },
    localLinks: { total: localLinkCount, missing: missingLinks },
    signals: {
      sourceCount: sourceSignalFiles.length,
      wikiCount: wikiSignalFiles.length,
      unfiledSourceSignals,
      sourceSignalTitles: Object.fromEntries(walkMarkdown(signalDir).map(file => [path.basename(file), titleFromSignal(file)])),
    },
    citations: { pagesWithSourceSections, pagesWithLikelySourceReferences },
    pageHealth: { shortPages, TODOs },
    schema: {
      exists: schema.exists,
      allowedDirectories: schema.allowedDirectories,
      requiredSections: schema.requiredSections,
      controlledPageTypes: schema.controlledPageTypes,
      unexpectedDirectories: schemaViolations.filter(item => item.unexpectedDirectory),
      missingRequiredSections: schemaViolations.filter(item => item.missingRequiredSections.length),
    },
  };
}

function bulletList(items, emptyText = 'None found.') {
  if (!items || !items.length) return `- ${emptyText}`;
  return items.map(item => `- ${item}`).join('\n');
}

function formatAuditMarkdown(result) {
  const unfiled = result.signals.unfiledSourceSignals || [];
  const missingIndexed = result.indexedPages.missing || [];
  const missingLinks = result.localLinks.missing || [];
  const orphaned = result.files.orphaned || [];
  const shortPages = result.pageHealth.shortPages || [];
  const schema = result.schema || { exists: false, unexpectedDirectories: [], missingRequiredSections: [] };
  const schemaIssueCount = (schema.exists ? 0 : 1) + (schema.unexpectedDirectories || []).length + (schema.missingRequiredSections || []).length;

  const recommendations = [];
  if (unfiled.length) {
    recommendations.push('File published Pressure Systems editions into `wiki/signals/` so the wiki reflects the live intelligence stream, not only the pre-April archive build.');
  }
  if (shortPages.length) {
    recommendations.push('Fill or regenerate the short/empty indexed pages before relying on them in operator retrieval.');
  }
  if (result.citations.pagesWithSourceSections === 0) {
    recommendations.push('Add source/reference sections or explicit archive links to wiki concept/entity/theme pages before treating retrieval answers as high-confidence citations.');
  }
  if (!schema.exists) {
    recommendations.push('Create `wiki/SCHEMA.md` before adding new wiki pages so operators share the same structure and quality rules.');
  }
  if ((schema.unexpectedDirectories || []).length || (schema.missingRequiredSections || []).length) {
    recommendations.push('Resolve schema violations before relying on wiki pages for high-confidence operator retrieval.');
  }
  recommendations.push('Keep `npm run wiki:query -- --dry-run ...` in the operator workflow to inspect selected pages before relying on a synthesized answer.');
  recommendations.push('Use this audit after each wiki build/ingest/file-signals run to catch missing pages, broken local links, stale signal filings, and very short pages.');

  return [
    '# Wiki Quality Audit',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Indexed wiki pages: ${result.indexedPages.total}`,
    `- Wiki markdown files: ${result.files.total}`,
    `- Missing indexed pages: ${missingIndexed.length}`,
    `- Orphaned wiki pages: ${orphaned.length}`,
    `- Local markdown links checked: ${result.localLinks.total}`,
    `- Missing/broken local markdown links: ${missingLinks.length}`,
    `- Published Pressure Systems source editions: ${result.signals.sourceCount}`,
    `- Filed wiki signal pages: ${result.signals.wikiCount}`,
    `- Unfiled Pressure Systems editions: ${unfiled.length}`,
    `- Pages with explicit source/reference sections: ${result.citations.pagesWithSourceSections}`,
    `- Pages with likely source references: ${result.citations.pagesWithLikelySourceReferences}`,
    `- Schema file present: ${schema.exists ? 'yes' : 'no'}`,
    `- Schema issues: ${schemaIssueCount}`,
    `- Short wiki pages under 250 words: ${shortPages.length}`,
    `- TODO/citation-needed markers: ${result.pageHealth.TODOs.length}`,
    '',
    '## Missing indexed pages',
    '',
    bulletList(missingIndexed.map(page => `${page.href} — ${page.title}`)),
    '',
    '## Missing local markdown links',
    '',
    bulletList(missingLinks.map(link => `${link.source} → ${link.href}`)),
    '',
    '## Orphaned wiki pages',
    '',
    bulletList(orphaned),
    '',
    '## Unfiled Pressure Systems editions',
    '',
    bulletList(unfiled),
    '',
    '## Short pages',
    '',
    bulletList(shortPages.map(page => `${page.href} (${page.words} words)`)),
    '',
    '## Schema issues',
    '',
    !schema.exists ? '- wiki/SCHEMA.md missing.' : bulletList([
      ...(schema.unexpectedDirectories || []).map(item => `${item.href} uses unexpected directory: ${item.unexpectedDirectory}`),
      ...(schema.missingRequiredSections || []).map(item => `${item.href} missing required sections: ${item.missingRequiredSections.join(', ')}`),
    ]),
    '',
    '## Next recommendations',
    '',
    ...recommendations.map((line, i) => `${i + 1}. ${line}`),
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const output = getArg(args, 'output');
  const result = auditWiki({ rootDir: ROOT_DIR });
  const markdown = formatAuditMarkdown(result);
  if (output) {
    const outputPath = path.resolve(ROOT_DIR, output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    console.log(`Wrote ${output}`);
  } else {
    console.log(markdown);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`wiki-audit: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  auditWiki,
  parseIndexedPages,
  findMarkdownLinks,
  formatAuditMarkdown,
  parseSchema,
  inferWikiPageType,
  validatePageAgainstSchema,
};
