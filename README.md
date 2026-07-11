# Synctropy

**AI-native file intelligence.** Synctropy makes any MCP-compatible AI client — Claude, or anything
else that speaks the protocol — able to intelligently organize files on connected storage platforms
(Google Drive, local, and more).

Instead of another dashboard, Synctropy ships as an **MCP server plus a 12-skill agentic pipeline**:
the AI client does the reading, judgment, and user interaction; the server provides deterministic
intelligence, persistence, and configuration.

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

**The core design decision:** deterministic rules (taxonomy domains, classification rules, scoring
weights) live server-side so they're versioned and consistent across clients. Judgment calls
("is this finance or admin?"), user interaction (protected-folder confirmations, structure
approval), and execution stay with the model and the human. The pipeline degrades gracefully when
the server is unreachable — skills run fully offline; MCP adds persistence and config when
connected.

**Privacy boundary:** the AI client handles all storage OAuth. The server never sees file
content — only metadata, scores, and artifact JSONs.

## Repository layout

| Path | What it is |
|---|---|
| `/mcp-server` | The MCP server — TypeScript, `@modelcontextprotocol/sdk`, Zod validation, stdio + HTTP transports. Deployed on Railway. |
| `/frontend` | React dashboard (scan history, preferences). Deployed on Vercel. |
| `/supabase` | Schema and migrations — the source of truth for user data. |
| `/shared` | Reserved for cross-package TypeScript types. |

The 12-skill pipeline (skills 00–11) lives in the AI client's skill directory, not in this repo.

## MCP tools

- `analyze_structure` — entropy scoring, classification, proposed operations, summary
- `get_user_config` — plan tier and storage mode for a user
- `save_pipeline_artifact` — persists a skill's full JSON output for history and analytics

## Running the server

```bash
cd mcp-server
npm install
npm run build
npm start          # stdio transport (for local MCP clients)
npm run start:http # HTTP transport (API key via query param; JWT for programmatic use)
npm test           # vitest suite
```

## Status

Active development. Current focus: end-to-end pipeline runs with artifact persistence, and the
dashboard's storage-metrics redesign.

---

Built by [Edward Donovan](https://www.linkedin.com/in/edwardjdonovan) / Donovan Technology LLC.
