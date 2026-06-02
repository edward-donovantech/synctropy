# Synctropy

## What this is
MCP server providing AI-native file organization intelligence.
Intelligence layer only - never owns OAuth or file access.

## Architecture
- /mcp-server - Node.js MCP server
- /frontend - React landing page + dashboard
- /supabase - Schema, migrations, typed client
- /shared - TypeScript types

## Key decisions
- MCP server returns structured prompts, not raw data
- AI client handles all storage OAuth
- Supabase is single source of truth for user preferences
- No file access ever stored server-side in v1

## Current Sprint
Building the organization methodology (core IP).
Entry point: /mcp-server/index.js
Primary tool: analyze_structure
Next task: define taxonomy, classification tree, entropy rubric

## Coding conventions
- TypeScript everywhere
- Zod for all validation
- Named exports only
- No default exports except React components
