# 2026-07-26 — Web direction-board mockups (cycle 12a)

cycle 12a ships three real HTML mockups of the per-turn page, one
per direction in `docs/24-web-architecture.md`. the user reviews,
picks, and `direction-approved.md` is filed. cycle 12b starts
(cold-start + artifact-serving route).

## what shipped

```
/tmp/hermes-mockups-12a/
├── direction-a.html   single-page card       (recommended v1 starting point)
├── direction-b.html   chat-thread scroll     (defensible alternative)
├── direction-c.html   split-pane             (rejected by decision 4)
└── compare.html       side-by-side, one tab  (review surface)
```

all four files are real HTML, not screenshots of mockups-of-mockups.
the user can open `compare.html` in a browser and see all three
side by side in iframes. the same seed crisis (turn 3 of a frontier-
lab release run) and the same corpus quote render in all three.
only the layout architecture differs.

## the placeholder content

the mockups render turn 3 of a hypothetical run, not turn 1. turn 1
is structurally simpler (no headlines, no corpus quote) and would
hide two of the spec's load-bearing elements. turn 3 is the *normal*
state — what the player sees most of the time.

**headlines (2 prior committed events):**
- "Anthropic agreed to a 90-day review window after public pressure."
- "The European AI Office published a parallel evaluation timeline, citing 'regulatory contagion.'"

**situation:** the second-lab rumor; the first lab's review window
public; the safety team's flag that evaluation criteria aren't
portable; the coordination problem shifted from *whether* to *how*.

**pressure:** the second lab going public exposes the first lab's
commitment as either a universal (requires coordination) or
unilateral (exposed as theater). 36 hours before the story breaks.

**decision question:** how do you respond to a coordination problem
that is not yet public, knowing that any visible action will be read
as a policy preference for one lab over the other?

**corpus quote:** "The visible signal of a 90-day review window is
read as a *commitment*; the underlying capacity to evaluate on that
timeline is not visible at all. The two readings can diverge for
years before the underlying capacity becomes legible." — Capabilities
Evaluation.

the placeholder is a *deliberately stable seed* — no real LLM call,
no LLM variation, no surprises. the comparison is honest because the
content is identical.

## the three directions

### Direction A — single-page card (recommended v1 starting point)

one column, top-to-bottom: crisis header, headlines, situation,
pressure, decision, advisor panel, corpus quote. advisors sit
below the decision input, collapsed by default. the page reads
like a document. mobile-friendly by default.

pro: simplest. reads like a document. the prose is the page.
con: advisor voices compete with the main prose for attention
when expanded.

### Direction B — chat-thread scroll

the page is a stream of turn cards stacked vertically. prior turns
(1 and 2) are visible above the current turn (3) in slightly
muted form. decision input is pinned to the bottom of the viewport
as a fixed dock. the corpus quote is a small inline panel on each
turn card, not a single footer.

pro: the run is a record, not a moment. familiar from chat UIs.
con: requires JS for the append behavior. the prose loses gravity
when it's stacked. prior-turn corpus quotes are a design call the
spec didn't explicitly resolve.

### Direction C — split-pane (rejected)

left column: the system (six axes with bars and bands, turn count
with a stability-trajectory sparkline, advisor list). right column:
the crisis + decision. the system is always visible.

rejected because it violates decision 4 (system is hidden during
play). the taoist frame pushes back: the system should be present
but not foregrounded. with C, the system is the page's first
read — your eye goes to the bars before it goes to the prose.
that's the design wrong the spec called out.

## what the mockups surfaced (small design notes)

1. **corpus quote per turn vs. one quote per page.** direction A
   puts a single corpus quote at the bottom of the current turn.
   direction B shows a quote on every turn card. the spec says
   "every turn after turn 1," which both interpretations satisfy,
   but B is more aggressive. worth picking when the user picks.

2. **prior turns on the per-turn page.** direction B shows prior
   turns. direction A doesn't. the spec didn't specify. B is
   better for returners (the run is a record) but worse for the
   single-turn focus A enables.

3. **the advisor panel position.** in A and C it's a list of buttons.
   in B it's a row of buttons in the fixed dock. the spec says
   "side panel" (decision 5) but B's dock-strip is functionally
   equivalent. A's "below the decision" is also a valid placement.

4. **the per-turn chrome.** all three use the same mono header
   (run id, turn number, /status link). this is the surface adapter
   doing its job — the chrome is consistent across directions; the
   layout differs.

5. **turn 1 vs. turn 2+.** the mockups render turn 3. turn 1 is
   a different shape (no headlines, no corpus quote, the cold-start
   "what is this" page). the cycle 12b cold-start work is the
   turn 1 surface; the cycle 12c+ per-turn work is what the
   mockups preview.

## verification

ad-hoc verification at `/tmp/hermes-verify-12a-mockups.sh`.
**59 of 59 checks pass.** categories:

1. all four files exist
2. file sizes (real mockups, not stubs — 7KB-13KB each)
3. same crisis content across all three directions
4. spec load-bearing elements (corpus, advisor, /status, submit)
   present in each direction
5. aesthetic compliance: serif for prose, mono for chrome, no
   box-shadow, no gradients, no emoji, prose max-width 60-75ch
6. each direction is structurally distinct:
   - A: 5-column advisor row below decision
   - B: decision input pinned to bottom (chat-thread pattern)
   - C: split-pane with 24rem system aside
7. compare page has all three iframes
8. render check via headless chromium: all 4 files render
   (DOM sizes 7K-13K, no console errors)

plus visual confirmation via `chromium --headless --screenshot`:
three PNGs (`_render-a.png`, `_render-b.png`, `_render-c.png`)
and the compare page (`_render-compare.png`), all show the
intended layout with no overflow or visual issues.

## next

1. user reviews the mockups. opens `compare.html` in a browser,
   reads the spec at `docs/24-web-architecture.md`, scrolls each
   iframe independently.
2. user picks A, B, or a variant of either. (C is rejected by
   decision 4; the user is welcome to override but the spec
   pushes back.)
3. `direction-approved.md` is filed at the gate path with the
   pick + reasoning (especially any "actually, B but with
   [variation]" overrides).
4. cycle 12b starts: cold-start page + artifact-serving route.
   v0 surface. ships before any v1 run-start code.
5. the unchosen mockups evaporate; the chosen one becomes the
   basis for cycle 12c's per-turn page server code.
