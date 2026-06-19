# Organization Methodology Design
**Date:** 2026-06-03
**Tool:** `analyze_structure`
**Status:** Approved

## Context

Synctropy is an AI-native file organization intelligence layer. It never owns OAuth or file access — the AI client handles that. The MCP server's job is to receive a file tree from the client and return structured analysis: what's wrong, how files should be classified, and what operations would fix it.

This spec defines the core IP: the taxonomy, classification engine, entropy rubric, and full input/output contract for the `analyze_structure` tool. This is the first tool to implement and the foundation everything else builds on.

**Target persona:** Solo operator / freelancer — one person managing client work, personal finance, side projects, and admin across many domains.

---

## 1. Taxonomy

Files are classified on two axes: **content domain** (what the file *is*) and **lifecycle stage** (what the file *needs right now*).

### Axis 1 — Content Domain

| Domain | Examples |
|---|---|
| `finance` | invoices, receipts, contracts, tax docs, bank statements |
| `projects` | proposals, briefs, deliverables, meeting notes |
| `reference` | articles, PDFs, research, how-tos |
| `admin` | legal, insurance, licenses, account credentials |
| `media` | photos, videos, audio, design assets |
| `comms` | email exports, chat logs, contact lists |
| `inbox` | unsorted drops, downloads, ambiguous files |

### Axis 2 — Lifecycle Stage

| Stage | Meaning |
|---|---|
| `active` | In-use, being worked on or referenced regularly |
| `archive` | Completed or old, kept for record |
| `triage` | Low-confidence classification, needs human review |

### Canonical Target Structure

```
~/
  Active/
    Projects/       [projects × active]
    Finance/        [finance × active]
    Admin/          [admin × active]
  Reference/        [reference × active or archive]
  Archive/
    Projects/       [projects × archive]
    Finance/        [finance × archive]
  Media/            [media × active or archive]
  Inbox/            [inbox × triage]
```

---

## 2. Input Schema

`analyze_structure` accepts a `FileTree` built by the AI client from whatever storage it has access to (Google Drive, local FS, Dropbox, etc.).

```typescript
const FileNode = z.object({
  name: z.string(),
  path: z.string(),                      // full path from root
  type: z.enum(["file", "folder"]),
  mimeType: z.string().optional(),       // e.g. "application/pdf"
  size: z.number().optional(),           // bytes
  modifiedAt: z.string().optional(),     // ISO 8601
  children: z.array(z.lazy(() => FileNode)).optional(), // folders only
})

const AnalyzeStructureInput = z.object({
  root: FileNode,
  userPreferences: z.object({
    archiveAfterDays: z.number().default(365),
    ignorePaths: z.array(z.string()).default([]),
  }).optional(),
})
```

**Key decisions:**
- `mimeType` + `name` + `path` are the primary classification signals
- `modifiedAt` drives temporal entropy scoring
- `userPreferences` allows per-user tuning stored in Supabase and passed in by the client
- All fields except `name`, `path`, and `type` are optional — classifier degrades gracefully

---

## 3. Classification Engine

The classifier walks the tree depth-first and scores each file against four signal categories. Signals vote for a `(domain, lifecycle)` pair; votes are weighted and the top candidate wins unless confidence < 0.6, in which case the file goes to `triage`.

### Signal Weights (highest to lowest)
1. Name pattern (regex match on filename)
2. Path context (parent folder name, siblings)
3. Extension / MIME type
4. Temporal (modifiedAt age)

### Signal Details

**Extension signal** — maps MIME type / extension to a domain shortlist:
```
.pdf           → [finance, reference, admin, projects]
.xlsx / .csv   → [finance, projects]
.jpg/.png/.mp4 → [media]
.docx          → [projects, reference, admin]
```

**Name pattern signal** — regex matched against filename:
```
invoice|receipt|statement  → finance
contract|agreement|sow|proposal → projects (or admin)
resume|cv                  → admin
IMG_|DSC_|screenshot       → media
readme|notes|meeting       → reference
```

**Path context signal** — parent folder name and siblings:
```
parent contains "Client"   → projects boost
parent contains "Tax"      → finance boost
depth > 4                  → scatter entropy penalty
```

