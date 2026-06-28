---
title: "Real LLM connectivity probe — MiniMax M3 reachable and responsive"
date: 2026-06-28
type: prototype
prototype_kind: probe
model: "minimax/minimax-m3"
---

## Observation

For the first time in the project, a real LLM has been called via the configured OpenRouter setup. The probe confirms that the model swap infrastructure (per `docs/11-openrouter-configuration.md` and Principle 1.1) works end-to-end against the MiniMax M3 model.

This probe validates that:

- The `.env` file is correctly configured and read by `scripts/lib/openrouter.js`.
- The OpenRouter API key resolves correctly.
- The configured model (`minimax/minimax-m3` per the orchestrator's `.env`) is reachable.
- A trivial prompt produces the expected response.

This is the bridge between the design phase and the build phase. Real LLM behavior is now observable, which is what makes the case-study claim testable.

## Probe

Command run:

```bash
node -e "
const { loadEnv, createClient } = require('./scripts/lib/openrouter');
loadEnv();
const client = createClient({ title: 'Phase 2 Connectivity Probe', temperature: 0 });
client.complete([{ role: 'user', content: 'Reply with the single word: PONG' }], { temp: 0 }).then(console.log);
"
```

Output:

```
Response: "PONG"
```

Latency: under 30 seconds (the `timeout` bound). The model responded correctly to a simple instruction-following test.

## Output

The model returned exactly the expected single-word response. No retry was needed; no error handling triggered. The OpenRouter wrapper from the parent project works correctly with our `.env` configuration.

## Interpretation

**The simulation infrastructure has a working LLM channel.** This unlocks:

- Cycle 2c (real LLM integration + test cases) can proceed with actual model calls, not just dry-runs.
- Cycle 2d (end-to-end session + artifact generation) can produce real artifacts grounded in real model behavior.
- The case-study claim (model behavior is observable, versioned, citable per Principle 1.2) can be tested against actual model output.

**Configuration status:**

- `OPENROUTER_MODEL=minimax/minimax-m3` — the orchestrator has chosen MiniMax M3 for the case-study runs. This is the right posture: real model, swappable, documented.
- `OPENROUTER_API_KEY` is set (length 73, which matches OpenRouter's `sk-or-v1-...` key format).
- `.env` is gitignored; secrets are not committed.

**Implications for the project.** Phase 2 cycles 2c and 2d can now produce prototype observations that include real model outputs. These are the most informative prototypes in the project — they show what the model actually does when asked to interpret AI policy text. The design specs in `docs/06-`, `docs/07-`, `docs/08-`, `docs/09-`, `docs/10-` become *testable claims* rather than aspirations.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The bridge from design to build is now open.
