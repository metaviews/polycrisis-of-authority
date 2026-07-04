# Polycrisis of Authority — Political Context

Three drafts of the project's "why this exists and matters" framing,
tuned for three landing surfaces. All three honor the project's
memory-baked load-bearing constraints:

- the project is grounded in literacy + LLMs as case-study
- the design philosophy carries a taoist undertone
  (yield-and-shape, wu-wei) but **never** names taoism in
  player-facing or reader-facing copy
- edutainment is the discipline: felt-encountered awareness,
  not measurable competency shift
- the project is not a curriculum and does not advertise as one

the three drafts are intentionally different in scope, anchor, and
register. pick the surface; pick the draft; send.

---

## draft A — general ("AI policy literacy is needed in 2026")

broad + durable. the framing ages well; doesn't anchor to specific
events. for landing on a project README, a wiki index, or anywhere
"this is the project" needs a paragraph of context.

```
why this project exists

i started building polycrisis of authority because AI policy
literacy is genuinely low, and the usual reasons for that aren't
going away soon. policy literacy doesn't transfer through
reading. it transfers through *what your words did*, vs.
*what you meant*. you read a primer; nothing lands. you read
your own move's effect on the state of your authority, and
the next crisis lands. the difference is felt, not
instructed.

so the project doesn't teach. it puts you in a chair. you
govern through overlapping crises, responding with policies
you write yourself. the engine reads your words, interprets
them against a curated mechanics wiki, and shifts the state
of your authority across six axes. you can consult five
advisors, each grounded in a distinct political position.
the next crisis lands.

the design philosophy: yield-and-shape. you don't outflank
the system; you compose with it. you don't find the right
policy; you find the policy that survives the next two
crises without quietly weakening the third. you don't win —
you last. duration is the metric. the run ends when
authority collapses, often suddenly, after a long period in
which your decisions seemed reasonable, even effective.

there's a moment every player hits where they realize the
collapse they just didn't survive wasn't a surprise. it was
visible, two moves ago, in a signal they read as
encouraging. that moment is the lesson. you don't write a
quiz afterward; you just felt what policy actually does.

the case-study claim (the second reason this project exists):
the bot is built for the question "what happens when language
is the lever and the state is real?" every run produces an
observable record of the model's behavior. the LLM is
swappable via .env. same code, different model, different
interpretation shape. the contribution isn't the model;
it's the swappable seam.
```

---

## draft B — current-events-anchored

anchors to the 2026 AI-policy moment. shorter; more time-
sensitive; should be revised when the political surface
shifts. for landing on linkedin, twitter, blog-substrate
pieces, and other surfaces where "why now" matters.

the anchor here is intentionally abstract enough to survive
mid-2026 publication: **"credibility is collapsing across
the institutions that ought to hold it"** — true across
multiple 2026 developments without naming any of them. this
deliberately respects the political-events-anchored framing
without locking to a specific event that might age out
within months.

```
why this project exists — 2026

the credibility of the institutions that hold authority is
becoming a real-time variable. not a principle, not a
tradition — a variable, in the same sense as a stock price
or a model capability index. you can watch it move. you
can watch it move in response to language. you can watch it
move in response to language that was probably not designed
to move it.

this is what 2026 looks like, and it's why a single-player
simulation game where the mechanic is *writing policy in
your own words* stops feeling like a thought experiment.

polycrisis of authority puts the player in the chair of an
authority that is being tested by overlapping crises —
upstream embedding, capability escape, legitimacy erosion,
narrative capture. the player responds in their own words.
the engine interprets. the world's state shifts across
six axes: legitimacy, fiscal slack, factional alignment,
ecological debt, narrative coherence, capability. the
crises don't stop; the next one lands.

the design philosophy is yield-and-shape. the player
doesn't outflank the system; they compose with it. the
player doesn't find the right policy; they find the policy
that survives the next two crises without quietly
weakening the third. they don't win; they last.

this isn't a curriculum. it isn't trying to teach policy.
the project memory at the design table is explicit on
that: edutainment, not curriculum; literacy is felt-
encountered awareness, not measurable competency shift.

what it is: a chair. what it does: let you sit in it long
enough to feel what the room looks like when the lights
start to go.
```

---

## draft C — historical throughline

explains the project against the timeline:
**2016 disinformation → 2020 coordination → 2024 deepfakes →
2026 capability thresholds**. longer-form register; for
landing surfaces that want a paragraph with intellectual
grounding (long blog, podcast-show-notes, conference abstract).

