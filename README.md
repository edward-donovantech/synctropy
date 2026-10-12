# Synctropy

**AI-native file intelligence.** Synctropy gives any MCP-compatible AI client (Claude, or anything
else that speaks the protocol) the ability to scan, classify, and reorganize files on a real storage
platform — Google Drive, local disk, and more — without a human doing the tedious part.

Instead of another dashboard, Synctropy ships as an **MCP server plus a 12-skill agentic pipeline**:
the AI client does the reading, judgment, and user interaction; the server provides deterministic
intelligence, persistence, and configuration. That split — agent pipeline on one side, deterministic
service on the other — is what makes an AI-run workflow safe enough to hand to a non-technical user
and trust it not to destroy their data.

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
only metadata, scores, and artifact JSON.

## Skill pipeline

Twelve skills, each a single responsibility, chained by typed handoff artifacts (`extends_*` fields) so
any skill can be re-run, inspected, or swapped independently:

```
00 scan-connectors   → detect platforms available this session
01 scan-surface      → one-level scan of the root
02 scan-deep         → recursive scan, protected-folder gate before any recursion
03 read-unknowns     → summarize unreadable/ambiguous files (parallel subagents)
04 build-inventory   → merge + detect issues (duplicates, vague names, clutter)
05 propose-structure → ask the user for an organizing principle, propose folders — approval gate
06 plan-moves        → map every file to a destination + resolve naming collisions
07 dry-run           → simulate the entire execution with zero writes — mandatory gate
08 execute           → copy (never move/delete) into a staging folder
09 verify            → spot-check every copy against the plan
10 revert            → undo instructions if the user changes their mind
11 maintain          → detect drift/adoption, loop back to 01
```

A few things worth calling out about how it's built:

- **Subagent parallelization** — skills 02 and 03 fan out batches of files to isolated subagents so
  context stays bounded regardless of how large the drive is.
- **Gates are enforced, not suggested** — skill 07 will not let skill 08 run if its own report says
  `has_blockers`. The pipeline can't be talked past its own safety check.
- **Nothing destructive, ever** — there is no delete/move tool in the loop. Every write is additive
  (`copy_file` into a `Suggested/` staging folder). Reversibility was a design constraint from the
  start, not a recovery plan.

## Safety & audit trail

- **Dry-run before write** — skill 07 simulates the full move plan (folder creation order, name
  collisions, file-existence checks) with zero side effects, and produces a `status` of
  `ready` / `has_warnings` / `has_blockers` that downstream skills are required to respect.
- **Confidence-scored classification** — every file gets a domain classification with a numeric
  confidence (`mcp-server/src/classifier.ts`), so low-confidence calls can be surfaced to a human
  instead of silently applied.
- **Full audit trail** — `move-log.json` records old-ID → new-ID mappings and per-item success/failure
  for every write the system makes; `verify-report.json` independently re-checks every one of them
  against live state afterward.
- **User approval at the two moments that matter** — before any folder structure is decided (skill 05)
  and before any write happens (skill 08). Everything upstream and downstream of those two gates is
  fully automated.

## Repository layout

| Path | What it is |
|---|---|
| `/mcp-server` | The MCP server — TypeScript, `@modelcontextprotocol/sdk`, Zod validation, stdio + HTTP transports. Deployed on Railway. Vitest suite covers classification, entropy scoring, operations planning, and HTTP integration. |
| `/frontend` | React dashboard surfacing scan history and storage metrics from pipeline artifacts. Deployed on Vercel. |
| `/supabase` | Schema and migrations — source of truth for scan history, pipeline artifacts, and user config. |
| `/synctropy-mcp` | Public, stripped-down MCP server package — the offline-capable subset anyone can run without the private backend. |
| `/shared` | Reserved for cross-package TypeScript types. |

The 12-skill pipeline (skills 00–11) lives in the AI client's skill directory, not in this repo.

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
