# Resume Operating System — LinkedIn Layer + Gap Fixes + Mining Workflow

*Extension spec for the Resume OS (the 27-page export you shared: Projects P001–P035, Bullets
B001–B021, Tags, and the Primitives/Scenarios sheet). The architecture is right — projects as the
source of truth, bullets as generated views, RoleFit as the filter. Everything below builds on
that pattern instead of fighting it.*

---

## 1. Gaps in the current system (fix these first — 30 min of paste work)

### Gap A — RoleFit doesn't include the roles you're actually hunting
Current RoleFit vocabulary: `CTO, CPTO, Fractional`. Your active search is **SA / SE / FDE**.
Add three values — `SA` (solutions architect), `SE` (pre-sales/sales engineer), `FDE`
(forward-deployed) — and re-score all 21 bullets. Suggested scores for the heavy hitters:

| Bullet | Add RoleFit | Why |
|---|---|---|
| B008 ($15M RFP wins) | **SE, SA** | THE pre-sales bullet — leads every SE application |
| B007 ($990K milestones) | SA, FDE | Delivery-bridge proof |
| B011 (revenue control arch) | SA, FDE | Enterprise integration surface |
| B009 (83-app C4 map) | SA | Systems-thinking proof |
| B014 (hardware-agnostic API) | SA, FDE | Platform abstraction story |
| B013 (embedded Linux BLE, $1.5M) | FDE | Build-it-yourself-in-the-field proof |
| B015 (rapid prototypes for execs) | FDE, SE | The FDE motion, verbatim |
| B012 (conference talks) | SE | Stakeholder education |
| B003 (AI file assistant) | FDE, SA | Current-stack AI proof |
| B006 (customer discovery) | FDE, SE | Discovery-call skill |

### Gap B — the MCP era is missing from the Projects table
P001–P005 describe the *pre-pivot* stack (React/Flask/EC2 multi-cloud dashboard). Your strongest
current material doesn't exist in the DB. Paste-ready rows:

**P006 | Synctropy | Founder/CTO | MCP Server & Agentic Pipeline Architecture | 2025–Present | New Product / AI Platform**
- *Problem:* LLM platforms were commoditizing the UI layer; the dashboard product was becoming the wrong shape.
- *Role/Description:* Repositioned the product AI-native: designed an MCP server (TypeScript, `@modelcontextprotocol/sdk`, Zod, stdio + HTTP transports, deployed on Railway) providing deterministic classification/entropy intelligence to a 12-skill pipeline running in the AI client.
- *Business impact:* Product compatible with any MCP client; free tier runs fully offline; premium persistence via Supabase.
- *Technical impact:* Clean determinism/judgment boundary; guardrails (dry-run, protected-folder gates); metadata-only privacy architecture; 51-test vitest suite.
- *Tech:* TypeScript, Node.js, MCP SDK, Zod, Supabase, Railway, Vercel, vitest
- *RoleFit:* **FDE, SA, CTO**

**P007 | Synctropy | Founder/CTO | Open-Source synctropy-mcp Package | 2026 | OSS / Distribution**
- *Problem:* Claims of "shipped MCP servers" weren't verifiable by anyone; product had no distribution channel.
- *Role:* Extracted the pure intelligence engine into a public npm package (`npx synctropy-mcp`), MIT-licensed, installable in one command.
- *RoleFit:* FDE, SA · *Status:* publish pending (push-to-new-repo.sh)

**P008 | BackBurn | Fractional CTO | AI Coaching Platform Architecture | 2024–Present | Advisory / AI Platform**
- *Role:* MCP-based architecture integrating domain intelligence into AI agents; hypothesis-driven experiment framework tracing customer assumptions → capability requirements → implementation.
- *RoleFit:* Fractional, CTO, SA

**Candidate bullets from these (B022–B025):**
- B022: "Designed and shipped a production MCP server (TypeScript, stdio+HTTP transports, deployed on Railway) powering a 12-skill agentic pipeline — deterministic rules server-side, model judgment client-side, human approval gating all destructive operations." *(FDE, SA)*
- B023: "Open-sourced the classification engine as an installable npm package (npx synctropy-mcp) with a 51-test suite." *(FDE, SA — activate once published)*
- B024: "Repositioned a web-dashboard product into an AI-native MCP server after identifying LLM platforms commoditizing the UI layer, validated through structured discovery across 4+ industries." *(SE, FDE, CTO)*
- B025: "Designed agent guardrails: dry-run previews, protected-folder confirmation gates, and a metadata-only privacy boundary so file contents never reach the server." *(FDE, SA)*

### Gap C — the Primitives/Scenarios sheet is your interview goldmine, and it's nearly empty
The two visible stories (DelDOT ABS close; sales-overpromise/missed-milestones recovery; San Diego
MTS) are *exactly* what SE/FDE loops probe. Complete the schema:

`Story ID | Title | Situation | Leverage (what you uniquely brought) | Action | Outcome ($ or metric) | Project links | RoleFit | Interview questions it answers`

That last column is what makes it an operating system: tag each story with the questions it
answers ("tell me about a time you disagreed with sales," "walk me through a deal you saved,"
"describe a failed deployment"). Before any interview, filter by company type + likely questions
and rehearse the top 5. **Draft S001 (DelDOT) and S002 (overpromise recovery) this week while
memory is fresh — these decay.**

