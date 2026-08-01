# Civil Society Accountability Infrastructure — H3 prototype prompt

Source wiki entry: `wiki/themes/civil-society-accountability-infrastructure.md`

Generated for: prototype 4 of the doc's prototype set
(`docs/26-interstitial-video.md`, August 2026).

## Prompt (this block is sent verbatim to the model)

```text
A modest office at the end of a working day. Three or four
people at separate desks, mostly empty now. Lamplight. Stacks
of paper, a whiteboard with handwritten notes, a wall of
reports pinned up. One person remains, writing slowly at a
desk by the window. Outside the window: a city going dark.
Camera holds on the empty desks for a few seconds, then drifts
to the remaining worker, then to the window. Quiet office
tone — chair creak, distant plumbing, the soft sound of pen
on paper. Unhurried, attentive, small.
```

## Render params

- model: `minimax/hailuo-3`
- duration: 5 (cheapest viable render for the prototype)
- aspect_ratio: 16:9
- resolution: 2K (the only resolution h3 supports on openrouter,
  discovered at first-run; corrected in script default)
- generate_audio: true (per locked decision: H3 native audio)

## Notes

- The doc's prompt was written for a 15-second render. Some
  sentences about pacing ("holds for a few seconds, then drifts
  ...") translate awkwardly into 5 seconds. The render is a
  pipeline test first and an aesthetic test second; re-prompt
  at 15s once direction is locked.
- This prompt is the only one in the prototype set being
  generated right now. Prompts 1-3 live in the doc for
  comparison but are not queued.