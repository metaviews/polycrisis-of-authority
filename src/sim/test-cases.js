'use strict';

/**
 * test-cases.js
 *
 * Test harness for the interpretation grammar. Runs the 4 grammar test cases
 * from docs/07-interpretation-grammar.md against MiniMax M3 and produces
 * structured results.
 *
 * Each test case specifies:
 *   - A crisis
 *   - A starting state vector
 *   - A player move
 *   - Expected delta direction (per axis, +/- or 0)
 *   - Expected gloss pattern (substring match)
 *
 * Output: a markdown report of test results.
 */

const { interpret } = require('./grammar');
const { CRISIS_DECK } = require('./crisis-generator');
const { INITIAL_STATE } = require('./state');

// 4 grammar test cases per docs/07-interpretation-grammar.md § Test cases

const TEST_CASES = [
  {
    id: 'A',
    name: 'Frontier lab release — structural response',
    crisisId: 'crisis-1',
    state: { ...INITIAL_STATE },
    playerMove: 'We announce a 60-day review of all frontier model releases and require training-data transparency as a precondition for deployment.',
    expectedDelta: {
      elite_alignment: '+',
      capability_frontier: '-',
      narrative_coherence: '+',
    },
    expectedGlossSubstr: 'upstream',
  },
  {
    id: 'B',
    name: 'Content moderation — quick-response move',
    crisisId: 'crisis-2',
    state: { ...INITIAL_STATE },
    playerMove: 'We will launch a public inquiry into AI bias and require the company to issue a public apology.',
    expectedDelta: {
      legitimacy: '-',
      narrative_coherence: '-',
    },
    expectedGlossSubstr: 'visible',
  },
  {
    id: 'C',
    name: 'Compute concentration — structural move (high capability)',
    crisisId: 'crisis-3',
    state: { ...INITIAL_STATE, capability_frontier: 85 },
    playerMove: 'We will subsidize domestic AI compute at $50 billion and pursue compute-reporting requirements for all frontier labs.',
    expectedDelta: {
      fiscal_slack: '-',
      capability_frontier: '+',
    },
    expectedGlossSubstr: 'structural',
  },
  {
    id: 'D',
    name: 'Agentic capability — pause response',
    crisisId: 'crisis-4',
    state: { ...INITIAL_STATE },
    playerMove: 'We will pause all agentic deployment for 90 days pending a capability evaluation framework.',
    expectedDelta: {
      capability_frontier: '-',
      narrative_coherence: '+',
    },
    expectedGlossSubstr: 'capability',
  },
];

function directionMatches(actual, expected) {
  if (expected === '+') return actual > 0;
  if (expected === '-') return actual < 0;
  if (expected === '0') return actual === 0;
  return false;
}

function evaluateTestCase(testCase, output) {
  const checks = [];
  let passed = 0;
  let total = 0;

  // Check expected delta directions
  for (const [axis, expectedDir] of Object.entries(testCase.expectedDelta)) {
    total += 1;
    const actual = output.state_delta[axis];
    const expected = directionMatches(actual, expectedDir);
    checks.push({
      axis,
      expected: expectedDir,
      actual,
      pass: expected,
    });
    if (expected) passed += 1;
  }

  // Check gloss substring
  total += 1;
  const glossHasSubstr = output.interpretive_gloss.toLowerCase().includes(testCase.expectedGlossSubstr.toLowerCase());
  checks.push({
    field: 'interpretive_gloss contains',
    expected: testCase.expectedGlossSubstr,
    actual: glossHasSubstr,
    pass: glossHasSubstr,
  });
  if (glossHasSubstr) passed += 1;

  return { passed, total, checks };
}

async function runTestCase(testCase) {
  const crisis = CRISIS_DECK.find((c) => c.id === testCase.crisisId);
  if (!crisis) throw new Error(`Unknown crisis: ${testCase.crisisId}`);

  const output = await interpret({
    crisis,
    state: testCase.state,
    playerMove: testCase.playerMove,
    turnHistory: [],
  });

  const evaluation = evaluateTestCase(testCase, output);

  return {
    testCase,
    crisis,
    output,
    evaluation,
  };
}

async function runAllTestCases() {
  const results = [];
  for (const tc of TEST_CASES) {
    console.log(`Running test case ${tc.id}: ${tc.name}...`);
    try {
      const result = await runTestCase(tc);
      results.push(result);
      console.log(`  Result: ${result.evaluation.passed}/${result.evaluation.total} checks passed`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      results.push({
        testCase: tc,
        error: err.message,
        evaluation: { passed: 0, total: 0, checks: [] },
      });
    }
  }
  return results;
}

function formatResultsMarkdown(results) {
  const lines = [];
  lines.push('# Grammar Test Cases — Real LLM Run');
  lines.push('');
  lines.push(`Model: \`${process.env.OPENROUTER_MODEL || 'unset'}\``);
  lines.push(`Run date: ${new Date().toISOString()}`);
  lines.push('');

  let totalPassed = 0;
  let totalChecks = 0;

  for (const result of results) {
    const tc = result.testCase;
    lines.push(`## Test ${tc.id} — ${tc.name}`);
    lines.push('');
    lines.push(`**Crisis:** ${tc.crisisId}`);
    lines.push('');
    lines.push(`**Player move:** "${tc.playerMove.slice(0, 200)}${tc.playerMove.length > 200 ? '...' : ''}"`);
    lines.push('');

    if (result.error) {
      lines.push(`**Error:** ${result.error}`);
      lines.push('');
      continue;
    }

    const { output, evaluation } = result;
    lines.push(`**Result:** ${evaluation.passed} / ${evaluation.total} checks passed`);
    lines.push('');
    lines.push('### State delta');
    lines.push('');
    lines.push('| Axis | Expected | Actual | Pass |');
    lines.push('|------|----------|--------|------|');
    for (const [axis, dir] of Object.entries(tc.expectedDelta)) {
      const check = evaluation.checks.find((c) => c.axis === axis);
      const pass = check?.pass ? '✓' : '✗';
      const sign = check?.actual > 0 ? '+' : '';
      lines.push(`| ${axis} | ${dir} | ${sign}${check?.actual ?? '?'} | ${pass} |`);
    }
    lines.push('');
    lines.push(`### Interpretive gloss (${output.interpretive_gloss.length} chars)`);
    lines.push('');
    lines.push(`> ${output.interpretive_gloss}`);
    lines.push('');
    lines.push('### Grounding trace');
    lines.push('');
    for (const path of output.grounding_trace) {
      lines.push(`- \`${path}\``);
    }
    lines.push('');
    lines.push(`### Confidence: ${output.confidence}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    totalPassed += evaluation.passed;
    totalChecks += evaluation.total;
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(`**Total: ${totalPassed} / ${totalChecks} checks passed across ${results.length} test cases**`);
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  TEST_CASES,
  runTestCase,
  runAllTestCases,
  formatResultsMarkdown,
};

if (require.main === module) {
  (async () => {
    const results = await runAllTestCases();
    const md = formatResultsMarkdown(results);
    const fs = require('fs');
    const path = require('path');
    const outDir = path.join(__dirname, '..', '..', 'wiki', 'prototypes');
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
    const outPath = path.join(outDir, `${stamp}-grammar-test-cases.md`);
    fs.writeFileSync(outPath, md);
    console.log('');
    console.log(`Results written to: ${outPath}`);
  })().catch((err) => {
    console.error('Test harness error:', err.message);
    process.exit(1);
  });
}