---

## 2. The LinkedIn layer (new sheets — same primitives, new views)

LinkedIn assets are *renders* of the same database, with character budgets and freshness dates.
Two new sheets:

### Sheet: `LI-Assets`
`Asset ID | Type | Positioning | Content | Source IDs | Char limit | Status | Last updated`

Types and their generation rules:
| Type | Generated from | Char budget | Rule |
|---|---|---|---|
| Headline | Top bullets by RoleFit | 220 | 1 role phrase + 1 proof + 1 outcome |
| About | PITCH.md 30-sec pitch | 2,600 | Rewrite when positioning changes, not more |
| Experience bullet | Bullets sheet, filtered by RoleFit | ~200 ea | Max 4 per role; strongest impact-type mix |
| Featured item | Artifacts column of Projects | — | Demo video, repo, patents, talks |
| Skill | Distinct TechTags + ProductTags | 50 max | Top 3 = search-weighted (see playbook) |
| Rec ask | Stakeholders column of Projects | — | Person + which story they can attest to |
| Post | One project's Problem→Outcome pair | 1,300 | Each project row = at least one post skeleton |

**Seed rows (paste-ready, sources reference your bullet IDs):**
- LI-001 | Headline | SA/SE/FDE | "Solutions Architect / Forward-Deployed Engineer \| Shipped 2 production MCP servers \| $15M+ enterprise deals closed alongside sales" | B022, B008 | live-candidate
- LI-002 | Headline | fCTO | "Fractional CTO for AI-native products \| MCP architecture, agent systems \| 10 yrs enterprise SA" | P006-P008 | alternate
- LI-003 | About | both | (text in LINKEDIN-PLAYBOOK.md §2) | PITCH.md | draft
- LI-004..07 | Experience bullets, Siemens | SA/SE/FDE | B008, B007, B011, B009 | ~200 ea
- LI-008..10 | Experience bullets, Donovan Tech | SA/SE/FDE | B022, B024, B025
- LI-011 | Featured | both | synctropy-mcp repo link | P007 | blocked-on-publish
- LI-012 | Featured | both | Demo video | PROJECT-ROADMAP P0-2 | blocked
- LI-013 | Featured | both | Patents US 10,375,573 / US 11,803,784 | P023 | ready
- LI-014..17 | Rec asks | — | Siemens AE (B008 story), Siemens eng lead (B007), BackBurn founder (P008), Bytemark colleague (B016) | ready — texts in LINKEDIN-PLAYBOOK.md §7

### Sheet: `LI-Posts` (the content pipeline)
`Post ID | Hook | Source project | Blog link | Target date | Status | Performance note`
Seed from BLOG-PLAN.md's 10 posts + GTM.md's 3 starters. Rule: no post without a source project
in the DB — keeps content honest and infinitely regenerable.

---

## 3. Mining workflow for old files (old jobs + old resumes)

**Access note:** the Drive connected to this session is the Synctropy *test* account
(dda.testemail@gmail.com — dummy fixtures only). To have me do the sifting: upload files directly
in chat (like you did the two PDFs), or share them into that test Drive. Otherwise run the
workflow yourself with any Claude session.

### What to mine, in priority order (highest bullet-yield first)
1. **Old resumes** (every version) — each bullet is a candidate Bullet row; diffs between versions
   reveal forgotten projects
2. **Performance reviews / promo packets** (Siemens, Bytemark, ASSA ABLOY) — the only documents
   where OTHER people quantified your impact; best source of numbers you've forgotten
3. **RFP responses + architecture docs you authored** — artifact links for Projects rows, and
   fodder for S-stories (each RFP = a deal story)
4. **Conference decks** (ITS CA 2021, APTATech 2020) — Featured items + a post each
5. **Patent filings** — exact claim language for the patent bullets
6. **Old emails praising outcomes** ("$990K milestone cleared") — receipts for numbers

### Extraction template (run per document)
> For this document, extract: (1) any project not already in the Projects table — fill Problem /
> Role / Business impact / Technical impact / Tech / Stakeholders / Artifacts; (2) any METRIC not
> already captured (dollars, percentages, counts, dates); (3) any candidate bullet ≤230 chars in
> "did X using Y achieving Z" form, tagged with RoleFit; (4) any story with conflict + resolution
> for the Primitives sheet. Output as rows matching my schema. Flag anything that contradicts an
> existing row rather than overwriting it.

### Processing rules
- Metrics beat adjectives: a document that yields one new number beats ten that yield phrasing
- Nothing enters Bullets without a Project parent; nothing enters a resume without leaving the DB
- Dedupe on paste: if a mined bullet ≈ an existing one, keep whichever has the harder number

---

## 4. Operating loop (how the OS earns its name)

1. **Weekly (Fri, with the GTM metrics review):** new work → new/updated Project rows → regenerate
   affected bullets and LI-Assets marked stale
2. **Per application:** filter Bullets by RoleFit + company type → assemble resume variant →
   log which bullets shipped (add a `Used in` column — over time you learn which bullets get
   interviews)
3. **Per interview:** filter Primitives by likely questions → rehearse top 5
4. **Per publish event** (npm package, blog post, case study): new Artifact → new Featured row →
   new Post row → unlock any blocked bullets (B023)
