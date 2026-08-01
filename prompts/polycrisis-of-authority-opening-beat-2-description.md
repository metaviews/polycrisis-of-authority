# Polycrisis of Authority — Opening Title Sequence, Beat 2: Description

Source wiki entry: `wiki/themes/02-design-principles.md`
(Locked: taoist frame — wu-wei, yielding, the wise-sage-aspiration)

Beat 2 of the three-beat opening title sequence. Plays after
beat 1 (title), before beat 3 (instruction). Visual reference
for this beat: the diagnostic render at
`assets/videos/prototype-2026-08/h3-schema-test.mp4` (a 12s
clip whose middle 4s, extracted at 3s-7s, shows the title
held clearly against a weathered-parchment background).

The description copy (locked):
> "you govern; the world speaks back through crisis, pressure,
> and the patience of those you lead."

## Prompt (this block is sent verbatim to the model)

```text
A still surface of weathered parchment — soft grey-cream with the
texture of an old book page, slightly mottled, no horizon — filling
the full 16:9 frame.

In restrained serif type, sized smaller than a title would be, a single
line of text fades in over the first second of the clip:

"you govern; the world speaks back through crisis, pressure, and the
patience of those you lead."

The line is positioned asymmetrically — generous empty space on the
left, the text resting slightly low and right of center, as if it
were a single line of prose in a printed book. The type is dark
charcoal against the parchment. It holds for two seconds, then fades
to the bare parchment over the final second.

No figures, no objects, no horizon, no movement other than the
fade of the text and a barely perceptible breath of camera drift.

Sound: a single ambient bed of faint wind over distant water,
continuing from the previous beat. No music, no voice, no other
elements.
```

## Render params

- duration: 5 (minimum supported by h3; trimmed to 4s in post
  to match beat 1's extracted window)
- aspect_ratio: 16:9
- resolution: 2K
- generate_audio: true