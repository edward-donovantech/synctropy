# Blog Plan — "What I Use and What I Build"

*Goal: a permanent external-facing surface that compounds. Every post is simultaneously
Synctropy GTM, job-search proof, and consulting lead-gen. You post it; nothing publishes itself.*

## Platform decision

**Recommendation: your own domain, static site.**
- **Where:** `donovantechnology.com/blog` (career-durable — outlives any one product), with each
  Synctropy-specific post cross-linked from getsynctropy.com. If donovantechnology.com is hard to
  touch, `getsynctropy.com/blog` via Lovable is an acceptable start — migrate later.
- **How:** Astro blog starter deployed on Vercel (you already deploy there; a blog post is a
  markdown file in a repo — I can scaffold this whole thing next session). Zero monthly cost.
- **Cross-post** (don't silo): dev.to and Hashnode with `rel=canonical` back to your domain —
  free distribution, no SEO penalty. LinkedIn gets a 200-word excerpt + link, never the full text.

**Why not Substack/Medium:** you're building a *portfolio surface*, not a newsletter business.
Recruiters landing on yourdomain.com/blog with your name, your products, and your writing is the
point. (Add an email capture footer anyway — costs nothing, options later.)

## Cadence

**One post every 2 weeks.** Sustainable next to the job search and GTM rhythm; a dead blog is
worse than none. Batch: draft Fridays after the metrics review (GTM.md), publish Mondays, promote
Mon (LinkedIn) + Thu (X).

## The two content tracks

**Track A — What I build** (deep, evergreen, interview ammunition):
architecture decisions, trade-offs, and honest post-mortems from Synctropy/BackBurn.

**Track B — What I use** (light, searchable, high-frequency):
your actual stack and workflows — Claude Code, MCP tooling, the agentic SDLC as you practice it.
These rank on search ("how to X with MCP") and feed Track A readers.

## First 10 posts (in order)

1. **"What I got wrong building my first production MCP server"** (A) — the dashboard→MCP pivot,
   the determinism/judgment boundary, what you'd do differently. *Your strongest story; draft
   outline below.*
2. **"Your AI should never touch a file without asking: privacy as architecture"** (A) — the
   metadata-only boundary, dry-runs, approval gates. Doubles as the landing page's privacy link.
3. **"My agentic SDLC: how I actually build with Claude Code as a solo founder"** (B) — searchable,
   relatable, recruiter-catnip for FDE roles.
4. **"Entropy for file systems: scoring 'messy' in three measurable dimensions"** (A) — scatter /
   naming chaos / temporal decay, with real before/after scores. Inherently visual.
5. **"The MCP tools I install first on every machine"** (B) — listicle, high search volume, links
   to synctropy-mcp naturally.
6. **"Evals for deterministic classifiers in an agentic pipeline"** (A) — publish alongside
   PROJECT-ROADMAP P1-4; precision/recall tables from your own harness.
7. **"Anatomy of an agentic CX architecture"** (A) — the genericized Maven prep. No names.
8. **"From RFPs to repos: what 10 years of enterprise pre-sales taught me about shipping AI"** (A/B)
   — the bridge post; this one is pure job-search positioning.
9. **"Case study: organizing [real user]'s 40,000-file Drive with an AI that asked permission"**
   (A) — publish when P1-3 lands. The best sales asset you'll have.
10. **"12 skills, one pipeline: designing multi-step agent workflows that degrade gracefully"** (A)
    — the skills/MCP split from CLAUDE.md, generalized.

## Post #1 — working outline (draft this one first)

- **Hook:** "I spent months building a dashboard nobody was going to open. Here's the moment I
  realized the AI client *is* the UI — and what it cost me to be wrong."
- The original Synctropy: web dashboard, entropy scores, why it looked right on paper
- The signal: LLM platforms commoditizing UI; customer discovery across 4 industries saying the
  same thing sideways
- The pivot: what moved server-side (deterministic rules, persistence) vs. client-side (judgment,
  interaction, execution) — include the architecture diagram from the repo README
- Three mistakes worth stealing: (1) scores users don't feel (entropy → raw metrics lesson),
  (2) building UI before distribution, (3) treating determinism as an afterthought in agent design
- Close: link to the open-source server, "install it in 60 seconds"
- Length: 1,200-1,500 words. Tone: specific, numbers where possible, zero hype.

## Hygiene
- Every post ends with the same 2-line bio + links (LinkedIn, GitHub, synctropy-mcp, "work with
  me" → CONTRACT-OFFER positioning)
- OpenGraph image per post (Lovable/Figma template once, reuse forever)
- Add each published post to LinkedIn Featured and the PIPELINE.md Friday review
