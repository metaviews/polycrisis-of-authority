# direction-approved.md — cycle 12a → 12b transition

## pick: **Direction B — chat-thread scroll**

filed by the user 2026-07-26 after reviewing the three real HTML
mockups at `/tmp/hermes-mockups-12a/`. A and C were considered;
B is the choice. C is explicitly rejected (decision 4 violation
already documented in the spec).

## what B commits to (beyond the spec)

the three structural details that emerged from building B and
that the user accepted by picking B:

1. **prior turns visible on the per-turn page.** turns 1...N
   stacked vertically, prior turns in muted form (`turn-prior`
   class). the v1 server renders the full turn history on each
   page load. implication: the per-turn page is actually a
   per-run page; the page's `n` is the *current* turn but the
   page shows all prior turns too.

2. **corpus quote per turn, including prior turns.** this is
   the more aggressive reading of decision 2. every turn card
   has its own corpus quote panel. the player can scroll through
   the run as a knowledge-graph traversal of the corpus.

3. **decision input pinned to bottom** (`.decision-dock` with
   `position: fixed; bottom: 0`). the input is always visible
   while scrolling. the dock takes ~140px of vertical space.
   *follow-up for narrow viewports:* a "minimize" affordance
   on the dock, or a scroll-up-to-focus behavior on mobile.
   not in scope for cycle 12b; logged as a 12c+ polish item.

## design calls resolved by picking B (with user input)

- **post-game share URL:** same URL, content differs by state.
  `GET /runs/:id` serves the run, with state-driven content:
  `state='active'` renders the per-turn page (current turn +
  prior turns + decision dock); `state='ended'` renders the
  same surface with the end-of-run prose appended. the share
  is the run URL. one render path. decision 3 (a) honored:
  the post-game report is the run URL at `state='ended'`.
- **advisor panel position:** B's dock-strip is functionally
  the spec's "side panel" since the dock is at the bottom of
  the viewport, which on a wide screen is the right side.
  on narrow viewports, the dock is below the current turn's
  text — equivalent to A's "below the decision" placement.
  no separate side-panel element needed.

## what stays from the spec, unchanged

- **5 confirmed decisions** (1=bearer-token, 2=corpus-per-turn,
  3=URL-report-same-URL, 4=hidden-trajectory, 5=side-panel-as-dock)
- **visual language:** serif (Georgia) for prose, mono
  (ui-monospace) for chrome, no gradients, no box-shadow,
  no emoji, prose max-width ~70ch
- **/status** is one click away, not on the main surface
- **engine commitment:** no changes to `src/sim/`
- **gate file protocol:** this doc files the B pick. next
  gate is `architecture-frozen.md` before cycle 12c code lands.

## variants picked along with B

none. the user picked B as-built. if variants emerge during
cycle 12b implementation, they get filed here as amendments.

## next

- **cycle 12b starts:** cold-start page + artifact-serving
  route. v0 surface. ships before any v1 run-start code.
- **file layout:** `src/web/` is created with the surface
  adapter skeleton (`src/web/surface.js` modeled on
  `src/bot/surface.js`). no engine code touched.
- **12b verification:** a fresh `/tmp/hermes-verify-12b-v0.sh`
  with ad-hoc checks for the cold-start page, the
  artifact-serving route, and the surface adapter's
  contract (no engine coupling).
- **this doc is the cycle 12a → 12b handoff.** archived
  with the prototype doc at
  `wiki/prototypes/2026-07-26-cycle-12a-mockups.md` and the
  spec at `docs/24-web-architecture.md`.