```
why this project exists — the long view

the project sits at the intersection of two timelines.

one is the timeline of language as a political lever:
2016's election-cycle disinformation demonstrated that
narrative coherence could be moved at scale by deliberate
language. 2020 demonstrated that the lever generalized —
coordination attacks, inauthentic amplification, etc. 2024
made the lever's lower bound disappear; high-fidelity
generative media moved credibility-of-evidence from a
background constant to a contested variable. 2026, by
most reasonable readings, sits at the edge where language
models themselves participate in the lever — not as a
passive participant, but as an active interpreter of what
was said and what should be the policy response.

two is the timeline of the policy responses to that lever:
mostly defensive (post-hoc attribution, content moderation,
detection tooling), some structural (model release rules,
upstream-embedding audits), most of it producing a
credibility-erosion cascade that compounds rather than
resolves.

polycrisis of authority is the project's reading of what
that compound state demands of *literacy*, not of *policy*.
the project is grounded in two claims.

first, that literacy about AI policy doesn't transfer
through reading. it transfers through what your words did,
vs. what you meant. this is a felt claim, not a measurable
one. the project doesn't try to teach; it puts the player
in the chair. the player governs, the engine responds in
their own words, and the world replies. the player reads
the next crisis and the next state shift, and the next.

second, that the literacy is best built against a model
that has a swappable seam. every run produces an observable
record of the model's behavior — runs as text in a run-log
directory, as markdown, as html. the same code runs
against minimax m3, any openrouter model, or any openai-
compatible API. the case-study claim is that the swappable
seam is the contribution: it makes the model's
interpretation shape directly observable in the run output.

the design philosophy: yield-and-shape. the player doesn't
outflank the system; they compose with it. the player
doesn't find the right policy; they find the policy that
survives the next two crises without quietly weakening the
third. the player doesn't win — they last. the run ends
when authority collapses, often suddenly, after a long
period in which their decisions seemed reasonable, even
effective.

the moment every player hits where they realize the
collapse they just didn't survive wasn't a surprise — that
moment is the project's contribution to the literacy
timeline. it isn't a curriculum. it doesn't measure
competency. it builds a felt sense of what policy actually
looks like when language is the lever and the state is
real.
```

---

## which draft for which surface

| draft | surface |
|---|---|
| A (general) | project README, wiki index, "what is this" paragraphs |
| B (2026-anchored) | linkedin, twitter, mastodon, blog posts, podcast intros, conference abstracts |
| C (long view) | long-form blog essays, conference papers, podcast show notes, project retrospective docs |

draft B is the most time-sensitive; expect to revise it as the
political surface shifts. draft C is the most durable; it ages well.
draft A is the canonical "this is the project" paragraph.

## universal constraints across all three drafts

- **never** name taoism, wu-wei, the dao, or any near-synonym
  in reader-facing copy. the philosophy is in the framing —
  yield-and-shape, surviving two crises without weakening the
  third, the moment of realizing the collapse wasn't a
  surprise. those phrases *are* the philosophy, disguised as
  design claims.
- **never** advertise as a curriculum, educational tool, or
  measurement of any kind. the literacy claim is felt, not
  measurable.
- **never** make political endorsements (no party alignment,
  no endorsement of specific legislation, no claim that any
  side is "right"). the project simulates; it doesn't
  advocate.
- **always** anchor literacy claims in a felt experience
  claim ("the moment where they realize," "you don't write
  a quiz afterward; you just felt what policy actually
  does"). the project's claim is on the experience side,
  not the curriculum side.
- **always** preserve the case-study thread: swappable LLM,
  observable run artifacts, corpus-grounded mechanics. these
  are load-bearing for the project's claim-to-minimax
  cooperation; they survive across all three drafts.

## sources

- conversation with the user, 2026-07-04: three drafts (general
  / current-events / historical-throughline), taoist
  undertone (never named), surfaces left to the user
- project memory, session-start: taoist design philosophy
  carried silently; wu-wei encoded as design claims;
  yield-and-shape surfaced in player-facing prose without
  naming the tradition
- 2026 political surface: deliberately abstract in draft B;
  no specific event named, no specific institution named,
  no specific actor named. respects the project's
  non-endorsement constraint
- prior political-context drafts at `wiki/prototypes/` from
  phase 1 corpus synthesis (re-grounded for the public-
  facing case-study moment)
