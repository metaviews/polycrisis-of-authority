# Polycrisis of Authority — Social Posts

Variations for announcing + promoting the project across four platforms.
Each variant is platform-tuned: tone, length, framing, and call-to-action
match what performs on its surface.

## meta-grounding

the project memory at session-start carries these load-bearing
constraints, repeated here so each variant honors them:

- project framing: build-and-tend (garden metaphor), minimax case-study
  showcase, swappable LLM via .env, corpus-grounded
- design philosophy: taoist undertone (wu-wei, yield-and-shape) — but
  **never** named in player-facing copy
- taoism is the silent design frame; the literacy goal is the
  explicit one
- edutainment, not curriculum; literacy is felt-encountered awareness,
  not measurable competency shift

these constraints shape every variant. nothing in any post invokes
"the Tao," "wu-wei," "the Dao," or any near-synonym. the philosophy
is in the prose, not the naming.

## universal claims each variant honors

four claims are common to all variants, rephrased per surface:

1. **what it is**: a single-player simulation game where you govern
   through overlapping crises, responding in your own words
2. **what the player gets**: a felt sense of *why policy as a tool is
   crucial*, not a curriculum
3. **what makes it unusual**: the engine is corpus-grounded and reads
   back the player's own words, and the model is swappable
4. **what it's for**: case-study + literacy + edutainment; open
   source; built to be played

variants translate these claims into the register each platform
expects.

---

## variant 1: X / Twitter (threaded)

5 posts. punchy + technical. threads perform better than single
posts on x. each post ≤280 chars; thread reads top-down.

### post 1 (hook)

```
build a bot that teaches AI policy by making you *play it*.

polycrisis of authority: you govern, the world speaks back through
fragmented signals, and you write every policy in your own words.

no menus. no multiple-choice. the engine reads your words and
moves the state.

[link to github]
```

### post 2 (what's unusual)

```
what makes it unusual:

• every response is free-text, LLM-interpreted
• ground truth is corpus-grounded (curated mechanics wiki + crisis set)
• the model is swappable via .env — same code, different LLM
• runs in a terminal OR a discord server, single player

the case-study claim: every run produces an observable record of
the model's behavior. designed to surface what LLMs actually do
when language is the lever.
```

### post 3 (the literacy frame)

```
why a game?

policy literacy doesn't transfer through reading. it transfers
through *what your words did* vs. *what you meant*.

the bot doesn't grade you. it shows you the state of your
authority after each move, and the next crisis lands.

no winning condition. duration is the metric. the run ends
when authority collapses, often suddenly, after a long period
in which your decisions seemed reasonable, even effective.
```

### post 4 (build with)

```
engine: node.js. corpus from a curated wiki. case-study LLM:
minimax m3 (swappable to any openrouter model via .env).

surface adapters: terminal (multi-line continuation, status
spinner) and discord (slash commands, embeds, status).

open source under MIT. runs on a $5 VPS, a laptop, or in a
discord DM.
```

### post 5 (the ask)

```
if you've ever wanted to *feel* what AI policy does — what
fragile signals look like, what sudden collapse feels like, what
"credibility" means when it's a number on a screen — try it.

github.com/metaviews/polycrisis-of-authority

5 minutes from clone to first crisis.
```

---

## variant 2: Mastodon (single long post)

mastodon rewards slightly longer single posts. 600-800 chars works.
less hashtag-heavy than twitter. more conversational; can talk about
the design philosophy in framing terms without naming anything.

```
build a single-player simulation game where you govern through
overlapping crises, responding with policies you write yourself.

the design premise: policy literacy doesn't transfer through
reading. it transfers through what your words did, vs what you
meant. so the engine is built around free-text moves — every
"policy" you type is LLM-interpreted against a curated mechanics
wiki, and the state of your authority shifts accordingly.

what makes it unusual:

• corpus-grounded: 47 wiki entries ground the state model,
the crisis catalog, and the five advisor voices
• the LLM is swappable: same code, .env flip, different model
• surfaces: terminal (multi-line + status spinner) + discord
(slash commands + embeds)
• no winning condition. duration is the metric. authority ends
when it collapses — often suddenly, after a long period in which
your decisions seemed reasonable

case-study framing: every run produces an observable record of
the model's behavior. the bot is built for the question "what
happens when language is the lever and the state is real?"

open source MIT. github link in bio.

#ai #policy #simulation #opengame
```

---

## variant 3: LinkedIn (long-form professional)

linkedin rewards longer, professional-register posts that open with
a thesis and end with a clear ask. ~1300 chars works. tone is
serious-but-accessible. no emoji overload.

