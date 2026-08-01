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

### Prototype set (4 videos, August 2026)

Selected to span the atmospheric range. Substrate vs surface,
scale vs small, machinery vs attention.

**1. compute-as-geopolitics**

Vast datacenter interior at night. Rows of server racks receding
into distance. Cool blue-white LED glow from equipment status
panels. Single human figure seen from above, walking slowly
between the rows, dwarfed by scale. Camera holds wide, then
drifts forward at walking pace over fifteen seconds. Hum of
cooling systems and low electrical drone fills the room.
Cinematic, contemplative, no text, no logos.

**2. transparency-and-auditability**

Empty laboratory bench under a single harsh overhead light.
Glassware and printed documents arranged with care. A gloved
hand enters frame from the right and slowly rotates a sheet of
paper to read it under the light. No faces visible. Camera
holds still for the first half, then drifts down to a close
of the paper's surface — the text is illegible, but the
texture of inspection is the subject. Quiet room tone, faint
mechanical ventilation. Subdued palette, clinical.

**3. synthetic-media-and-information-environment**

A long continuous shot of a city street seen through a screen
of rain on glass. Reflections of passing cars, signage, and
pedestrians smear and recombine on the wet surface. The camera
is stationary inside, looking out. Sound is the rain against
the glass plus distant traffic muffled to almost-nothing. The
world on the other side of the glass is real but unrecoverable
as information; the glass is the subject.

**4. civil-society-accountability-infrastructure**

A modest office at the end of a working day. Three or four
people at separate desks, mostly empty now. Lamplight. Stacks
of paper, a whiteboard with handwritten notes, a wall of
reports pinned up. One person remains, writing slowly at a
desk by the window. Outside the window: a city going dark.
Camera holds on the empty desks for a few seconds, then drifts
to the remaining worker, then to the window. Quiet office
tone — chair creak, distant plumbing, the soft sound of pen
on paper. Unhurried, attentive, small.

These four prompts are queued for generation against
`minimax/hailuo-3` via OpenRouter. After viewing the results,
decide whether to expand to the full 14-category set or
re-prompt with adjusted atmospheric register.

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