**Temporal signal** — `modifiedAt` relative to current date:
```
< 90 days     → active
90–365 days   → active (fading)
> 365 days    → archive candidate
> 3 years     → strong archive signal
```

### Confidence & Triage

Confidence = weighted vote share for the top `(domain, lifecycle)` candidate (0–1).

- Confidence ≥ 0.6 → classify and emit `suggestedPath`
- Confidence < 0.6 → send to `triage` with top 2–3 candidates and reason string

---

## 4. Entropy Rubric

Entropy is scored at the **folder level** (0–100, higher = more chaotic), composed of three sub-scores.

### Scatter Score (0–33)
| Signal | Points |
|---|---|
| Files stranded at root with no folder | +10 per file (cap 33) |
| Average folder depth > 5 | +5 per level over threshold |
| Single folder containing > 50 files | +15 |

### Naming Chaos Score (0–33)
| Signal | Points |
|---|---|
| Version suffixes (`_v2`, `_FINAL`, `_copy`, `(1)`) | +5 per file |
| Inconsistent casing within same folder | +8 |
| Date-prefixed filenames outside archive context | +3 per file |
| Duplicate basenames (same name, different suffix/ext) | +6 per pair |

### Temporal Decay Score (0–34)
| Signal | Points |
|---|---|
| Archive candidates (>1yr old) mixed with active files | +10 |
| Files > 3 years old outside an Archive folder | +8 per cluster |
| No file touched in > 6 months at root level | +16 |

### Severity Thresholds
| Score | Severity |
|---|---|
| 0–30 | `healthy` |
| 31–60 | `needs_attention` |
| 61–100 | `critical` |

---

## 5. Output Schema

```typescript
const AnalyzeStructureOutput = z.object({

  // Folder-level health scores
  entropyMap: z.array(z.object({
    path: z.string(),
    score: z.number(),
    severity: z.enum(["healthy", "needs_attention", "critical"]),
    signals: z.array(z.string()), // human-readable reasons
  })),

  // Per-file classifications
  classifications: z.array(z.object({
    path: z.string(),
    domain: z.enum(["finance","projects","reference","admin","media","comms","inbox"]),
    lifecycle: z.enum(["active","archive","triage"]),
    confidence: z.number(),
    suggestedPath: z.string(),
  })),

  // Low-confidence files needing human review
  triage: z.array(z.object({
    path: z.string(),
    topCandidates: z.array(z.object({
      domain: z.string(),
      lifecycle: z.string(),
      confidence: z.number(),
    })),
    reason: z.string(),
  })),

  // Concrete operations for the AI client to execute
  operations: z.array(z.object({
    type: z.enum(["move", "rename", "create_folder"]),
    from: z.string(),
    to: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })),

  // Human-readable summary for the AI client to present to the user
  summary: z.string(),
})
```

---

## 6. Architecture

```
analyze_structure (MCP tool)
  │
  ├── parseTree(input)        → normalized FileNode[]
  ├── classifyFiles(nodes)    → Classification[]  (+ triage[])
  │     ├── scoreExtension()
  │     ├── scoreNamePattern()
  │     ├── scorePathContext()
  │     └── scoreTemporal()
  ├── scoreEntropy(nodes)     → EntropyMap[]
  │     ├── scatterScore()
  │     ├── namingChaosScore()
  │     └── temporalDecayScore()
  ├── buildOperations(classifications, entropyMap) → Operation[]
  └── buildSummary(entropyMap, triage)             → string
```

Each module is a pure function with no side effects. All input/output types validated with Zod. The classifier and entropy scorer are independently testable.

---

## 7. Verification

To verify end-to-end:

1. **Unit tests** — Feed synthetic `FileNode` trees to `classifyFiles()` and `scoreEntropy()` directly. Assert expected domain/lifecycle pairs and entropy scores for known inputs.
2. **Integration test** — Call the MCP tool via the SDK with a realistic file tree (20–50 files, mix of domains, intentional chaos). Assert `operations` is non-empty, `triage` contains the deliberately ambiguous files, entropy > 60 for the chaotic folder.
3. **Golden path** — A clean, well-organized tree should return entropy 0–30 for all folders, empty triage, and no operations.
4. **Degraded input** — A tree with only `name` and `path` (no mimeType, no modifiedAt) should still return a valid response (lower confidence scores, more triage items, no temporal signals).
