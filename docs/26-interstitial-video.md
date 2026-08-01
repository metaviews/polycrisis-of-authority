# Interstitial Video Surface

Status: design in progress. Working doc. Iterated on as the surface
moves from concept to cycle. Anything marked **[open]** is unresolved.

## Frame

Polycrisis is a prose-only LLM-driven simulation. The player reads;
the world moves. Between turns the player waits for the LLM to
think — that wait is currently empty.

This surface adds a video layer during the wait. The video is not a
cutscene, not a recap, not authored per-turn. It is an interstitial:
an ambient visual played during the LLM round-trip, ending when the
prose arrives.

The visual is generated once, at corpus-build time, by MiniMax H3
(MiniMax's third-generation video model). The engine never calls H3.
Runtime cost is zero apart from file selection and disk read.

This is the same precedent as care-ledger's FLUX-generated branding:
visuals are infrastructure, not authorship. The LLM writes the
fiction; H3 writes the weather.

## Why this surface

Three motivations, in order of strength:

1. **Empty wait.** Every turn has a 1–5 second LLM round-trip. That
   time is currently wasted. A video interstitial uses it.
2. **Corpus weight.** The corpus already gives the prose its
   density. Extending that corpus-grounding into a visual register
   is consistent with the project shape — wiki entities, signals,
   themes have weight in text; they can have weight in image too,
   in a less specific way.
3. **Showcase.** A prototype case study with embedded video is a
   more legible artifact than text alone. Aligns with the showcase
   cadence.

## Locked decisions

These are settled. Do not re-litigate without new evidence.

- **H3 invoked at corpus-build time, not runtime.** No real-time
  generation. No per-turn API calls during a run.
- **Runtime cost is file selection.** The engine picks a video from
  a directory on disk and plays it during the LLM round-trip wait.
- **Visuals are infrastructure, not authorship.** H3 contributes
  atmosphere, not fiction. The fiction remains the LLM's.
- **Wu-wei applies at the system level, not to video content.** The
  system around the videos (selection, pacing, defaults) preserves
  wu-wei. The videos themselves can be what H3 produces.
  Generation-time discipline is *not* literal stillness / no-faces /
  silent-cinema unless the corpus calls for it. **[clarification:
  this was overcorrected in an earlier draft; the user corrected
  that the discipline is on the system, not the content.]**
- **H3 access via OpenRouter.** Already in use by the project for
  M-series models. Endpoint shape differs from chat completions;
  this is a new API surface alongside the existing one.
- **Wu-wei deferred.** Not blocking the design conversation. To be
  revisited when the surface is closer to implementation. The user
  explicitly flagged that thinking about wu-wei first was
  preventing coherent progress on the larger concept.
- **Audio: H3 native.** Whatever H3 generates. Revisit if and when
  there is reason to pursue alternatives (separately authored,
  silent, etc.).

## Wu-wei (deferred)

The system's relationship to the project's silent frame is not
yet settled. This is intentionally left open during the design
phase so the surface itself can be approached coherently. To be
revisited before or during implementation.

## Generation cycle (how videos are made)

Videos are authored in batches during corpus-build cycles, the same
way care-ledger's seed corpus is authored. Not at every corpus
expansion; only when the surface itself is being grown or refreshed.

Each batch produces a *set* of videos. The set is the artifact;
individual videos are interchangeable within it. The set is
characterized by:

- **Cardinality.** How many videos per batch. **[open]**
- **Corpus grounding.** Which wiki categories are represented and
  how. **[open]**
- **Generation prompts.** The actual H3 prompt strings used to
  produce the set. **[open — to be developed before first
  generation cycle]**

A manifest file maps videos to corpus tags so the runtime selector
can match. Manifest shape: **[open]**.

## Runtime selection

Per turn, the engine selects a video to play during the LLM
round-trip. Selection logic is **[open — to be tested via
prototypes]**. Candidates:

- **Option A: crisis type only.** Capability-driven → set A,
  incident-driven → set B, etc. Deterministic rotation within
  subset.
- **Option B: crisis type × escalation state.** Same buckets;
  subset rotates based on whether the crisis is escalating, stable,
  or resolving.
- **Option C: crisis type × entity fingerprint.** Same buckets;
  subset selected by which wiki entities are active in the turn.

Default per-turn advance (cycle 11): the engine makes this
decision, not the player. No opt-in macro.

## Audio stance

**Locked:** H3 native audio. Whatever the model generates.

To be revisited if and when there is reason to pursue alternatives
(silent, separately authored, etc.).

## Asset layout

**[open, pending decision]**. Candidates:

- `assets/videos/interstitials/<category>/<slug>.mp4` + manifest
- `data/interstitials/...` (consistent with existing `data/` use)
- `wiki/visuals/...` (treating video as a browsable wiki type)

My prior: `assets/videos/interstitials/<category>/<slug>.mp4` with
a single `manifest.json` at the root. Not a wiki type — runtime
assets, not browsable corpus.

## Surface integration points

Touch points where this surface meets the existing codebase:

- **TUI loop.** The video plays during the LLM round-trip wait.
  Mechanism: terminal-side video player (likely `mpv` or
  equivalent, run in a detached process), or a web-side viewer if
  the run surface is browser-rendered. **[open, depends on the
  TUI's current shape]**
- **Discord loop.** Discord supports video attachments natively.
  Could embed the interstitial in the run-end embed (cycle 9
  notification pattern) or as a per-message media item. **[open]**
- **Web case study.** `case-study/` is a static showcase surface.
  Interstitials would be embeddable as illustrative clips. **[open]**
- **Wiki.** No direct integration. Videos are *informed by* the
  wiki but do not become wiki entries themselves.

## Corpus grounding (candidate categories)

Themes are the right level for atmospheric videos: relational and
weather-like, while concepts are more mechanism-shaped. Entities
and signals would push the videos toward depiction — explicitly
avoided.

Each video corresponds to a *category*, not a specific entry.
"Regulatory" is its own video; "lab X" is not. The prompt for a
video is written by reading the category's wiki page and
abstracting from it — what does this category feel like when it's
weather, not content.

The set covers the categories; it doesn't *mirror* their corpus
cross-reference counts. The corpus's job is to *generate the
prompts*, not to set cardinality.

### Candidate category list (themes)

Primary candidates, drawn from `wiki/themes/`:

1. **compute-as-geopolitics** — substrate, scale, machinery
2. **state-ai-strategic-competition** — diplomatic weight,
   distance, parallelism
3. **ai-and-power-dynamics** — quiet structural force
4. **ai-and-digital-governance** — paper, process, friction
5. **transparency-and-auditability** — inspection, examination,
   light on surface
6. **voluntary-framework-vs-binding-regulation** — choice,
   openness, threshold
7. **international-coordination-failure-and-recovery** —
   separation, return
8. **frontier-firm-ai-business-model** — scale, motion, commerce
9. **open-weights-and-distribution** — dispersal, scattering,
   multiplicity
10. **synthetic-media-and-information-environment** — surface,
    ambient information
11. **ai-in-procurement-state-power** — weight, infrastructure,
    leverage
12. **civil-society-accountability-infrastructure** — small
    institutions, persistence, attention
13. **talent-concentration-and-labor-conditions** — gathering,
    exhaustion
14. **labor-displacement-and-class** — departure, room left behind

### Prototype 4 outcome (August 2026) — superseded

A 5-second atmospheric vignette ("civil-society-accountability-
infrastructure" theme: empty office at end of day) was generated
against `minimax/hailuo-3` at 2K/16:9. Render was technically
correct (modest office, lamplight, slow camera drift, ambient
sound, 2560x1440 h264 + aac, ~5.17s).

**User assessment: cultural fit failed.** The render landed as
"boring office has little to do with a polycrisis." The
atmospheric-vignettes-by-theme direction is **superseded**.

Two reasons recorded for the failure:

1. The prompt asked h3 to be an art-film camera; h3 is a
   commercial-grade multimodal model. Asking it to render
   still-cinema atmosphere underuses its distinctive capability
   (text and brand rendering) and pushes it toward defaults it
   doesn't do well.
2. The relationship between corpus and video was the wrong way
   around. The prompts were *about* the corpus (its themes, its
   weather) rather than *using* the corpus to drive text- and
   brand-faithful rendering of the project itself.

The successful artifact from this prototype is the pipeline:
`scripts/h3-generate.sh`, the prompt-file convention, and the
`assets/videos/prototype-2026-08/` layout. These survive.

### Prototype 5 (August 2026) — opening title sequence

Replaces the atmospheric-vignette direction. Single video, plays
once at run start, sets the stage and the tone.

**Beats (committed to `prompts/polycrisis-of-authority-opening.md`):**

1. **Title** — "polycrisis of authority" rendered in serif type.
2. **Description** — one-line gloss of the game.
3. **Instruction** — one-line how-to-play.

**Locked copy:**

- description: "you govern; the world speaks back through crisis,
  pressure, and the patience of those you lead."
- instruction: "read the world. respond with care."

**Render params:** duration 12s, aspect 16:9, resolution 2K,
audio on, model `minimax/hailuo-3`.

**Register:** wu-wei. Taught-as-frame, not literal-cinema.
Muted ink-wash palette, generous empty space, slow fade-in
rather than animation, no figures, no movement other than type
and a barely-perceptible camera breath. Ambient sound (faint
wind, distant water, brush on paper). No music, no voice, no
logos. "Less like a movie title card, more like the opening
page of a book one is about to enter."

**Subject-scope caveat:** the project's current gameplay
focuses on AI policy; future additions will address climate,
wealth concentration, and others. The description copy must
read as the whole-polycrisis idea, not AI-only. The current
description passes this test (no AI-specific language).

**Open items before render:**

- ~~Review the description and instruction copy. Lock or revise.~~
  Locked (user approval).
- ~~Confirm title casing.~~ Confirmed lowercase per case-study/social-posts.md.
- ~~Render duration.~~ 12s (then 5s × 3 beats, see below).

These are not yet committed — pending your review of the copy,
casing, and duration.

### Render and stitch — what actually shipped (August 2026)

Three separate 5-second renders at 2K/16:9 (h3's minimum
duration is 5s, not 4s — discovered when first 4s render was
rejected with HTTP 400). Stitches into a 12.5s opening.

- **Beat 1 (title)** — extracted from a 12s diagnostic render
  of `prompts/polycrisis-of-authority-opening.md`. The diagnostic
  was originally sent as a schema test (5 beats × 12s); beat 1's
  cleanest 4s window was at 3s-7s of the diagnostic. Schema
  discovered: must send both `prompt` AND
  `content: [{type: "text", text: "..."}]` with literal UTF-8
  characters and flattened newlines (no `\n` escapes inside the
  string values — h3's content-array routing fails on those).
- **Beat 2 (description)** — fresh 5s render via inline curl
  (job id `oVhhT70zY6gCyWtPvoFH`, cost $0.64). Extracted
  0s-4s.
- **Beat 3 (instruction)** — fresh 5s render via inline curl
  (job id `W3u6ahojMMyD36oYDI9k`, cost $0.64). Extracted
  0s-4s.

**Stitch:** ffmpeg concat with 0.5s `xfade` + `acrossfade`
between beats 2 and 3 (parchment-dominant transition, both
texts briefly visible during the overlap). Hard cut at
beat 1→2 — beat 1's extracted window has the title held
throughout, beat 2 starts with parchment only, so the seam
reads naturally.

**Final asset:**
`assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4`
(~12.5s, 2560×1440, h264+aac, ~16.7MB). Gitignored; produced
from committed prompts + script.

### Scripts and prompts that shipped this cycle

- `scripts/h3-generate.sh` — submit/poll/download wrapper for
  h3 via OpenRouter. Prompt file is source of truth for
  render params; env vars override. **Important gotchas
  captured in the script's payload construction:** literal UTF-8
  (no `\u2014` escapes), flattened newlines (no `\n` inside
  string values), and use `-c "..."` rather than `<<'EOF'`
  heredocs for python — heredocs inside `$()` redirect stdin
  in a way that empties the python script's input.
- `prompts/civil-society-accountability-infrastructure.md` —
  failed prototype 4, kept for the record.
- `prompts/polycrisis-of-authority-opening.md` — original
  3-beat prompt superseded by per-beat prompts.
- `prompts/polycrisis-of-authority-opening-beat-2-description.md`
- `prompts/polycrisis-of-authority-opening-beat-3-instruction.md`

### Session spend

- Prototype 4 (office render): ~$0.65
- Diagnostic render (12s): $1.54
- Beat 2: $0.64
- Beat 3: $0.64
- **Total: ~$3.48**

Future renders through the script should be cheaper — no
diagnostic render needed, no schema discovery needed.

## What this doc is not

- Not an implementation spec. No code. Code lands in a separate
  cycle doc when we move to implementation.
- Not a generation spec for the first batch. Prompts are
  developed in conversation, then captured here when settled.
- Not a commitment to ship. This is a working reference point for
  the design conversation.

## Sequence

Working sequence as of writing:

1. Lock open questions 1–5 in this doc. **[in progress]**
2. Develop generation prompt template (open question 6).
3. Generate a single prototype video. Assess aesthetic.
4. Decide whether to proceed to a full generation cycle based on
   the prototype.
5. Implement runtime selection (separate cycle doc).
6. Wire into TUI loop. Verify with `/tmp/hermes-verify-NN.sh`.