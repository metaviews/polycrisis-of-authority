# Polycrisis of Authority — Opening Title Sequence (H3 prototype)

Source wiki entry: `wiki/themes/02-design-principles.md`
(Locked: taoist frame — wu-wei, yielding, the wise-sage-aspiration)

Source wiki entry: `wiki/00-vision.md` and `case-study/minimax-showcase.md`
(for description phrasing and project scope)

This is a single opening title sequence for `polycrisis of
authority`. Plays once at the start of each run.

## Brief

Three beats, in order, in one video:

1. **Title.** "polycrisis of authority" — full project name, rendered
   as on-screen type.
2. **Brief description.** A one-line gloss of what the game is.
3. **Brief instructions.** A one-line instruction on how to play.

Target duration: 12 seconds total (revised from 10 — gives each
beat one more second for text rendering stability). Beats roughly:
- title: ~4s
- description: ~4s
- instruction: ~4s

## Prompt (this block is sent verbatim to the model)

```text
An opening title sequence for a contemplative single-player simulation game.

The background is a still surface of muted parchment and ink-wash grey, soft and untextured, occupying the full 16:9 frame. No objects, no figures, no horizon.

Beat one — TITLE. In restrained serif type, the words "polycrisis of authority" appear centered horizontally, slightly above the visual center. The letters fade in over the first second and hold for three. The type is dark charcoal on parchment. Nothing else is on screen.

Beat two — DESCRIPTION. The title fades to grey. In its place, smaller serif type appears on a single line: "you govern; the world speaks back through crisis, pressure, and the patience of those you lead." The composition is asymmetric — generous empty space on the left, the text resting slightly low and right. Holds for four seconds.

Beat three — INSTRUCTION. The description fades. A single short line appears centered: "read the world. respond with care." Smaller still. Holds for four seconds, then fades to the parchment background, which holds for the final beat.

Sound: a single ambient bed of faint wind over distant water. No music, no voice, no other elements.
```

## Description and instruction wording — locked

The description and instruction lines are committed to the wiki once
locked. They are part of the project's voice, not throwaway copy.

- **description** (locked):
  "you govern; the world speaks back through crisis, pressure, and
  the patience of those you lead."

- **instruction** (locked):
  "read the world. respond with care."

These are my best first-pass attempts at copy in the project's
register. Both should be reviewed before commit.

## Render params

- model: `minimax/hailuo-3`
- duration: 12 (revised from 10 — gives each beat one more second
  for text rendering stability)
- aspect_ratio: 16:9
- resolution: 2K (the only resolution h3 supports on openrouter)
- generate_audio: true (per locked decision: H3 native audio)

## Notes

- This replaces the doc's prior `## Prototype set` (which was
  atmospheric-vignettes-by-theme). That direction failed the
  cultural-fit test on the first render — user feedback was
  "boring office has little to do with a polycrisis."
- The opening title sequence is the new v1 of the interstitial
  surface: one video, used at run start, not between turns.
- Between-turns interstitials are deferred to a future cycle,
  pending a successful opening title.
- This is a prototype. Aesthetic match is the test. Re-prompt
  as needed based on review.