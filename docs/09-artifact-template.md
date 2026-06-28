# Shareable Artifact Template

_Defines what the player takes away from a run. The project's main distribution surface. Read after the spine, the wiki structure plan, the state model spec, the interpretation grammar spec, and the crisis anatomy spec._

This spec defines what a player sees when a run ends. The artifact is the project's main distribution surface — what the player shares, what others see, what the case-study claim ultimately rests on. If the artifact fails its three jobs (per Principle 3.4), the project fails its central design intent.

The artifact is generated from the run log by the simulation engine at the moment of collapse (or, in MVP-0, at the end of any run, regardless of whether collapse fired). The template specifies what the engine produces; the orchestrator tunes the template through refinements (per Principle 4.3).

## Purpose and scope

**What the artifact is.** The artifact is a self-contained document — shareable as text, image, or URL — that reports on a single run of the simulation. It is generated automatically from the run log. It is not hand-written by the player, the developer, or the orchestrator (though the orchestrator can refine the template over time).

**What the artifact is not.** It is not a leaderboard, a score, a rating, or a comparison to other players' runs. It is not promotional material for the game. It is not a victory screen.

**What the artifact does.** Per Principle 3.4, the artifact has three jobs:

1. **Report on the player's run.** Honest about what happened — the crises faced, the moves made, the state trajectory, the collapse (if it occurred). Not a celebration or a critique.
2. **Invite others to play.** Specifically, framed by the run's content — what was interesting, what other readings are possible, what the player might do differently.
3. **Function as an AI policy artifact in its own right.** Legible as commentary on the policy domain, not just as a game score. The interpretive chain and grounding references are what make this possible.

All three jobs are required. The artifact that does only (1) and (2) is a meme; the artifact that does only (3) is inaccessible. The artifact that does all three is the project's case-study claim in material form.

## Three jobs, made concrete

### Job 1: Report on the player's run

