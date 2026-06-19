# Drive Seeder Design
**Date:** 2026-06-19
**Status:** Approved

## Context

Synctropy's `analyze_structure` tool needs a realistic, repeatable test fixture in Google Drive. This script creates a messy Drive folder — `synctropy-test` — that exercises all classifier signals (name patterns, path context, MIME type, temporal decay) and all entropy rubric components (scatter, naming chaos, temporal decay). It is idempotent: each run wipes and recreates the folder from a version-controlled template.

**Target persona:** Solo operator / freelancer — the same persona defined in the organization methodology spec.

---

## File Layout

```
scripts/
  seed_drive/
    seed.py              # entry point — auth, wipe, create, report
    template.json        # chaos template (120 file definitions)
    templates/
      blank.pdf          # blank single-page PDF
      blank.docx         # blank Word doc
      blank.xlsx         # blank spreadsheet
      blank.csv          # header-only CSV
      blank.jpg          # small placeholder image
      blank.txt          # empty text file
    requirements.txt     # google-api-python-client, google-auth-oauthlib
    README.md            # GCP setup instructions
    credentials.json     # OAuth client secret (gitignored)
    token.json           # cached OAuth token (gitignored)
```

---

## Chaos Template

`template.json` defines the root folder name and a flat list of file entries. Each entry specifies:

```json
{
  "root": "synctropy-test",
  "files": [
    {
      "name": "invoice_acme_jan2025.pdf",
      "template": "blank.pdf",
      "folder": "Downloads",
      "age_days": 15
    }
  ]
}
```

| Field | Description |
|---|---|
| `name` | Filename in Drive (drives name-pattern classifier signal) |
| `template` | Which local template file to upload (drives MIME type signal) |
| `folder` | Subfolder path within `synctropy-test` (drives path-context signal) |
| `age_days` | How old the file appears — sets `modifiedTime` to `now - age_days` |

### Coverage targets (120 files across ~15 folders)

**Domains covered:**
- `finance` — invoices, receipts, tax docs, bank statements, budgets
- `projects` — proposals, briefs, SOWs, meeting notes, deliverables
- `admin` — resume, insurance, licenses, contracts
- `reference` — how-tos, articles, notes, README files
- `media` — photos (JPEGs), screenshots
- `comms` — email exports (txt)
- `inbox` — triage bait with no classifiable signals

**Chaos signals baked in:**

| Signal | How it's achieved |
|---|---|
| Scatter | 15+ files in `Downloads` and `Misc` with no sub-organisation |
| Version suffixes | `proposal_v1.docx`, `proposal_v2_FINAL.docx`, `report_copy.docx` |
| Duplicate basenames | `contract.pdf` and `contract (1).pdf` in same folder |
| Mixed casing | `Invoice_March.pdf` alongside `meeting notes.docx` in same folder |
| Temporal decay | 1–4 year old files mixed with recent files in active folders |
| Triage bait | ~10 files: `zzz_thing.bin`, `notes2.txt`, `untitled.docx`, `data.csv` |
| Clean control | One well-organised `Active/Finance` subfolder for healthy entropy baseline |

**Folder structure (intentionally messy):**
```
synctropy-test/
  Downloads/           # scatter dump — mixed types, ages, no organisation
  Desktop stuff/       # version chaos — v1/v2/FINAL duplicates
  Misc/                # temporal decay — old files mixed with new
  Old Stuff/           # archive candidates — 2–4 years old
  Client Work/         # projects domain — moderate organisation
  2023/                # date-named folder — classification signal
  Temp/                # triage bait — ambiguous filenames
  Active/
    Finance/           # clean control — well-named, recent, correct location
```

---

## Script Flow

### 1. Auth
- OAuth2 Desktop App flow — opens browser on first run for Google consent
- Scope: `https://www.googleapis.com/auth/drive`
- Token cached to `token.json` after first login — subsequent runs skip the browser

### 2. Wipe
- Searches Drive for `synctropy-test` folder
- Moves to trash (non-destructive — recoverable from Drive Trash for 30 days)
- Prompts for confirmation unless `--yes` flag is passed

### 3. Create
- Reads `template.json`
- Creates all Drive folders first (building an ID map for parent references)
- Uploads each template file with:
  - `name` overridden to the template entry value
  - `modifiedTime` set to `now - age_days * 86400s`
  - `parents` set to the correct folder ID
- Runs with `ThreadPoolExecutor(max_workers=10)` — 120 files in ~30s

### 4. Report
```
synctropy-test created: 15 folders, 120 files
Root: https://drive.google.com/drive/folders/<id>
```

---

## Dependencies

```
google-api-python-client>=2.0
google-auth-oauthlib>=1.0
google-auth-httplib2>=0.1
```

No file-generation libraries needed — template files are committed to the repo.

---

## GCP Setup (documented in README.md)

1. Create a project in GCP Console
2. Enable the Google Drive API
3. Create an OAuth 2.0 credential (Desktop App type)
4. Download `credentials.json` and place in `scripts/seed_drive/`
5. Run `python seed.py` — browser opens for consent on first run

---

## Verification

- Running `python seed.py` twice produces identical Drive structure (idempotent)
- All 7 domains represented in classified output when MCP tool is run against the result
- Root folder entropy score is `critical` (> 60)
- `Active/Finance` entropy score is `healthy` (≤ 30)
- ~10 triage items from the ambiguous files
