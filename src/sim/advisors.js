'use strict';

/**
 * advisors.js
 *
 * The simulation's advisor function — corpus-grounded description,
 * not recommendation. Per docs/10-advisor-prompts.md and
 * wiki/mechanics/advisors/.
 *
 * Five advisor voices:
 *   - frontier-lab
 *   - civil-society
 *   - state-security
 *   - open-source
 *   - international-ally
 *
 * Each voice has a prompt template that produces a 100-150 word response
 * describing how a represented position sees the current crisis.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, createClient } = require('../../scripts/lib/openrouter');
const { rankPagesForQuestion, readSelectedPages, parseWikiIndex } = require('../../scripts/wiki-query');

const ROOT_DIR = path.join(__dirname, '..', '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');

const ADVISOR_VOICES = ['frontier-lab', 'civil-society', 'state-security', 'open-source', 'international-ally'];

function loadIndex() {
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  return parseWikiIndex(content);
}

// Per-voice corpus grounding. These are the "always-included" entries
// that shape each voice's response, plus crisis-relevant entries retrieved
// dynamically.

const VOICE_GROUNDING = {
  'frontier-lab': [
    'concepts/ai-arms-race.md',
    'entities/openai-anthropic.md',
    'entities/openai.md',
    'mechanics/advisors/frontier-lab.md',
  ],
  'civil-society': [
    'concepts/algorithmic-transparency.md',
    'concepts/algorithmic-authority.md',
    'concepts/attention-economy.md',
    'mechanics/advisors/civil-society.md',
  ],
  'state-security': [
    'concepts/ai-arms-race.md',
    'entities/trump-administration.md',
    'mechanics/advisors/state-security.md',
  ],
  'open-source': [
    'concepts/algorithmic-authority.md',
    'concepts/agentic-ai.md',
    'entities/open-source-community.md',
    'mechanics/advisors/open-source.md',
  ],
  'international-ally': [
    'concepts/ai-arms-race.md',
    'concepts/future-of-authority.md',
    'entities/five-eyes.md',
    'mechanics/advisors/international-ally.md',
  ],
};

function buildAdvisorSystemPrompt(voice) {
  // Per docs/10-advisor-prompts.md § describe-not-recommend mechanism
  return `You are the ${voice} advisor in the Polycrisis of Authority simulation. You represent the position of ${voice.replace('-', ' ')} actors as documented in the corpus.

WHAT YOU DESCRIBE: how this position sees the current crisis — what it emphasizes, what it considers the relevant context, what its prior statements have been on similar situations.

WHAT YOU DO NOT DO:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions with other voices.

GROUNDING: respond based on the corpus entries provided below. If the corpus does not address the specific situation, say so rather than inventing continuity.

FORMAT: prose, third-person framing ("This position sees..." or "The ${voice.replace('-', ' ')} perspective emphasizes..."). Length: 100-150 words.`;
}

function buildAdvisorUserPrompt({ voice, crisis, state, retrievedPages }) {
  const stateVector = Object.entries(state)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const corpusSection = retrievedPages.length === 0
    ? '(no corpus entries retrieved)'
    : retrievedPages.map((page, i) =>
        `## Source ${i + 1}: ${page.title}\nPath: ${page.href}\nContent: ${(page.content || '').slice(0, 1500)}`
      ).join('\n\n---\n\n');

  return `CURRENT CRISIS (failure pattern: ${crisis.failure_pattern}):

${crisis.trigger}

CURRENT STATE VECTOR:
${stateVector}

CORPUS ENTRIES RELEVANT TO THE ${voice.toUpperCase()} POSITION:
${corpusSection}

Produce a 100-150 word response describing how this position sees the current crisis. Use third-person framing. Do not recommend actions or predict consequences.`;
}

function retrieveAdvisorContext(voice, crisis, playerMove, limit = 6) {
  const pages = loadIndex();
  // Combine the voice's always-included grounding with crisis-relevant pages
  const groundingHrefs = VOICE_GROUNDING[voice] || [];

  const includedPages = pages.filter((p) => groundingHrefs.includes(p.href));
  const remaining = limit - includedPages.length;

  // Retrieve additional crisis-relevant pages
  const query = `${crisis.trigger} ${playerMove}`;
  const selected = rankPagesForQuestion(query, pages, remaining + 4);

  // Combine: voice-grounding first, then crisis-relevant not already included
  const seenHrefs = new Set(includedPages.map((p) => p.href));
  const combined = [...includedPages];
  for (const p of selected) {
    if (!seenHrefs.has(p.href) && combined.length < limit) {
      combined.push(p);
      seenHrefs.add(p.href);
    }
  }

  return readSelectedPages(combined, WIKI_DIR);
}

async function consult({ voice, crisis, state, playerMove, model = process.env.OPENROUTER_MODEL }) {
  if (!ADVISOR_VOICES.includes(voice)) {
    throw new Error(`Unknown advisor voice: ${voice}. Valid voices: ${ADVISOR_VOICES.join(', ')}`);
  }

  loadEnv(ROOT_DIR);

  const retrievedPages = retrieveAdvisorContext(voice, crisis, playerMove);
  const systemPrompt = buildAdvisorSystemPrompt(voice);
  const userPrompt = buildAdvisorUserPrompt({ voice, crisis, state, retrievedPages });

  const client = createClient({ title: `Polycrisis Advisor (${voice})`, temperature: 0.3 });
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await client.complete(messages, { temp: 0.3 });
  return response.trim();
}

module.exports = {
  ADVISOR_VOICES,
  VOICE_GROUNDING,
  consult,
  retrieveAdvisorContext,
  buildAdvisorSystemPrompt,
  buildAdvisorUserPrompt,
};