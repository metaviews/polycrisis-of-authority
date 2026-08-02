# Cycle 13 — Web opening title integration

**Date:** 2026-08-01
**Phase:** v1.1 polish (post-feature-complete)
**Engine change:** none
**LLM spend:** $0

## Why

`assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4` (~12.5s, 2K, ~16.7MB) shipped in the August 2026 interstitial-video prototype 5 cycle as part of the surface. The artifact is committed in git at this path. The web surface — feature-complete since cycle 12e — does not yet play it.

Per Principle 4.4 ("public surfaces wait"), the engine has been stable for a cycle; this is the next natural adornment. Per the locked decisions in `docs/26-interstitial-video.md`, the opening is a single video played at the boundary moments of the run (cold-start, run end) — not between turns. The between-turns interstitials direction is still [open] in the working doc; this cycle does not touch it.

## Scope

The opening title plays on:

1. **Cold-start page** (`GET /`) — the page the player sees on first visit and on return-to-root.
2. **Run page when `state='ended'`** (`GET /runs/:id`) — the end-of-run moment, framed as the run's closure.

It does **not** play on:

- Active runs mid-play (the B chat-thread layout is the page; the player is reading and writing, not arriving)
- The `/status` page (subordinate to the run page; would be redundant)
- The cold-start's `GET /runs` JSON mirror (not a page)

## Visual language

The opening title sits inside the same austere mono/serif register as the rest of the surface (per `docs/24-web-architecture.md` §"Aesthetic"):

- **Element:** `<video>` element, inline at the top of the page chrome (above the run-meta header on run pages; above the title h1 on cold-start).
- **Attributes:** `autoplay muted playsinline loop`. Muted because the project's "library quiet" feel doesn't surprise the player with audio on first paint. Playsinline for mobile-safari compat. Looped because the video is short (~12.5s) and the player may be reading the page for longer.
- **Aspect:** the source is 16:9. Render at the page's content width with `max-width: 100%; height: auto;` and a subtle border-bottom rule to separate it from the prose.
- **Skip link:** a small mono "skip" link visible immediately at the top-right of the video element. Same chrome as the rest of the surface (muted color, uppercase, letter-spacing). Clicking it removes the video element from the DOM and unhides the page content (which is otherwise visible — the video does not hold the page).
- **No JS dependency for autoplay.** Modern browsers allow `autoplay muted` without a user gesture. If a particular browser blocks it (some stricter Safari configurations), the video simply doesn't play; the page is still readable. No fallback message needed — the page works either way.

## File changes

### `src/web/surface.js` (additive)

1. New helper `renderOpeningTitle({ position })` — emits the `<video>` element + skip link as a string. `position` is `'top'` (cold-start, before the h1) or `'above-meta'` (run page, before the run-meta header). Skip link uses an inline `<script>` that removes the element on click; no external JS file needed.

2. `renderColdStart` — prepend `renderOpeningTitle({ position: 'top' })` to `body` before the h1. The existing h1 + frame paragraph + runs list follow.

3. `renderRunPage` — when `run.state === 'ended'`, prepend `renderOpeningTitle({ position: 'above-meta' })` before the `renderRunMeta` call. Active runs do not get the video.

4. No changes to `renderStatusPage`, `renderDecisionDock`, `renderTurnCard`, or `renderEndOfRun`.

### `src/web/server.js`

No changes. The opening title is a display concern, not a routing or engine concern.

### Asset path

`assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4` is part of the surface and ships in git at this path. The web server must serve this asset. The chosen shape:

**Static-serve from a new `GET /assets/videos/...` route.** The path is whitelisted (only files under `assets/` that exist on disk and end in `.mp4` are served; everything else is 404). The surface adapter emits `<video src="/assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4">`.

Why no static middleware: the surface is small (one mp4) and a dedicated route keeps the dependency footprint at zero. If more assets accumulate, this becomes a candidate for a real static root in a future cycle.

Path-traversal protection: `rel.includes('..')` rejection + `path.resolve` check that the resolved path is still under `ASSETS_ROOT` + extension whitelist + existence + `isFile` check. All rejected with 404 before any `fs` call.

## What this cycle does NOT do

- Does not play the video between turns. That direction is still [open] in `docs/26-interstitial-video.md` (lines 88–93 — cardinality, runtime selection logic).
- Does not generate any new video. The opening title was produced in the August 2026 prototype 5 cycle; this cycle consumes the existing artifact.
- Does not change the audio stance. The video is muted in the embed. If the audio stance matters more than that, the embed can be revised to include audio (the doc is the right place to record that decision).
- Does not add a `/api/runs/:id/preview` thumbnail or any image extraction. Out of scope.
- Does not change the engine, the wiki, the simulation, or any other surface.

## Verification

`/tmp/hermes-verify-13-opening.sh` — ad-hoc checks across categories:

1. **File existence** — `assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4` exists; the surface adapter exports `renderOpeningTitle`; the server has the new route.
2. **No engine coupling** — `src/web/server.js` does not import any new engine modules. `src/web/surface.js` does not import from `src/sim/`.
3. **Surface adapter renders** — in-process render of cold-start page produces HTML containing a `<video>` element with `src="/assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4"`. In-process render of an active run page produces HTML **without** the video element. In-process render of an ended run page produces HTML **with** the video element.
4. **Skip link present** — both pages have a "skip" link in the rendered HTML.
5. **Aesthetic compliance** — the `<video>` element uses inline CSS consistent with the surface palette (no gradients, no box-shadow, monospace chrome around it). The skip link is in mono uppercase with letter-spacing, matching the rest of the surface's chrome.
6. **Static asset route** — the new `GET /assets/videos/...` route returns the MP4 file with `content-type: video/mp4`. Requests outside the whitelisted path return 404. Path traversal attempts (`/assets/videos/../etc/passwd`) return 404.
7. **Live HTTP** — boot the v1 server, hit `GET /` and `GET /runs/<seed-run>` (ended seed run), verify the video element is in the HTML. Hit `GET /runs/<active-run>` (live v1 run), verify the video element is **not** in the HTML.
8. **No regressions** — the existing 35 of 35 cycle 12d checks still pass. The 17 of 17 cycle 12e checks still pass. No new behavior on the existing routes.

## Filename convention

`wiki/prototypes/2026-08-01-cycle-13-opening-title-integration.md` — matches the prototype doc convention used by cycles 12a through 12e.

## Update list

After ship, this cycle updates:

- `wiki/log.md` — append a 2026-08-01 entry documenting the cycle.
- `src/web/README.md` — append a cycle 13 section after the cycle 12e section.
- `docs/04-roadmap.md` — no change. The roadmap's "Roadmap ahead" section is sketched, not committed, and cycle 13 belongs inside v1 polish, not in the roadmap's deferred list.
- `docs/26-interstitial-video.md` — update the "Sequence" section (line 336): cycle 13 closes step 5 of the original sequence. Steps 6 (between-turns interstitials direction) remains [open].

## Open questions before ship

- **Skip link vs. no-skip:** the user's choice (option 3 in the cycle 13 design question) is "inline `<video autoplay muted>`, fades in with the page, plus a 'skip' link for revisits". The skip link is part of the spec.
- **Audio stance in the embed:** muted. If the audio stance should be reconsidered (let the ambient audio play), the embed changes one attribute and the cycle doc gets a small note.
- **Active-run plays:** explicitly excluded per the spec. If the user wants the opening title to also play on the active run page (between the run-meta header and the chat-thread), the change is one line in `renderRunPage` and the cycle scope expands.

These are not gating; they are documented here for the cycle review.
