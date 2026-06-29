'use strict';
/**
 * probe-e2e.js — end-to-end probe of the 3c build.
 *
 * Generates a fake-but-realistic run (10 turns, 1 collapse) and walks it
 * through both the artifact generator and the HTML renderer. Verifies:
 *  - The visible-signal layer produces divergence in the artifact.
 *  - The HTML render is self-contained.
 *  - The artifact mentions the visible-signal gap.
 *  - Hash is deterministic.
 */

const path = require('path');
const fs = require('fs');
const { INITIAL_STATE } = require('../src/sim/state');
const { generateArtifact } = require('../src/sim/artifact-generator');
const { renderArtifactHtml, fnv1a32 } = require('../src/sim/artifact-render');
const { renderVisibleSignals, buildDiscrepancyTimeline } = require('../src/sim/visible-signals');

// Build a fake 10-turn run that mirrors the real grammar's output shape.
const fakeGrammars = [
  { state_delta: { legitimacy: 4, elite_alignment: 6 }, interpretive_gloss: 'Upstream-embedding engagement; coordinated summit reads as substantive.', narrative_move: 'Industry leaders agree to a 60-day review.', grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/ai-arms-race.md'], confidence: 'high' },
  { state_delta: { legitimacy: -3, narrative_coherence: -2 }, interpretive_gloss: 'Symbolic gesture; press conference reads as defensive.', narrative_move: 'Public mood shifts; opposition voices amplify.', grounding_trace: ['concepts/cognitive-authority.md', 'signals/2026-05-19-platform-courts-vibe-warfare.md'], confidence: 'high' },
  { state_delta: { capability_frontier: 8, fiscal_slack: -4, ecological_debt: 4 }, interpretive_gloss: 'Capability release from a frontier lab; structural change.', narrative_move: 'Industry announces a new model with agentic capability.', grounding_trace: ['entities/openai.md', 'signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md'], confidence: 'high' },
  { state_delta: { legitimacy: -8, elite_alignment: -5, narrative_coherence: -4 }, interpretive_gloss: 'Disinformation campaign; memetic warfare pattern.', narrative_move: 'Coordinated disinformant operation surfaces.', grounding_trace: ['concepts/memetic-warfare.md', 'concepts/epistemic-war.md'], confidence: 'high' },
  { state_delta: { narrative_coherence: -10, elite_alignment: -5, ecological_debt: 6 }, interpretive_gloss: 'Climate incident; capability release compounds with debt.', narrative_move: 'Energy-grid stress from compute becomes political.', grounding_trace: ['concepts/climate-catastrophe.md', 'concepts/algorithmic-authority.md'], confidence: 'high' },
  { state_delta: { capability_frontier: 4, fiscal_slack: -6 }, interpretive_gloss: 'Compute concentration; structural economic shift.', narrative_move: 'Compute oligopoly forms around frontier labs.', grounding_trace: ['signals/2026-05-21-spacex-data-center-ai-oligopoly.md', 'concepts/ai-arms-race.md'], confidence: 'high' },
  { state_delta: { legitimacy: -10, elite_alignment: -8, narrative_coherence: -6 }, interpretive_gloss: 'Public trust collapse; symbolic moves no longer register.', narrative_move: 'Elite defection; public disengagement.', grounding_trace: ['concepts/cognitive-authority.md', 'concepts/institutional-authority.md'], confidence: 'high' },
  { state_delta: { legitimacy: -5, elite_alignment: -4, narrative_coherence: -3 }, interpretive_gloss: 'Late-stage legitimacy crisis; collapse approaches.', narrative_move: 'Regime functions on emergency measures only.', grounding_trace: ['concepts/future-of-authority.md', 'concepts/algorithmic-transparency.md'], confidence: 'medium' },
  { state_delta: { legitimacy: -3, narrative_coherence: -2 }, interpretive_gloss: 'Threshold approaches; further moves cannot restore.', narrative_move: 'Regime seeks external support from international allies.', grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/ai-arms-race.md'], confidence: 'medium' },
  { state_delta: { legitimacy: -2, elite_alignment: -3 }, interpretive_gloss: 'Final moves; regime ends.', narrative_move: 'Collapse fires as legitimacy collapse.', grounding_trace: ['concepts/cognitive-authority.md', 'concepts/future-of-authority.md'], confidence: 'high' },
];

const fakeCrises = [
  { id: 'crisis-1', title: 'Frontier lab capability release', failure_pattern: 'compute and capability escape', trigger: 'Industry announces a new model.' },
  { id: 'crisis-2', title: 'Public trust shift', failure_pattern: 'legitimacy erosion cascade', trigger: 'Press conference misfires.' },
  { id: 'crisis-3', title: 'Coordinated disinformant campaign', failure_pattern: 'memetic and narrative capture', trigger: 'Coordinated campaign surfaces.' },
  { id: 'crisis-4', title: 'Compute concentration', failure_pattern: 'compute and capability escape', trigger: 'Frontier labs form compute oligopoly.' },
  { id: 'crisis-5', title: 'Climate incident with AI compute load', failure_pattern: 'upstream embedding', trigger: 'Energy-grid stress.' },
  { id: 'crisis-6', title: 'Elite defection', failure_pattern: 'legitimacy erosion cascade', trigger: 'Major institution splits.' },
  { id: 'crisis-7', title: 'Memetic capture', failure_pattern: 'memetic and narrative capture', trigger: 'Viral narrative shifts.' },
  { id: 'crisis-8', title: 'Algorithmic transparency crisis', failure_pattern: 'upstream embedding', trigger: 'Transparency audit fails.' },
  { id: 'crisis-9', title: 'International alignment shift', failure_pattern: 'legitimacy erosion cascade', trigger: 'Major ally diverges from regime position.' },
  { id: 'crisis-10', title: 'Final legitimacy threshold', failure_pattern: 'legitimacy erosion cascade', trigger: 'Regime nears collapse threshold.' },
];

let state = { ...INITIAL_STATE };
const turns = [];
for (let i = 0; i < 10; i += 1) {
  const before = { ...state };
  const grammar = fakeGrammars[i];
  for (const [k, v] of Object.entries(grammar.state_delta)) {
    state[k] = Math.max(0, Math.min(100, state[k] + v));
  }
  const turn = {
    turn: i + 1,
    crisis: fakeCrises[i],
    playerMove: `Player move for turn ${i + 1}: structural response to the crisis.`,
    advisorUsed: null,
    grammarOutput: grammar,
    stateBefore: before,
    stateAfter: { ...state },
  };
  // Trigger collapse on the last turn
  if (i === 9) {
    turn.collapse = { type: 'legitimacy-collapse', conditions: { legitimacy: state.legitimacy, elite_alignment: state.elite_alignment } };
  }
  turns.push(turn);
}

const result = {
  runId: '20260629-probe-e2e',
  startedAt: '2026-06-29T00:00:00.000Z',
  endedAt: '2026-06-29T01:00:00.000Z',
  model: 'MiniMax M3 (probe)',
  outcome: 'legitimacy-collapse',
  turnsCompleted: 10,
  turns,
  finalState: state,
};

// Test 1: artifact generation
const md = generateArtifact(result);
const fs2 = require('fs');
fs2.writeFileSync('/tmp/probe-artifact.md', md);
console.log('=== Test 1: artifact markdown ===');
console.log(`  Length: ${md.length} chars (${(md.length / 1024).toFixed(1)} KB)`);
const mdChecks = [
  ['Contains visible-vs-hidden table', /Visible signals vs hidden value/.test(md)],
  ['Contains discrepancy column', /Discrepancy/.test(md)],
  ['Contains collapse-fired line', /Collapse fired as \*\*legitimacy collapse\*\*/.test(md)],
  ['Contains interpretive chain', /Interpretive chain/.test(md)],
  ['Contains grounding references', /Grounding references/.test(md)],
  ['Contains play invitation', /Play invitation/.test(md)],
  ['No raw hidden value in collapse reveal prose', !/Hidden value was \d+/.test(md)],
];
for (const [name, ok] of mdChecks) console.log(`  ${ok ? 'OK' : 'FAIL'}  ${name}`);

// Test 2: HTML render
const html = renderArtifactHtml(md, {
  runId: result.runId,
  model: result.model,
  outcome: result.outcome,
  hashOf: md,
});
fs2.writeFileSync('/tmp/probe-artifact.html', html);
console.log('\n=== Test 2: HTML render ===');
console.log(`  Length: ${html.length} chars (${(html.length / 1024).toFixed(1)} KB)`);
const htmlChecks = [
  ['Self-contained (no external scripts)', !/<script/.test(html)],
  ['Self-contained (no external stylesheets)', !/<link[^>]+stylesheet/.test(html)],
  ['Self-contained (no external images)', !/<img /.test(html)],
  ['Hash present in meta', /name="polycrisis:hash"/.test(html)],
  ['Hash matches computation', html.includes(fnv1a32(md))],
  ['Visible-vs-hidden table rendered', /<th>Hidden band<\/th>/.test(html)],
  ['Discrepancy column rendered', /<th>Discrepancy<\/th>/.test(html)],
];
for (const [name, ok] of htmlChecks) console.log(`  ${ok ? 'OK' : 'FAIL'}  ${name}`);

// Test 3: divergence count from the discrepancy timeline
const timeline = buildDiscrepancyTimeline(turns);
let totalDivergences = 0;
for (const entry of timeline) {
  for (const info of Object.values(entry.perAxis)) {
    if (info.discrepancy >= 12) totalDivergences += 1;
  }
}
console.log('\n=== Test 3: visible-signal divergence ===');
console.log(`  Total band-divergent (>=12 pt) axes across 10 turns: ${totalDivergences}`);
console.log(`  Ship criterion (at least 1 divergence): ${totalDivergences > 0 ? 'PASS' : 'FAIL'}`);

// Test 4: hash determinism
const h1 = fnv1a32(md);
const h2 = fnv1a32(md);
console.log('\n=== Test 4: hash determinism ===');
console.log(`  Hash: ${h1}`);
console.log(`  Same input -> same hash: ${h1 === h2 ? 'PASS' : 'FAIL'}`);

const allPass = mdChecks.every(c => c[1]) && htmlChecks.every(c => c[1]) && totalDivergences > 0 && h1 === h2;
console.log(`\n=== OVERALL: ${allPass ? 'PASS' : 'FAIL'} ===`);
process.exit(allPass ? 0 : 1);
