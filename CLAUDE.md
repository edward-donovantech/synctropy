# Synctropy

## What this is
AI-native file organization system. A 12-skill pipeline (00–11) runs in the AI client
and organizes files on connected platforms (Google Drive, local, etc.). The MCP server
provides deterministic intelligence, persistence, and user config — skills handle
execution, user interaction, and judgment calls.

## Architecture
- /mcp-server - Node.js MCP server (stdio + HTTP transports). Deployed to Railway.
- /frontend - React dashboard (scan history, preferences). Deployed to Vercel.
- /supabase - Schema, migrations. Single source of truth for user data.
- /shared - TypeScript types (currently empty, reserved for cross-package types)
- ~/.claude/skills/00-11 - The 12-skill pipeline (lives outside this repo)

## Skills vs MCP server split

**MCP server owns:**
- Deterministic rules: taxonomy domains, entropy weights, classification rules
- Persistence: scan history (`entropy_scans`), pipeline artifacts (`pipeline_artifacts`)
- User config: preferences, `is_premium`, `storage_mode`
- Cross-run analytics (future)

**Skills own:**
- File scanning, reading, categorization (needs Drive MCP tools)
- Model judgment calls (is this finance or admin? should this be archived?)
- User interaction mid-flow (protected folder confirmation, structure approval)
- Execution: move planning, dry-run, Drive writes

Skills degrade gracefully when MCP is disconnected. When connected, MCP is the
source of truth for rules and the record of what happened.

## Key decisions
- AI client handles all storage OAuth — MCP server never touches file content
- No file data stored server-side; only metadata, scores, and artifact JSONs
- Skills can run fully offline; MCP adds persistence and config
- Taxonomy/entropy rules live in MCP so they're versioned and consistent across clients
- Premium users write pipeline artifacts to Supabase; free users write to Drive only
- HTTP transport uses API key (query param) for connector UI; JWT for programmatic use

## MCP tools
- `analyze_structure` — entropy scoring, classification, operations, summary
- `get_user_config` — returns is_premium + storage_mode for a userId
- `save_pipeline_artifact` — persists a skill's full JSON output to pipeline_artifacts

## Current focus
- Define taxonomy, classification tree, and entropy rubric (core IP, in /mcp-server/src/)
- Deploy frontend dashboard to Vercel
- End-to-end pipeline run: skill 00 → 09 with artifact persistence

## Coding conventions
- TypeScript everywhere
- Zod for all validation
- Named exports only
- No default exports except React components
