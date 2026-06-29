'use strict';
const { renderArtifactHtml, fnv1a32 } = require('../src/sim/artifact-render');

const sample = `# Polycrisis of Authority — Run report

**Run ID:** 20260629-test01
**Date:** 2026-06-29
**Model:** MiniMax M3
**Outcome:** legitimacy-collapse
**Turns completed:** 14

## Run summary

You governed for 14 turns. The regime began in a broadly stable position. **Collapse fired as legitimacy collapse on turn 14.**

## State trajectory

| Axis | Start | End | Max excursion | Bands crossed |
|------|-------|-----|---------------|----------------|
| Legitimacy | 65 | 12 | -53 | holding → strained → eroded → collapsed |
| Fiscal slack | 70 | 55 | -15 | holding → strained |

## Interpretive chain

### Turn 1: Frontier capability release

**Player wrote:**
> We will convene an emergency summit with industry leaders to coordinate a 60-day review.

**Model heard:**
> The player has chosen a *coordinated* approach, framing the response as upstream engagement with industry.

**Model did:
- legitimacy: +6
- elite_alignment: +10

---

## Visible signals vs hidden value, per turn:

| Turn | Axis | Hidden band | Visible bands | Discrepancy |
|------|------|-------------|---------------|-------------|
| 5 | capability_frontier | strained | strained / eroded / holding | 14 pts |

**Play link:** \`github.com/metaviews/polycrisis-of-authority\`
`;

const runLog = "fake run log content for hashing";
const html = renderArtifactHtml(sample, {
  runId: '20260629-test01',
  model: 'MiniMax M3',
  outcome: 'legitimacy-collapse',
  hashOf: runLog,
});

console.log('HTML size:', html.length, 'bytes');
console.log('Hash:', fnv1a32(runLog));

const checks = [
  ['Contains DOCTYPE', /^<!doctype html>/i.test(html)],
  ['Contains hash meta', /name="polycrisis:hash"/.test(html)],
  ['Contains inline CSS', /<style>[\s\S]+<\/style>/.test(html)],
  ['No external scripts', !/<script/.test(html)],
  ['No external stylesheets', !/<link[^>]+stylesheet/.test(html)],
  ['No external images', !/<img /.test(html)],
  ['Contains run id meta', /name="polycrisis:run-id"/.test(html)],
  ['Renders h2', /<h2>Run summary<\/h2>/.test(html)],
  ['Renders table', /<table>/.test(html)],
  ['Renders strong', /<strong>Collapse fired/.test(html)],
  ['Renders inline code', /<code>github\.com/.test(html)],
  ['Renders horizontal rule', /<hr>/.test(html)],
];
for (const [name, ok] of checks) {
  console.log(`  ${ok ? 'OK' : 'FAIL'}  ${name}`);
}
const allOk = checks.every(c => c[1]);
console.log(`\nAll self-containment checks: ${allOk ? 'PASS' : 'FAIL'}`);

const fs = require('fs');
fs.writeFileSync('/tmp/probe-artifact.html', html);
console.log('Wrote /tmp/probe-artifact.html for inspection');
