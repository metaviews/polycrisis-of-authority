# Polycrisis of Authority — minimax Discord Showcase Post

First-principles draft for posting in minimax's `#showcase` (or
adjacent) channel on their community Discord. Written from
inference about minimax's showcase conventions because the
channel format wasn't directly shared during grounding — see
the "format assumptions" callout below for what was assumed.

## assumptions about the showcase channel

the user grounded that there's **no known template** for
minimax's `#showcase` channel. the format below is what a
reasonable showcase post for an open-source project looks
like on most community-discord showcase channels — it might
need resizing once the user has seen a few examples. the
core claims and the artifact pointers stay constant; tone,
length, and field ordering can be tightened to match the
channel.

common shape on minimax-style communities:
- post includes: project name, one-line description, link to
  the artifact, one screenshot or short embed, a tag or
  category, the author/team tag
- tone: descriptive, not promotional; technical framing
  preferred
- links are unfurled by discord automatically
- emoji: usually 1-2 max, often none

## the post

```
polycrisis of authority — single-player AI policy sim with a
swappable LLM.

what it is
the player governs through overlapping crises, responding with
policies written in their own words. the engine is corpus-
grounded (47 wiki entries ground the state model, crisis
catalog, and advisor voices) and every response is
LLM-interpreted against a documented mechanics grammar.

case-study claim
the bot is built for the question "what happens when language
is the lever and the state is real?" every run produces an
observable record of the model's behavior. the LLM is
swappable via .env — same code, different model. default
runs against minimax m3; alternates include any openrouter
model or any openai-compatible API.

two surfaces
terminal (multi-line continuation + status spinner) and discord
(slash commands + embeds + end-of-run report). runs on a $5
VPS, a laptop, or a discord DM.

artifact pointers
github: github.com/metaviews/polycrisis-of-authority
docs cycle for the case-study design: docs/16-deployment.md
corpus: wiki/ (mechanics, crises, advisors)

license: MIT
```

## structural choices

### why a thread-post (not an embed)

minimax-style showcase channels typically accept plain-text
posts and let discord unfurl the github link into an embed
automatically. the post above is structured for **plain text +
auto-unfurl**, not a hand-built embed. if the user wants to
ship a hand-built embed (rich thumbnail, custom fields), the
post needs to be rebuilt via the discord client's embed
formatter — that's a separate decision.

### why the section headers are bolded (`**what it is**`)

plain text in a showcase post gets read as a wall of prose.
bolded inline section headers act like a signal that this is a
structured post, not a long ramble. matches the convention used
in minimax-flavored community showcases for technical posts.

### why no emoji

emoji in showcase posts read as promotional or "social media-y."
the project framing is technical; emoji at the head of a
technical post de-anchors it. if the channel's convention
demands an opener emoji, a single 🔬 (microscope) or 🜂 (alchemy
sign for "manifest, project, transform" — also a fun periodic-
table joke) at the very top is the lightest-touch opener
that's still on-tone. both alternatives are documented so the
user can choose; the default is none.

### why no image inline

the user grounded minimax-flavored showcase posts typically
do **not** carry images inline (the github README handles the
visual). if the user later wants a screenshot for the embed
unfurl, that's a follow-on render.

## format-tuning callouts for the user

before posting, the user should look at 2-3 recent
`#showcase` posts on their target channel and check:

1. **title convention**: is the post titled by the project name,
   by a one-line tagline, or by something else? (the draft above
   assumes title = project name.)
2. **section count**: do showcase posts typically have 4
   sections (this draft's count), or is it shorter / longer?
   adjust by editing or merging sections.
3. **field placement**: is "license" at the start or the end?
   (this draft puts it at the end; some showcase channels
   prefer it at the top.)
4. **tag / category convention**: does the post need a leading
   tag like `Project:` or `[Showcase]` for routing? if so,
   prefix accordingly.
5. **author tag**: does the showcase channel expect the
   project maintainer's handle somewhere? typically yes —
   confirm and add.
6. **image vs no-image**: if recent showcase posts all have an
   inline image (gameplay screenshot, architecture diagram),
   this draft's plain-text style won't fit in. add a screenshot
   or a `docs/` image link.

a quick check of 2-3 recent posts takes ~10 minutes and avoids
the post looking stylistically off in the channel.