The report is a narrative reconstruction of the run — what crises surfaced, what moves the player made, how the state evolved, when and how collapse occurred (or didn't).

The report is honest about the run's outcomes. A run that collapsed after 14 turns is reported as a collapse, not as "an interesting experiment in policy under pressure." A run that stabilized for 20 turns before collapse is reported with both the stability *and* the collapse.

The report is not evaluative. It does not say the player did well or poorly. It says what happened and what the system read the moves to be. The interpretive gap between intent and effect is the literacy device; the report makes that gap legible without judging it.

### Job 2: Invite others to play

The invitation is framed by the run's specific content — the crises faced, the moves made, the surprising readings the system produced.

Not generic: not "play Polycrisis of Authority and discover what governance feels like."

Specific: "You faced the Mythos capability release on turn 7. The system read your emergency summit as an admission of incapacity given the elite alignment at the time. What if you had read the crisis as upstream-embedding rather than capability-escape? Try a different reading."

The invitation names what was interesting about the run — what other moves might have produced, what other readings might have happened. It's an invitation based on the run's actual content, not a marketing hook.

### Job 3: Function as an AI policy artifact

The artifact is legible as commentary on the policy domain, not just as a game score. Three pieces of content do this work:

- **The interpretive chain.** For at least the collapse turn (and ideally for several other key turns), the artifact shows what the model read the player's move to be, what state-vector deltas it produced, what wiki entries grounded its interpretation. This makes the LLM-as-interpreter visible — the case-study claim.
- **The grounding references.** Wiki entries cited in the artifact are real, citable, dated sources. A reader who follows the references encounters the Metaviews corpus and the parent project's intelligence work.
- **The policy-domain framing.** The crises in the run trace to real AI policy situations (per the crisis anatomy spec). The artifact names these situations in language that anyone who follows AI policy would recognize.

A reader who has never played the game can read an artifact and learn something about how AI policy actually works — what the failure modes are, what the elite positions are, what the corpus analysis surfaces. That's the case-study claim in material form.

## Content structure

The artifact has eight sections, in this order. Each section is generated by the simulation engine from the run log; no human writes per-run content.

### Section 1: Header

A single line identifying the artifact as a run report: "Polycrisis of Authority — run report." The date. The model used (per Principle 1.1). The model version. The wiki version referenced.

This is the meta-data that makes the artifact traceable and citable.

### Section 2: Run summary

Three to five sentences summarizing the run: the opening state, the major crises faced, the closing state, the outcome (collapse type or non-collapse with turn count).

Example shape: "You governed for 14 turns. The regime began in a strained legitimacy position and faced three overlapping crises — a frontier capability release, a public trust shift, and a coordinated disinformant campaign. The Mythos release on turn 7 overwhelmed the regime's response capacity despite attempts at coordination. Collapse fired as technical collapse on turn 14."

### Section 3: State trajectory

A small data visualization or table showing the state vector's evolution across the run. For each of the six axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier), the trajectory from start to end, with named bands marked.

The visualization is austere: text or simple table, no decorative charts. Each axis shows the starting value, the ending value, the maximum excursion, and the named bands crossed.

This is what makes the run *legible as a state trajectory* — readers can see when legitimacy eroded, when fiscal slack depleted, when the capability frontier crossed.

### Section 4: Crisis log

A chronological list of the crises the player faced, with their failure-pattern tags and brief summaries. Each entry shows: turn number, crisis title, failure pattern(s) activated, the player's policy move on that crisis (verbatim), the system's interpretive gloss (verbatim), the state-vector delta.

This is the most detailed section. It's the section someone analyzing the run would read carefully — what was tried, what was heard, what shifted.

### Section 5: Interpretive chain

For the collapse turn (and 2-3 other key turns), a detailed rendering of what the grammar did:

- The player's policy move (verbatim).
- The wiki entries retrieved for this turn (paths and brief descriptions).
- The model's interpretive gloss (verbatim).
- The state-vector delta applied.
- The narrative move (what happened next, verbatim).

This section makes the case-study claim legible. A reader can see what the model knew (the wiki entries), what it heard (the gloss), and what it did (the delta). The opacity-in-play principle (Principle 2.1) is honored — the player couldn't see this during play — and the transparency-in-artifact principle is honored — it's all visible here.

### Section 6: Grounding references

A list of the wiki entries the run drew on, with paths and one-line descriptions. These are the corpus entries the simulation used to interpret the player's moves.

The list is sorted by frequency of reference (most-cited first). Each entry shows: path, title, description (from `wiki/index.md`).

This is the section that connects the run to the Metaviews corpus. A reader who follows the paths encounters the parent project's intelligence work.

### Section 7: Collapse reveal

If collapse fired: a detailed rendering of which hidden condition collapsed, the timeline of state changes leading to it, the player moves whose consequences were not visible at the time. The reveal surfaces what the player could not see during play.

If collapse did not fire: a note explaining why the run did not collapse (state remained above thresholds, or the run ended before collapse was inevitable).

This section is the pedagogical climax per Principle 3.3. The collapse is a reveal, not a game-over screen.

### Section 8: Play invitation

A specific invitation framed by the run's content. Names what was interesting — what other moves might have produced different deltas, what other readings might have been possible, what the player might try next time.

The invitation is not "play again." It's "consider what would have happened if..." — pointing at a specific alternative the run makes legible.

## Length and format

### Length

The artifact has a target length of 1,500–2,500 words. This is long enough to do all three jobs, short enough to be shareable as text without overwhelming the reader.

Section-by-section rough budgets:
- Header: 50 words.
- Run summary: 100-200 words.
- State trajectory: 100-200 words + a table.
- Crisis log: 500-1000 words (most of the length).
- Interpretive chain: 300-500 words.
- Grounding references: 100-200 words.
- Collapse reveal: 100-300 words.
- Play invitation: 50-100 words.

Total: ~1,300-2,550 words. Tunable per run based on length.

### Format

The artifact is generated in markdown. Markdown is chosen because:

- It's text-based, shareable as plain text, email, or markdown file.
- It can be rendered to HTML for web display.
- It can be rendered to PDF for static sharing.
- It's the format the rest of the project uses (docs/, wiki/, README).

The artifact template is itself a `wiki/mechanics/` entry (per the wiki structure plan). The template is versioned. Refinements to the template are auditable per Principle 4.3.

Distribution forms:
- **Text.** The markdown rendered as plain text. Shareable in any medium that accepts text.
- **Self-contained URL.** The markdown rendered as a static HTML page hosted at a stable URL. The URL contains a hash of the run log for verification.
- **Image (later).** A rendered version of the state trajectory visualization as an image, suitable for social media. Not in MVP-0.

## The interpretive chain — what it shows

The interpretive chain (Section 5) is the case-study claim's most direct surface. It shows, for the collapse turn and 2-3 other key turns:

1. **What the player wrote.** The policy move, verbatim. No preprocessing, no summary.
2. **What the model knew.** The wiki entries retrieved for this turn. The model's interpretation was grounded in these entries; the reader sees exactly which.
3. **What the model heard.** The interpretive gloss, verbatim. The model's reading of the move.
4. **What the model did.** The state-vector delta applied.
5. **What happened next.** The narrative_move produced, verbatim.

This is a *trace*. A reader can follow the chain from the player's words through the model's reading to the simulation's state change. The chain is the case-study claim made material — the model reads, the reading is grounded, the reading produces state changes, and all of it is observable.

The opacity-in-play principle (Principle 2.1) is preserved — this trace is not visible during play. The transparency-in-artifact principle (Principle 3.4) is preserved — the trace is fully visible after the run.

### Selection of turns for the interpretive chain

The collapse turn is always included. Beyond that:

- A turn where the player made a policy move the system read differently than the player intended.
- A turn where the player made a move that triggered an unexpected state-vector delta.
- A turn where the player consulted an advisor before writing.

The orchestrator selects these turns during artifact generation. The selection is heuristic, not rule-based — the orchestrator reads the run log, picks the most pedagogically interesting turns, and includes them in the artifact.

## The grounding references

The grounding references section (Section 6) is what connects the run to the Metaviews corpus. It's a list, sorted by frequency, of the wiki entries the run drew on.

Each entry shows:

- **Path.** The wiki entry's path (e.g., `concepts/algorithmic-authority.md`).
- **Title.** The entry's title from frontmatter.
- **Description.** The one-sentence summary from `wiki/index.md`.
- **Reference count.** How many turns referenced this entry.

The list is what makes the run *legible as an AI policy artifact.* A reader who follows the references encounters the corpus — the analysis the simulation was grounded in. The case-study claim is that this corpus is real, dated, citable, and auditable.

The reference list also surfaces *what the run was about* — which corpus entries were most active. A run heavy on `concepts/ai-arms-race.md` references is about the AI race; a run heavy on `concepts/cognitive-authority.md` references is about legitimacy and attention. The artifact reader can see what was happening.

## The play invitation

The play invitation (Section 8) is the most distinctive section. It's not a generic "play again" — it's a specific suggestion framed by what was interesting about this run.

The invitation has three parts:

1. **What was interesting.** A specific observation about the run — a move that produced unexpected state shifts, a crisis the system read differently than expected, an advisor consultation that shaped the player's policy.
2. **What other readings are possible.** A specific alternative — what would have happened if the player had read the crisis differently, what would have shifted if the player had consulted a different advisor.
3. **The play link.** A URL to start a new run, with the framing that the new run will surface different crises and different moves.

The invitation's specificity is what makes it work. It's not "play our game" — it's "consider what would have happened if you had consulted the civil-society advisor before the Mythos release, and what state shifts that reading might have produced." A reader who's been following the artifact knows exactly what's being asked.

## Tone and visual register

The artifact's tone matches the parent Metaviews project's design discipline (per `../metaviews-website/DESIGN.md`):

- **Austere, archival.** Not promotional. Not congratulatory. Not evaluative.
- **Mono for chrome.** Dates, paths, model versions, table headers. The operational metadata.
- **Serif for prose.** The narrative report, the interpretive gloss, the play invitation. The reading content.
- **No gradients, no shadows, no decorative AI styling.** The artifact reads like intelligence-desk output, not a game victory screen.
- **Honest about uncertainty.** The model's confidence field surfaces in the artifact's interpretive chain — a `low` confidence is acknowledged, not glossed.

The artifact is shareable in part because its tone signals what kind of artifact it is. A reader sees the artifact and recognizes it as the kind of thing intelligence practices produce, not the kind of thing games produce. That's the case-study framing doing its work through visual register alone.

## Privacy and consent

The artifact is generated from the player's run log. The log may contain:

- The player's free-text policy moves (which can be personal, exploratory, or experimental).
- The model's interpretive glosses (which are about the moves, not about the player).
- The state-vector trajectory (which is about the simulation, not the player).
- The crises faced (which are part of the corpus, public).

**Default posture:** the artifact uses third-person framing throughout ("the player's regime," "the player's policy move"). It does not include any player-identifying information. The artifact is shareable without the player's identity being part of the artifact.

**Consent for sharing:** the player generates the artifact explicitly by clicking "generate artifact" or similar. There is no automatic publication. The artifact lives as a markdown file the player controls unless they choose to share it.

**No analytics:** the artifact does not include tracking pixels, share-counts, or any instrumentation. Sharing the artifact does not notify the project.

## Audit criteria

The artifact template is shippable when:

- The eight sections are specified with content shapes and length budgets.
- The interpretive chain is specified for at least the collapse turn and 2-3 other key turns.
- The grounding references section is specified with sorting and content rules.
- The play invitation is specified as specific (not generic) and runs of all three parts.
- The tone and visual register align with the parent project's design discipline.
- Privacy and consent posture is documented (third-person, explicit generation, no analytics).
- The template is committed as a `mechanics/` wiki entry with a version.

When the artifact is implemented (Phase 3 build), additional ship criteria apply:

- A run can be completed and have its artifact generated without crashes.
- The artifact length is within budget (1,500-2,500 words typical).
- The interpretive chain surfaces correctly for at least the collapse turn.
- The grounding references section lists all wiki entries the run cited.
- The play invitation is generated with all three parts.
- A reader who has not played the game can read the artifact and learn something about AI policy.

## Sources for this spec

- The vision document (`docs/00-vision.md`) — the three purposes of the project, the literacy claim and the case-study framing.
- The design principles (`docs/02-design-principles.md`) — especially Principles 2.1 (opacity in play, transparency in artifact), 3.3 (collapse as reveal), 3.4 (artifact's three jobs), 4.3 (auditability of refinements).
- The state model spec (`docs/06-state-model.md`) — what the state trajectory shows.
- The interpretation grammar spec (`docs/07-interpretation-grammar.md`) — what the interpretive chain surfaces (state_delta, interpretive_gloss, narrative_move, grounding_trace).
- The crisis anatomy spec (`docs/08-crisis-anatomy.md`) — what the crisis log contains.
- The wiki structure plan (`docs/05-wiki-structure.md`) — where the artifact template lives and how it's versioned.
- The parent Metaviews project's design discipline (`../metaviews-website/DESIGN.md`) — the visual register the artifact inherits.
