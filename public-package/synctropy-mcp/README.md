# synctropy-mcp

**AI-native file intelligence as an MCP server.** Give any MCP-compatible AI client — Claude
Desktop, Claude Code, or anything else that speaks the [Model Context Protocol](https://modelcontextprotocol.io) —
the ability to analyze how disorganized a file tree is, classify every file into a canonical
taxonomy, and produce a prioritized reorganization plan.

**Fully offline.** No API keys, no accounts, no telemetry. File *metadata* goes in, analysis comes
out — file contents are never read and nothing leaves your machine.

## Quickstart (60 seconds)

**Claude Code:**

```bash
claude mcp add synctropy -- npx -y synctropy-mcp
```

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "synctropy": {
      "command": "npx",
      "args": ["-y", "synctropy-mcp"]
    }
  }
}
```

Then ask Claude something like:

> "List my Downloads folder recursively, build a file tree, and run it through
> `analyze_structure`. Show me the worst folders and the proposed moves."

## What it does

One tool: **`analyze_structure`**. Input is a file tree (names, paths, timestamps — no contents);
output is four things:

1. **Entropy map** — a 0-100 disorder score per folder, from three weighted components:
   *scatter* (loose files, mega-folders, excessive depth), *naming chaos* (version-suffix litter
   like `_v2_FINAL`, casing inconsistency, near-duplicate basenames), and *temporal decay*
   (stale files mixed with active ones, 3-year-old files outside any archive). Each score comes
   with human-readable signals: `"7 file(s) with version suffixes"`.

2. **Classifications** — every file mapped to a domain (`finance`, `projects`, `admin`,
   `reference`, `media`, `comms`, `inbox`) and lifecycle (`active`, `archive`), each with a
   confidence score and a suggested canonical path like `Active/Finance/invoice_acme_jan.pdf`.

3. **Triage list** — files the rules *can't* confidently classify, with the top candidate domains
   and an explanation. These are deliberately punted to the AI client and the human.

4. **Operations plan** — concrete `create_folder` / `move` operations, prioritized so the worst
   folders get fixed first.

## Design: determinism where it belongs

This server is the deterministic half of a human-in-the-loop agentic system:

```
AI client (judgment)                    synctropy-mcp (rules)
──────────────────────                  ─────────────────────────
reads file listings          ──tree──►  extension/name/path scoring
resolves triage items        ◄─plan───  pairwise-margin confidence
asks the human before moves             entropy scoring, ops planning
executes approved moves                 (pure functions, all tested)
```

- **Rules are versioned code, not vibes.** Domain taxonomies, scoring weights, and canonical
  paths live server-side so every client classifies identically.
- **Confidence is a margin, not a vote count.** A file's domain confidence is
  `top / (top + second-best)` — measuring how decisively the winner beat its nearest competitor,
  so many weak signals in unrelated domains don't dilute a clear match. Below 0.6, the file goes
  to triage instead of being guessed at.
- **The model handles ambiguity; the human handles risk.** The server never executes anything.
  It proposes; the AI client reasons about triage cases; destructive actions gate on the person.

## Example

<details>
<summary>Input tree (abridged)</summary>

```json
{
  "root": {
    "name": "root", "path": "/", "type": "folder",
    "children": [
      { "name": "invoice_acme_jan.pdf", "path": "/invoice_acme_jan.pdf", "type": "file",
        "modifiedAt": "2026-06-20T00:00:00Z" },
      { "name": "proposal_v2_FINAL.docx", "path": "/proposal_v2_FINAL.docx", "type": "file" },
      { "name": "tax_return_2020.pdf", "path": "/tax_return_2020.pdf", "type": "file",
        "modifiedAt": "2022-04-01T00:00:00Z" }
    ]
  }
}
```
</details>

<details>
<summary>Output (abridged)</summary>

```json
{
  "entropyMap": [{ "path": "/", "score": 61, "severity": "critical",
    "signals": ["3 file(s) stored directly in folder without subfolders",
                 "1 file(s) with version suffixes",
                 "1 file(s) older than 3 years outside Archive"] }],
  "classifications": [
    { "path": "/invoice_acme_jan.pdf", "domain": "finance", "lifecycle": "active",
      "confidence": 0.83, "suggestedPath": "Active/Finance/invoice_acme_jan.pdf" },
    { "path": "/tax_return_2020.pdf", "domain": "finance", "lifecycle": "archive",
      "confidence": 0.87, "suggestedPath": "Archive/Finance/tax_return_2020.pdf" }
  ],
  "operations": [
    { "type": "create_folder", "from": "", "to": "Active/Finance", "priority": "high" },
    { "type": "move", "from": "/invoice_acme_jan.pdf",
      "to": "Active/Finance/invoice_acme_jan.pdf", "priority": "high" }
  ],
  "summary": "Analysed 3 file(s) across 1 folder(s). 1 folder(s) are critically disorganised: /. ..."
}
```
</details>

## Development

```bash
npm install
npm run build   # tsc → dist/
npm test        # vitest — classifier, entropy, operations, integration suites
npm start       # stdio transport
```

Stack: TypeScript, [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk),
Zod for all input validation. Named exports, pure functions, no I/O outside the transport.

## About

Extracted from [Synctropy](https://github.com/edward-donovantech/synctropy), an AI-native file
organization system, where this engine powers a 12-skill agentic pipeline with persistence and
cross-platform storage execution.

Built by [Edward Donovan](https://www.linkedin.com/in/edwardjdonovan) — solutions architect and
founder, Donovan Technology LLC. MIT licensed.
