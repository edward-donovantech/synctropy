# Portfolio Project Roadmap — Making the AI Work Verifiable

The gap to close: your AI experience is currently *claims on a resume*. FDE/SA screeners at AI
companies filter for *artifacts* — things they can click, install, watch, and measure. Every project
below converts a claim into an artifact. Priority order is by (interview impact ÷ effort).

---

## P0 — This week (do these before the next application batch)

### 1. Give Synctropy a public face — README + diagram + installable server
**Effort:** 1-2 days. **Why:** every cover letter says "I shipped two production MCP servers" —
right now a screener who goes looking finds nothing. That asymmetry kills credibility exactly when
it's working.
- ✅ README.md now exists at repo root — review and adjust
- ✅ Public package split DONE — complete `synctropy-mcp` package lives in `public-package/synctropy-mcp/`:
  the pure intelligence (classifier, taxonomy, entropy, operations, summary) with Supabase
  persistence, premium config, and HTTP transport stripped out. Builds clean, 51 tests pass,
  MCP stdio handshake + analyze_structure smoke-tested. npm names `synctropy-mcp` and `synctropy`
  confirmed free.
- ⏳ YOUR MOVE: run `public-package/push-to-new-repo.sh` (needs `gh` CLI logged in) — creates the
  GitHub repo PRIVATE, pushes the package. Review it, then follow `PUBLISH.md` in the package to
  flip public + `npm publish`. (Repo creation from this session was blocked by GitHub App
  permissions, so this one step is yours.)
- Pin the repo on your GitHub profile; add a profile README with the pitch line.
- **Done when:** a stranger can go from your resume link to a running MCP server in Claude in
  under 5 minutes.

### 2. Record the 3-minute demo video
**Effort:** half a day (after #1). **Why:** FDE interviews *are* demo interviews. A crisp
recorded demo proves the core job skill before anyone talks to you, and it feeds LinkedIn
Featured + every application.
**Script (3 min):**
1. (0:00) "This is Synctropy — it makes any AI client able to organize your files intelligently.
   Watch." — start in Claude, connected to a messy Drive folder.
2. (0:30) Run the pipeline: scan → classify → propose structure → dry-run → user approves → moves
   execute. Narrate the architecture choice at each step: "classification rules are deterministic
   and server-side; judgment calls stay with the model; destructive operations gate on the human."
3. (2:15) 20-second architecture slide: MCP server / skills split, why it survives offline,
   why no file content ever touches the server.
4. (2:45) "Built solo: TypeScript, MCP SDK, Zod, Supabase, deployed on Railway. Repo in the
   description."
- **Done when:** unlisted video link is in the Featured section and resume header.

## P1 — Next 2-3 weeks

### 3. One real deployment case study (the single biggest resume upgrade available to you)
**Effort:** 2-3 weeks alongside the search. **Why:** "built two products" < "deployed with a real
customer and measured the outcome." This is the exact FDE motion — doing it once, for real,
converts you from builder to forward-deployed.
- Find ONE real user — a friend's company, a Tuck contact's startup, a local business drowning in
  Drive chaos, or an expanded BackBurn scope. Free is fine; a testimonial and metrics are the fee.
- Deploy Synctropy (or a scoped agent build) against their actual data. Keep a deployment log:
  what broke, what needed configuring, what the human refused to let the agent do.
- Measure something honest: files organized, hours saved/week, retrieval time before/after.
- Write it up (blog post or PDF one-pager) and add one resume bullet:
  "Deployed [system] with a live customer: [metric]."
- **Done when:** a named (or anonymized-but-real) case study with numbers exists.

### 4. Eval harness for Synctropy's classifier + short write-up
**Effort:** 2-4 days. **Why:** "how do you evaluate agent behavior?" is now the standard FDE
screen question, and most candidates hand-wave it. You have a perfect substrate: the taxonomy
classifier in `mcp-server/src/classifier.ts` already has deterministic rules and a vitest setup.
- Build a labeled test set (~200 file paths → expected domain/category), score the classifier,
  publish precision/recall per domain in the README.
- Add a regression gate: rule changes must not drop scores (wire into `npm test`).
- Write 500 words: "Evals for deterministic-vs-model classification in an agentic pipeline."
- **Done when:** eval numbers are in the README and you can speak to them fluently.

## P2 — Ongoing (1-2 hrs/day alongside applications)

### 5. Open-source contribution in the MCP ecosystem
Contribute to `modelcontextprotocol` repos (SDK issues, docs, example servers) or popular
community servers. Even 2-3 merged PRs = visible commits in the protocol Anthropic owns —
disproportionate signal for the Anthropic FDE application specifically.

### 6. Technical writing (2-4 posts)
Reuse what you already have:
- The Maven interview prep → genericized "agentic CX architecture teardown" (no interview specifics)
- "What shipping two production MCP servers taught me about where determinism belongs"
- The eval write-up from P1-4
- The case study from P1-3
Post on LinkedIn + a blog (donovantechnology.com). These compound: every post is an artifact
recruiters find when they search you.

### 7. Finish the end-to-end pipeline run (already on the repo roadmap)
Skill 00 → 09 with artifact persistence, so the live demo never stumbles. Doubles as the demo
backbone for #2 and the deployment vehicle for #3.

---

## What NOT to spend time on right now

- **New products.** A third half-public project adds nothing; depth on Synctropy beats breadth.
- **Certifications** (AWS SA etc.) — nice-to-have, but zero differentiation for AI-native startups
  and weeks of opportunity cost. Revisit only if pivoting to enterprise/cloud SA (Tier 2 fallback).
- **LeetCode grinding.** FDE loops test demos, architecture, and customer scenarios far more than
  algorithms. The interviewing.io / Exponent prep you're doing is right-sized; keep it to
  maintenance mode.
- **The Synctropy frontend.** Recruiters won't judge the dashboard; the MCP server and the demo
  carry the story.

## Resume bullets these projects unlock (add as each completes)

- "Published Synctropy's MCP server as an open-source package (`npx synctropy-mcp`); listed on the
  MCP registry" — after P0-1
- "Deployed with live customer data: [N] files organized, [X] hrs/week saved" — after P1-3
- "Built an eval harness for the classification engine: [P]% precision across [K] domains, wired
  into CI as a regression gate" — after P1-4
- "Contributor to the Model Context Protocol ecosystem ([repos])" — after P2-5
