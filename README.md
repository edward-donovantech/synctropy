# Synctropy

**AI-native file intelligence**, built as a production case study in exactly the thing this role hires
for: an agentic system that takes over a repetitive, judgment-heavy operational workflow — end to end,
with governance built in instead of bolted on.

Synctropy gives any MCP-compatible AI client (Claude, or anything else that speaks the protocol) the
ability to scan, classify, and reorganize files on a real storage platform (Google Drive, local disk,
and more) without a human doing the tedious part. The architecture is deliberately **agent pipeline +
deterministic service**, not "one big prompt" — because that split is what makes an AI-run workflow
safe enough to hand to a non-technical user and trust it to not destroy their data.

## Why this repo, for this role

This is not a demo. It's a working answer to the problems an AI Operator Lead is actually hired to solve:

| PTC JD requirement | Where it shows up here |
|---|---|
| Design agent architectures — skills, tools, memory, orchestration, guardrails | 12-skill pipeline (`00`–`11`) with explicit handoff artifacts between every stage — see [Skill architecture](#skill-architecture-the-orchestration-layer) |
| Build MCPs, APIs, connectors | The MCP server itself (`/mcp-server`) — stdio + HTTP transports, Zod-validated tool contracts |
| AI quality, governance, observability, audit trails | Mandatory dry-run gate before any write, copy-not-move execution, post-execution verification pass, full move-log audit trail — see [Governance & safety](#governance--safety-gates-built-not-bolted-on) |
| Evaluation methodology | Confidence scoring on every classification decision, vitest suite covering classifier/entropy/operations logic |
| Enterprise integrations, data quality/reliability | Supabase-backed persistence layer, premium/free tiering, typed schemas end to end (Zod) |
| Train/enable users, drive adoption | User approval checkpoints are a first-class part of the pipeline design, not an afterthought — the system explains itself at every gate |

The skills live outside this repo (in the AI client's skill directory) by design — the same separation
of concerns the JD asks for between **orchestration platform** (n8n/Zapier/Claude Code-equivalent) and
**the service that holds the actual rules and data** (this repo's MCP server + Supabase).

## Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  AI client (Claude, etc.)   │  MCP   │  Synctropy MCP server        │
│  ┌───────────────────────┐  │◄──────►│  (Node.js/TS, stdio + HTTP)  │
│  │ 12-skill pipeline     │  │        │  • taxonomy & classification │
│  │ 00 discover … 11 done │  │        │  • entropy scoring           │
│  │ scan, classify, plan, │  │        │  • scan history persistence  │
│  │ confirm, execute      │  │        │  • pipeline artifacts        │
│  └───────────────────────┘  │        │  • user config / premium     │
│  Storage OAuth stays here   │        └──────────────┬───────────────┘
└─────────────────────────────┘                       │
                                             ┌────────▼────────┐
                                             │    Supabase     │
                                             │ (metadata only) │
                                             └─────────────────┘
```

**The core design decision:** deterministic rules (taxonomy domains, classification weights, scoring)
live server-side so they're versioned and consistent across every AI client that connects. Judgment
calls ("is this finance or admin?"), user interaction (protected-folder confirmation, structure
approval), and execution stay with the model and the human — that's where ambiguity has to be resolved
by something that can reason and ask, not a static ruleset. The pipeline degrades gracefully when the
server is unreachable: skills run fully offline; MCP adds persistence and config when connected.

**Privacy boundary:** the AI client handles all storage OAuth. The server never sees file content —
only metadata, scores, and artifact JSON. No customer file data ever touches the backend.

## Skill architecture (the orchestration layer)

Twelve skills, each a single responsibility, chained by typed handoff artifacts (`extends_*` fields) so
any skill can be re-run, inspected, or swapped independently:

```
00 scan-connectors   → detect platforms available this session
01 scan-surface      → one-level scan of the root
02 scan-deep         → recursive scan, PROTECTED-FOLDER GATE before any recursion
03 read-unknowns     → summarize unreadable/ambiguous files (parallel subagents)
04 build-inventory   → merge + detect issues (duplicates, vague names, clutter)
05 propose-structure → ask the user for an organizing principle, propose folders — APPROVAL GATE
06 plan-moves        → map every file to a destination + resolve naming collisions
07 dry-run           → simulate the entire execution with zero writes — MANDATORY GATE
08 execute           → copy (never move/delete) into a staging folder
09 verify            → spot-check every copy against the plan
10 revert            → undo instructions if the user changes their mind
11 maintain          → detect drift/adoption, loop back to 01
```

Three things about this that matter for an agent-ops role specifically:

- **Subagent parallelization at scale** — skills 02 and 03 fan out batches of files to isolated
  subagents so context stays bounded regardless of how large the drive is.
- **Gates are enforced, not suggested** — skill 07 literally will not let skill 08 run if its own
  report says `has_blockers`. The pipeline can't be talked past its own safety check.
- **Nothing destructive, ever** — there is no delete/move tool in the loop. Every write is additive
  (`copy_file` into a `Suggested/` staging folder). Reversibility was a design constraint from the
  start, not a recovery plan.

## Governance & safety gates (built, not bolted on)

The pattern the JD calls "validation frameworks," "quality controls," and "audit-trail frameworks" is
the backbone of this pipeline, not an add-on:

- **Dry-run before write** — skill 07 simulates the full move plan (folder creation order, name
  collisions, file-existence checks) with zero side effects, and produces a `status` of
  `ready` / `has_warnings` / `has_blockers` that downstream skills are required to respect.
- **Confidence-scored classification** — every file gets a domain classification with a numeric
  confidence (`mcp-server/src/classifier.ts`), so low-confidence calls can be surfaced to a human
  instead of silently applied.
- **Full audit trail** — `move-log.json` records old-ID → new-ID mappings and per-item success/failure
  for every write the system makes; `verify-report.json` independently re-checks every one of them
  against live state afterward.
- **User approval checkpoints at the two moments that matter** — before any folder structure is
  decided (skill 05) and before any write happens (skill 08). Everything upstream and downstream of
  those two gates is fully automated.

## Repository layout

| Path | What it is |
|---|---|
| `/mcp-server` | The MCP server — TypeScript, `@modelcontextprotocol/sdk`, Zod validation, stdio + HTTP transports. Deployed on Railway. Vitest suite covers classification, entropy scoring, operations planning, and HTTP integration. |
| `/frontend` | React dashboard surfacing scan history and storage metrics from pipeline artifacts. Deployed on Vercel. |
| `/supabase` | Schema and migrations — source of truth for scan history, pipeline artifacts, and user config. |
| `/synctropy-mcp` | Public, stripped-down MCP server package — the offline-capable subset anyone can run without the private backend. |
| `/shared` | Reserved for cross-package TypeScript types. |

The 12-skill pipeline (skills 00–11) lives in the AI client's skill directory, not in this repo — the
same separation the JD describes between an orchestration layer and the systems it calls into.

## MCP tools

- `analyze_structure` — entropy scoring, classification, proposed operations, human-readable summary
- `get_user_config` — plan tier and storage mode for a user (controls where artifacts persist)
- `save_pipeline_artifact` — persists a skill's full JSON output for history, analytics, and the dashboard

## Running the server

```bash
cd mcp-server
npm install
npm run build
npm start          # stdio transport (for local MCP clients)
npm run start:http # HTTP transport (API key via query param; JWT for programmatic use)
npm test           # vitest suite — classifier, entropy, operations, integration
```

## Status

Active development. Current focus: end-to-end pipeline runs with full artifact persistence, and a
dashboard redesign around raw storage metrics (files/folders/issues) instead of abstract scores.

---

Built by [Edward Donovan](https://www.linkedin.com/in/edwardjdonovan) / Donovan Technology LLC.
