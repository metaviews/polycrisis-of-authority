# Polycrisis of Authority — Opening Title Sequence, Beat 3: Instruction

Source wiki entry: `wiki/themes/02-design-principles.md`
(Locked: taoist frame — wu-wei, yielding, the wise-sage-aspiration)

Beat 3 of the three-beat opening title sequence. Plays after
beat 1 (title) and beat 2 (description). Final beat before
the run begins. Visual reference for this beat: the diagnostic
render at `assets/videos/prototype-2026-08/h3-schema-test.mp4`
(a 12s clip whose middle 4s, extracted at 3s-7s, shows the
title held clearly against a weathered-parchment background).

The instruction copy (locked):
> "read the world. respond with care."

## Prompt (this block is sent verbatim to the model)

```text
A still surface of weathered parchment — soft grey-cream with the
texture of an old book page, slightly mottled, no horizon — filling
the full 16:9 frame.

In restrained serif type, sized smaller still than the previous
beat, a single short line of text fades in over the first second
of the clip:

"read the world. respond with care."

The line is centered horizontally, resting slightly below the
visual center. The type is dark charcoal against the parchment.
It holds for two seconds, then fades to the bare parchment over
the final second.

No figures, no objects, no horizon, no movement other than the
fade of the text and a barely perceptible breath of camera drift.

Sound: a single ambient bed of faint wind over distant water,
continuing from the previous beat. No music, no voice, no other
elements. The audio fades to silence over the final half-second
as the text fades out.
```

## Render params

- duration: 5 (minimum supported by h3; trimmed to 4s in post
  to match beat 1's extracted window)
- aspect_ratio: 16:9
- resolution: 2K
- generate_audio: true