```
i've spent the last two years thinking about why AI policy
literacy stays low even as the policy stakes rise.

the usual answer: people don't read policy. but the deeper
answer is that people don't *experience* policy. they read
*about* it. they don't see what their words did — vs. what
they meant.

so i built something to close the gap.

polycrisis of authority is a single-player simulation game
where you govern through overlapping crises, responding with
policies you write in your own words. the engine is corpus-
grounded (47 wiki entries — state model, crisis catalog, five
advisor voices), and every response is LLM-interpreted
against a documented mechanics grammar.

what happens when you play: you write a policy. the world
replies. your authority's state shifts across six axes —
legitimacy, fiscal slack, factional alignment, ecological
debt, narrative coherence, capability. you can consult
five advisors, each grounded in a distinct political
position (frontier lab, civil society, state security,
open source, international ally). the next crisis lands.

there is no winning condition. duration is the metric. the
run ends when authority collapses — often suddenly, after a
long period in which your decisions seemed reasonable, even
effective. the lesson lands because the player is surprised
by it.

two design commitments shaped the project:

first: corpus-grounded ground truth. every claim the LLM
makes about the state of the world can be traced to a
wiki entry, an advisor voice, or a crisis entry. this is
what separates "AI policy as vibe" from "AI policy as
documented mechanic."

second: a swappable LLM. the same bot runs against minimax
m3 (the case-study model), any openrouter model, or any
openai-compatible API. the .env controls the swap. the
case-study claim is that the *swap* is the contribution:
different models produce different policy interpretation
shapes, and the difference is observable in the run logs.

the project ships in two surfaces: a terminal version (multi-
line continuation, status spinner) and a discord version
(slash commands, embeds, end-of-run report). open source
under MIT. runs on a $5 VPS, a laptop, or a discord DM.

if you build tools in the AI-and-policy space, i'd love
your read on the mechanics grammar. the wiki is at the
github link — feedback welcome.

github.com/metaviews/polycrisis-of-authority
```

---

## variant 4: Reddit (r/gaming, r/MachineLearning, r/policy)

reddit rewards: title that promises a specific thing, problem
statement in the first 2-3 lines, **tl;dr** at the end. comments
are first-class; posts that invite them do better. ~500-char
intro is the sweet spot.

### reddit title options

- for r/gaming: "i built a single-player game where every
  policy you write is LLM-interpreted (corpus-grounded,
  swappable model, open source)"
- for r/MachineLearning: "built a corpus-grounded AI policy
  simulation with a swappable LLM (every run produces an
  observable record of the model's behavior)"
- for r/policy: "we made a single-player game where the
  mechanic is *writing policy in your own words*. open source,
  corpus-grounded, runs on minimax m3"

### post body (works for all three)

```
i've been building a single-player simulation game where you
govern through overlapping crises, responding with policies you
write yourself. no menus, no multiple choice — the engine
reads your words, interprets them against a curated mechanics
wiki, and shifts the state of your authority accordingly.

the design premise: AI policy literacy doesn't transfer through
reading. it transfers through what your words did vs. what you
meant. so the engine is built around free-text moves. every
"policy" is LLM-interpreted against a documented grammar, and
the world replies.

what makes it unusual:

• corpus-grounded — 47 wiki entries (state model, 8 crises,
5 advisor voices) ground every claim the LLM makes
• swappable LLM — same code runs against minimax m3 (the case-
study model), any openrouter model, or any openai-compatible
API. swap is .env-only
• two surfaces — terminal (multi-line + status spinner) and
discord (slash commands + embeds + end-of-run report)
• no winning condition. duration is the metric. authority
ends when it collapses — often suddenly, after a long period
in which your decisions seemed reasonable, even effective

the case-study framing: the bot is built for the question
"what happens when language is the lever and the state is
real?" every run produces an observable record of the
model's behavior. runs as text in a run-log directory, as
markdown, and as html.

open source under MIT. runs on a $5 VPS, a laptop, or a
discord DM.

github.com/metaviews/polycrisis-of-authority

tl;dr: single-player AI policy sim. write policies in your own
words. engine is corpus-grounded + LLM-interpreted. model is
.env-swappable. open source MIT.

happy to answer questions about the mechanics grammar, the
swappable-model layer, or the corpus-grounding pattern.
```

---

## universal rules across all variants

- **never** mention "tao," "taoism," "wu-wei," "the dao," or any
  near-synonym in the post body. the philosophy is in the prose,
  the framing, the outcomes. not in the naming.
- **never** use "AI literacy" as a tag or hook without grounding it
  in a felt experience claim ("the player is surprised by the
  outcome," "your decisions seemed reasonable," etc.). the project
  avoids literacy-as-competency claims.
- **never** invoke marketing-y superlatives ("revolutionary," "the
  future of," etc.). the project's register is descriptive, not
  promotional.
- **always** include the github link. the case-study framing lives
  or dies on the public artifact.
- **always** invite response. threads succeed when the author is
  available for follow-up. linkedin and reddit in particular
  reward response-seeding ("happy to answer questions about X").
- **always** stay platform-native. the linkedin variant shouldn't
  open with a punchy one-liner; the twitter thread shouldn't have
  paragraphs. each format's strength is its format.

## usage notes

the variants are independent — pick the platform, paste, post. don't
mix-and-match; the threading/structure of each works as a unit.

when the project ships a notable release (cycle 7-live-run, public
1.0), revisit each variant and add a "what's new" line. the
variants above are written for the initial launch frame.

## sources

- conversation with the user, 2026-07-04: 4 platforms (twitter,
  mastodon, linkedin, reddit), taoist undertone in tone (never
  named), corpus-grounded framing, swappable LLM as the
  case-study claim
- project memory, session-start: build-and-tend framing, minimax
  case-study showcase, edutainment-not-curriculum discipline
- prior social-post drafts at `wiki/prototypes/` (older cycles;
  re-grounded for the public-launch moment)
