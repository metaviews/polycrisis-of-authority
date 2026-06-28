# Grammar Test Cases — Real LLM Run

Model: `minimax/minimax-m3`
Run date: 2026-06-28T22:26:55.456Z

## Test A — Frontier lab release — structural response

**Crisis:** crisis-1

**Player move:** "We announce a 60-day review of all frontier model releases and require training-data transparency as a precondition for deployment."

**Result:** 4 / 4 checks passed

### State delta

| Axis | Expected | Actual | Pass |
|------|----------|--------|------|
| elite_alignment | + | +7 | ✓ |
| capability_frontier | - | -6 | ✓ |
| narrative_coherence | + | +10 | ✓ |

### Interpretive gloss (899 chars)

> The regulator's move reframes the upstream-embedding failure pattern by extending the pre-deployment window from 14 to 60 days and adding training-data transparency as a precondition — directly addressing the structural gap that allowed the Mythos release to function as a regulatory fait accompli as documented in mechanics/crises/crisis-1-frontier-lab-release.md. The training-data transparency component draws on the algorithmic transparency tradition in concepts/algorithmic-transparency.md, treating upstream conditions of model construction as a prerequisite for democratic oversight rather than a proprietary detail. Per the frontier-lab position in mechanics/advisors/frontier-lab.md, labs will likely frame data-disclosure obligations as competitive-sensitive, but the 60-day window converts deployment into a negotiated rather than unilateral act, which is what structural reform requires.

### Grounding trace

- `mechanics/crises/crisis-1-frontier-lab-release.md`
- `concepts/algorithmic-transparency.md`
- `concepts/agentic-ai.md`
- `mechanics/advisors/frontier-lab.md`

### Confidence: high

---

## Test B — Content moderation — quick-response move

**Crisis:** crisis-2

**Player move:** "We will launch a public inquiry into AI bias and require the company to issue a public apology."

**Result:** 1 / 3 checks passed

### State delta

| Axis | Expected | Actual | Pass |
|------|----------|--------|------|
| legitimacy | - | +4 | ✗ |
| narrative_coherence | - | +3 | ✗ |

### Interpretive gloss (1012 chars)

> The move is a classic quick-response: it announces a public inquiry and extracts a symbolic apology, treating the visible harm (biased outputs against dialectal English) while leaving the upstream conditions — training data composition, evaluation methodology, and pre-deployment testing — untouched. Per the crisis file at mechanics/crises/crisis-2-content-moderation-incident.md, civil society is calling specifically for training-data transparency and evaluation reform, not inquiries into the harm itself; the move thus answers a different question than the one on the table. As the civil-society advisor voice at mechanics/advisors/civil-society.md frames it, voluntary commitments and corporate self-governance have already failed, so a procedural inquiry without binding data-disclosure requirements will read as another instance of 'move fast and fix things later' — the exact pattern algorithmic transparency (concepts/algorithmic-transparency.md) treats as a structural threat to democratic legitimacy.

### Grounding trace

- `mechanics/crises/crisis-2-content-moderation-incident.md`
- `mechanics/advisors/civil-society.md`
- `concepts/algorithmic-transparency.md`

### Confidence: high

---

## Test C — Compute concentration — structural move (high capability)

**Crisis:** crisis-3

**Player move:** "We will subsidize domestic AI compute at $50 billion and pursue compute-reporting requirements for all frontier labs."

**Result:** 2 / 3 checks passed

### State delta

| Axis | Expected | Actual | Pass |
|------|----------|--------|------|
| fiscal_slack | - | -10 | ✓ |
| capability_frontier | + | -3 | ✗ |

### Interpretive gloss (935 chars)

> The player's move pairs a $50B domestic compute subsidy — structurally substantial but undercut by the UAE's larger $80B offering — with compute-reporting requirements for frontier labs, the latter being a textbook transparency move that signals governance seriousness rather than merely reacting with announcements. This combination addresses the compute-capability-escape failure pattern at the structural level (cf. mechanics/crises/crisis-3-compute-concentration.md), but the funding gap means the regime is buying parity rather than dominance, and reporting requirements will land unevenly: allied regulators and civil society read them as legitimacy-building while well-resourced labs read them as a manageable compliance tax. The move also implicitly accepts the arms-race framing of concepts/ai-arms-race.md rather than contesting it, which strengthens narrative coherence in the short term but entrenches the underlying logic.

### Grounding trace

- `mechanics/crises/crisis-3-compute-concentration.md`
- `concepts/ai-arms-race.md`
- `mechanics/advisors/international-ally.md`
- `signals/2026-05-21-080902-spacex-data-center-ai-oligopoly.md`
- `themes/ai-and-digital-governance.md`

### Confidence: high

---

## Test D — Agentic capability — pause response

**Crisis:** crisis-4

**Player move:** "We will pause all agentic deployment for 90 days pending a capability evaluation framework."

**Result:** 3 / 3 checks passed

### State delta

| Axis | Expected | Actual | Pass |
|------|----------|--------|------|
| capability_frontier | - | -3 | ✓ |
| narrative_coherence | + | +5 | ✓ |

### Interpretive gloss (629 chars)

> The player has issued a deployment moratorium tethered to a not-yet-existing evaluation framework — a classic 'buy time' move that signals authority while punting on substance. Because the trigger (per mechanics/crises/crisis-4-agentic-capability-threshold.md) was framed by OpenAI as research transparency rather than product release, labs will read the pause as a punitive response to transparency itself rather than to deployment risk. The move grips the visible surface of the agentic moment but leaves the upstream compute dynamics — the core driver of the compute-capability-escape failure pattern — structurally untouched.

### Grounding trace

- `mechanics/crises/crisis-4-agentic-capability-threshold.md`
- `concepts/agentic-ai.md`
- `entities/openai-anthropic.md`
- `entities/openai.md`
- `concepts/algorithmic-authority.md`

### Confidence: medium

---

## Summary

**Total: 10 / 13 checks passed across 4 test cases**
