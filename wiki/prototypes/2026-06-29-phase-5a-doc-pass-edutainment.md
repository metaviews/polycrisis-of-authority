# Prototype — 2026-06-29 — Phase 5a: doc pass (literacy reframing + Principle 6 + advisor welcome)

## Observation

Cycle 5a is a doc-only cycle. No code changes. Three reframings landed in the project's design docs after the user pushed back on the original literacy claim.

**The user surfaced three real concerns:**

1. The "literacy" claim in `docs/00-vision.md` listed five pedagogical claims in a curriculum-shape, which made the claim look like it could be measured. It can't be measured. The claims are design aspirations, not guarantees.
2. The user is one player, not 20-30. Phase 5 was originally written for a community showcase. With one player, Phase 5 is a usability walkthrough, not a population study.
3. The advisor function was framed with a transcription-mistrust ("a player who consults an advisor and writes the resulting policy in the advisor's own words has not governed; they have transcribed"). The user pointed out that easy mode is welcome, not suspect. Adoption is a complete form of play, not a downgrade.

**The reframings that landed:**

### 1. The literacy claim is edutainment, not curriculum

The vision doc's primary purpose is now named **edutainment**. The five pedagogical claims are reframed as **design aspirations** that the project works toward, with a new explicit line: *"They are design goals, not guarantees."* A new litmus-test paragraph closes the section: *"a player who finishes a run should want to start another."*

The honest literacy claim is narrower than the original: a felt encounter with the complexity of policy and the randomness of politics, delivered through an experience the player wants to have again. The case-study claim (the project's secondary purpose) is now framed as the more rigorous one.

### 2. Principle 6 — the simulation is enjoyed, not just understood

A new design principle added to `docs/02-design-principles.md`, between 4.5 and the "How to use this document" closer. Five "what this constrains" items:

- The crisis surface must be evocative, not mechanical
- The collapse reveal must land as a moment of recognition, not a debrief
- Free-text policy input is encouraged at any length (3 words and 3 paragraphs are equally valid)
- The advisor function in easy mode is a complete form of play
- The shareable artifact should have a throughline (narrative, not report)

The why-this-principle paragraph names the underlying taoist sensibility *implicitly* — *"the right governance often does less rather than more; yielding to conditions is a form of action; the modest awareness a player walks away with is more durable than a curriculum would be"* — without naming the tradition. The tradition is not surfaced to the player. The litmus test: a player who finishes a run should want to start another.

### 3. The advisor function is welcome, not suspect

Two places were updated. **Principle 2.4** (position-representation) had the transcription-mistrust line replaced with a one-sentence parenthetical pointing to 4.2. **Principle 4.2** (advisor cast is curated) gained a closing paragraph that names the three input paths (consult as briefing, adopt as move in easy mode, decline and author) as complete forms of play. **docs/10-advisor-prompts.md** lost the same transcription-mistrust framing in two places and gained the same welcome framing.

### 4. The README and the Phase 5 plan

The README's "Project status" section now describes Phase 5 as a usability walkthrough (not 20-30 external players), names the litmus test, and points to Principle 6. The "What works — Advisor cast" section describes easy mode as a complete form of play.

## Probe results

**Verification script** (`/tmp/hermes-verify-5a.sh`): all 7 checks pass.

The verifications cover:

1. Vision doc primary purpose renamed to "edutainment" + "Design aspirations" framing + "design goals, not guarantees" line
2. Principle 6 added to principles doc + has the litmus test
3. Principle 4.2 reframed as "advisor function is welcome" + "complete form of play" + transcription-mistrust line removed
4. README mentions edutainment + names Phase 5 as usability walkthrough + removes 20-30 player reference
5. `docs/10-advisor-prompts.md` reframed as "welcome in all its forms" + removes "literacy scaffold" framing
6. **Regression:** all 5 prior cycle verifications (4a, 4b, 4c, 4d, 4e) still pass
7. Wiki audit clean: 63 indexed, 0 schema, 0 broken links

## Design notes

**The taoist frame stays implicit.** Per the user's request, the taoist sensibility informs every design decision but is *not* surfaced to the player. No "taoist framing" copy appears anywhere in the player-visible surface. The principle's why-this-principle paragraph carries the language ("yielding to conditions is a form of action") without naming the tradition.

**The aspiration language is a real shift, not a hedge.** The original vision doc listed the five pedagogical claims as "What the game claims to teach." The new framing lists them as "Design aspirations" that "the design works toward," and explicitly says "whether any given player's run lands on any of them is not guaranteed." This isn't hedging; it's the actual design goal. The case-study claim is the testable one; the literacy aspirations are what the design *aims* to support.

**The litmus test is the new North Star.** "A player who finishes a run should want to start another" is the new design goal. It's mechanical enough to test (did the player start another run?) and aesthetic enough to ground the design (the design must serve pleasure, not just understanding).

**The advisor function's three input paths are now equally legitimate.** Literacy mode, easy mode, and decline-and-author are all "complete forms of play." The transcription concern is gone. The describe-not-recommend constraint still applies to the advisor's *response*, not the player's *use* of that response.

## Files changed

- `docs/00-vision.md` — primary purpose reframed as edutainment
- `docs/02-design-principles.md` — Principle 6 added, Principle 2.4 transcription line removed
- `docs/10-advisor-prompts.md` — welcome framing in two places, sources updated
- `README.md` — Phase 5 reframed as usability walkthrough, edutainment named, advisor section updated

## Phase 4/5 status

| phase | status |
|---|---|
| 1-4 | complete |
| 5 | starting as usability walkthrough (one player) |

## Next

Play the game. Run the four player archetypes (structural, symbolic, mixed, speedrun) per the handoff protocol's day-2 test list. Read the artifacts. Check the litmus test: do I want to start another run after each one?

The walkthrough is its own doc pass — observations from play go into a new prototype entry, design adjustments (if any) go into a 5b cycle, and the Phase 5 ship criteria get re-evaluated honestly for one player.
