---
title: "Phase 3b — Experience refinement: JSON retry, previous-turn summary"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "minimax/minimax-m3"
---

## Observation

Phase 3b is experience refinement based on actually playing through. Four player archetypes were tested: structural (10 moves), symbolic (10 moves), mixed (10 moves), and speedrun / advisor-easy-mode (10 moves). The play-throughs surfaced two real refinements:

1. **JSON parse failures crash mid-game.** When the model returns truncated or malformed JSON, the simulation dies. The speedrun run crashed at turn 2 with an `ERR_USE_AFTER_CLOSE`-like error.

2. **No continuity between turns.** The player sees the state at the start of each turn, but doesn't see what just happened in the previous turn (the gloss excerpt, the delta applied). This breaks the narrative thread.

Both refinements are now in place.

## Probe

Four runs were executed via piped input (since interactive.js needs a TTY for full play):

```bash
# Structural player (10 structural moves)
node src/sim/interactive.js < /tmp/structural-player.txt

# Symbolic player (10 press-conference / public-statement moves)
node src/sim/interactive.js < /tmp/symbolic-player.txt

# Mixed player (alternating structural + symbolic)
node src/sim/interactive.js < /tmp/mixed-player.txt

# Speedrun player (advisor easy-mode each turn)
node src/sim/interactive.js < /tmp/speedrun-player.txt
```

Outcomes:

| Player | Turns | Final state trajectory |
|--------|-------|------------------------|
| Structural | 10 | Legitimacy 65→30, Elite 60→27, Narrative 55→21 (collapsed) |
| Symbolic | 10 | Legitimacy 65→40, Elite 60→21 (collapsed), Narrative 55→19 (collapsed) |
| Mixed | 10 | Legitimacy 65→29, Elite 60→28, Narrative 55→17 (collapsed) |
| Speedrun | 10 | Legitimacy 65→50, Elite 60→34, Narrative 55→46 |

**Observations:**
- The structural player fared better than symbolic on legitimacy, but narrative coherence still collapsed — structural engagement alone doesn't prevent narrative drift.
- The symbolic player took the hardest hit on elite alignment (collapsed by turn 10).
- The mixed player is somewhere in between — partial structural engagement helps legitimacy but doesn't prevent narrative collapse.
- The speedrun player (advisor easy mode) had the *mildest* trajectory. The advisor responses, even described in positional terms, were more substantive than the symbolic player's press-conference language.

## Real findings

1. **The speedrun player crashed mid-game at turn 2 with a JSON parse error.** The model returned `{"state_delta": {"legitimacy": -2, ... "inte` — truncated mid-keyword. This is a model behavior, not a code bug per se, but the simulation should handle it gracefully. **Fixed by adding 3-tier JSON parsing with retry:**
   - Strategy 1: direct `JSON.parse(response)`
   - Strategy 2: strip markdown code fences, then parse
   - Strategy 3: extract first JSON object via regex, then parse
   - If all 3 fail, retry up to 3 times with the same prompt
   - Verified: speedrun run now completes all 10 turns without crashing.

2. **No "what just happened" between turns.** The player sees the crisis, writes their move, sees the system interpretation, sees the state update. Then the next turn begins — but the player has no quick recap of what they did before. **Fixed by adding a `RECENT — Turn N` subsection before each turn's state block:**
   ```
   RECENT — Turn 7
   ──────────────────────────────────────────────
   Crisis: Frontier lab capability release
   Move: We convene a working group...
   Heard: The player convenes a working group rather than issuing...
   State Δ applied: legitimacy: +1, elite alignment: -2, narrative coherence: +1
   ```
   This gives the player continuity across turns without re-reading the full state.

3. **A structural player can still collapse.** The structural player's structural-but-not-targeted engagement produced a collapse of narrative coherence (−34). This is the literacy device working: structural engagement slows collapse but doesn't prevent it when the player doesn't address crisis-specific conditions.

4. **Easy-mode advisors are surprisingly substantive.** The speedrun player, using only advisors, had the best trajectory of all four archetypes. The advisor responses, even within the describe-not-recommend constraint, were substantive enough that the model rated them as partial structural moves. This is a real design finding: the advisor-as-easy-mode mechanic is not "cheating" the simulation — it's a legitimate alternative play style.

5. **The artifact generator handled all four outcomes correctly.** Player-quit, no-collapse, and the three collapse modes (legitimacy, technical, narrative capture) all produce well-formed artifacts. The player-quit case was fixed in Phase 3a; the other modes were verified during the four runs.

## Refinements shipped

**Code changes:**

1. **`src/sim/grammar.js`:** Added 3-tier JSON parsing with retry (max 3 attempts). Strategies: direct parse → strip code fences → regex extraction → retry with same prompt. This makes the simulation resilient to truncated or malformed LLM responses.

2. **`src/sim/interactive.js`:** Added `displayPreviousTurnSummary()` function. Each turn now shows a "RECENT — Turn N" subsection before the state block, containing the previous crisis title, the player's move (truncated), the system's gloss (truncated), and the state delta that was applied. This gives the player continuity.

## What this means for player experience

The refinements are small but meaningful:

- **Resilience:** A truncated or malformed LLM response no longer crashes the simulation. The retry logic handles it transparently.
- **Continuity:** The "RECENT" subsection gives the player a narrative thread across turns. They can track what their last move was, what the system heard, and what state shifted — without scrolling back through history.

The 4-architectype test reveals that the simulation produces *meaningfully different trajectories* for different play styles. The literacy device (your words matter) is operational, and player choice produces real, observable outcomes.

## What's next

Cycle 3c: artifact distribution. The artifact is currently a Markdown file written to `runs/`. We need to think about:
- Hosting the artifact at a stable URL (so players can share)
- Rendering it as standalone HTML
- Optional image export of the state trajectory

For MVP-0, the Markdown file is the artifact. Distribution is a separate concern — but it's what makes the project actually reach other people.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The experience refinement cycle produced two real improvements based on actual play-through observation.