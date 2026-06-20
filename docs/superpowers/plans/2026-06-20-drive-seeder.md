# Drive Seeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python script that idempotently seeds a messy Google Drive folder (`synctropy-test`) with 120+ realistic dummy files, covering all 7 classifier domains and all entropy chaos signals, for use as a repeatable test fixture for the Synctropy MCP pipeline.

**Architecture:** OAuth2 Desktop App flow caches a token after first run. On each run: trash the previous `synctropy-test` folder, then recreate it from `template.json` using concurrent Drive API uploads (10 workers). Template files are committed blank assets; `template.json` drives names, folder placement, and `modifiedTime`.

**Tech Stack:** Python 3.10+, `google-api-python-client`, `google-auth-oauthlib`, `python-docx`, `openpyxl`

## Global Constraints

- All Drive API calls use scope `https://www.googleapis.com/auth/drive`
- `credentials.json` and `token.json` are gitignored — never committed
- `modifiedTime` is set by overriding the Drive API field on upload — no file content encodes dates
- Template files (`blank.*`) are committed to the repo and never regenerated at runtime
- `--yes` flag skips the wipe confirmation prompt
- Script must be runnable with `python seed.py` from `scripts/seed_drive/`

---

## File Structure

```
scripts/
  seed_drive/
    seed.py              # CLI entry point — wires auth, wipe, create, report
    auth.py              # OAuth2 flow, token caching
    drive.py             # Drive API wrapper — thin CRUD functions
    wipe.py              # find and trash synctropy-test
    create.py            # read template.json, create folders, upload files
    template.json        # 120-file chaos definition
    templates/
      blank.pdf
      blank.docx
      blank.xlsx
      blank.csv
      blank.jpg
      blank.txt
    generate_templates.py  # one-time script to create the blank template files
    requirements.txt
    README.md
    .gitignore
```

---

## Task 1: Scaffolding

**Files:**
- Create: `scripts/seed_drive/requirements.txt`
- Create: `scripts/seed_drive/.gitignore`
- Create: `scripts/seed_drive/README.md`

- [ ] **Step 1: Create `scripts/seed_drive/requirements.txt`**

```
google-api-python-client>=2.0
google-auth-oauthlib>=1.0
google-auth-httplib2>=0.1
python-docx>=1.1
openpyxl>=3.1
```

- [ ] **Step 2: Create `scripts/seed_drive/.gitignore`**

```
credentials.json
token.json
__pycache__/
*.pyc
```

- [ ] **Step 3: Create `scripts/seed_drive/README.md`**

```markdown
# Drive Seeder

Seeds a messy `synctropy-test` folder in Google Drive for testing the Synctropy MCP pipeline.

## Setup

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Desktop App**
6. Download the JSON and save it as `scripts/seed_drive/credentials.json`

## Install dependencies

```bash
cd scripts/seed_drive
pip install -r requirements.txt
```

## Run

```bash
python seed.py         # prompts before wiping
python seed.py --yes   # skips confirmation
```

First run opens a browser for Google OAuth consent. Token is cached to `token.json` for subsequent runs.
```

- [ ] **Step 4: Install dependencies**

Run from `scripts/seed_drive/`:
```bash
pip install -r requirements.txt
```
Expected: All packages install without error.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed_drive/requirements.txt scripts/seed_drive/.gitignore scripts/seed_drive/README.md
git commit -m "chore: add drive seeder scaffolding"
```

---

## Task 2: Blank Template Files

**Files:**
- Create: `scripts/seed_drive/generate_templates.py`
- Create: `scripts/seed_drive/templates/blank.pdf`
- Create: `scripts/seed_drive/templates/blank.docx`
- Create: `scripts/seed_drive/templates/blank.xlsx`
- Create: `scripts/seed_drive/templates/blank.csv`
- Create: `scripts/seed_drive/templates/blank.jpg`
- Create: `scripts/seed_drive/templates/blank.txt`

- [ ] **Step 1: Create `scripts/seed_drive/generate_templates.py`**

This script is run once to generate the committed template files. It is not part of the runtime seeder.

```python
"""Run once to generate blank template files. Output is committed to the repo."""
import os
from pathlib import Path
from docx import Document
from openpyxl import Workbook

OUT = Path(__file__).parent / "templates"
OUT.mkdir(exist_ok=True)

# blank.pdf — minimal valid single-page PDF
pdf_bytes = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
206
%%EOF"""
(OUT / "blank.pdf").write_bytes(pdf_bytes)
print("blank.pdf written")

# blank.docx
doc = Document()
doc.add_paragraph("")
doc.save(OUT / "blank.docx")
print("blank.docx written")

# blank.xlsx
wb = Workbook()
wb.save(OUT / "blank.xlsx")
print("blank.xlsx written")

# blank.csv
(OUT / "blank.csv").write_text("name,date,amount\n")
print("blank.csv written")

# blank.jpg — 1x1 white pixel JPEG
jpg_bytes = bytes([
    0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,
    0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,
    0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,
    0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
    0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,
    0x24,0x2E,0x27,0x20,0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,
    0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,0x39,0x3D,0x38,0x32,
    0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
    0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,
    0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,
    0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
    0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,
    0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,
    0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xA1,0x08,
    0x23,0x42,0xB1,0xC1,0x15,0x52,0xD1,0xF0,0x24,0x33,0x62,0x72,
    0x82,0x09,0x0A,0x16,0x17,0x18,0x19,0x1A,0x25,0x26,0x27,0x28,
    0x29,0x2A,0x34,0x35,0x36,0x37,0x38,0x39,0x3A,0x43,0x44,0x45,
    0x46,0x47,0x48,0x49,0x4A,0x53,0x54,0x55,0x56,0x57,0x58,0x59,
    0x5A,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x73,0x74,0x75,
    0x76,0x77,0x78,0x79,0x7A,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
    0x8A,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9A,0xA2,0xA3,
    0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xB2,0xB3,0xB4,0xB5,0xB6,
    0xB7,0xB8,0xB9,0xBA,0xC2,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,
    0xCA,0xD2,0xD3,0xD4,0xD5,0xD6,0xD7,0xD8,0xD9,0xDA,0xE1,0xE2,
    0xE3,0xE4,0xE5,0xE6,0xE7,0xE8,0xE9,0xEA,0xF1,0xF2,0xF3,0xF4,
    0xF5,0xF6,0xF7,0xF8,0xF9,0xFA,0xFF,0xDA,0x00,0x08,0x01,0x01,
    0x00,0x00,0x3F,0x00,0xFB,0xD3,0xFF,0xD9,
])
(OUT / "blank.jpg").write_bytes(jpg_bytes)
print("blank.jpg written")

# blank.txt
(OUT / "blank.txt").write_text("")
print("blank.txt written")

print(f"\nAll templates written to {OUT}")
```

- [ ] **Step 2: Run the generator**

```bash
cd scripts/seed_drive
python generate_templates.py
```
Expected output:
```
blank.pdf written
blank.docx written
blank.xlsx written
blank.csv written
blank.jpg written
blank.txt written

All templates written to .../scripts/seed_drive/templates
```

- [ ] **Step 3: Verify template files exist**

```bash
ls -lh scripts/seed_drive/templates/
```
Expected: 6 files (`blank.pdf`, `blank.docx`, `blank.xlsx`, `blank.csv`, `blank.jpg`, `blank.txt`), all > 0 bytes.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed_drive/generate_templates.py scripts/seed_drive/templates/
git commit -m "chore: add blank template files and generator"
```

---

## Task 3: Chaos Template JSON

**Files:**
- Create: `scripts/seed_drive/template.json`

- [ ] **Step 1: Create `scripts/seed_drive/template.json`**

```json
{
  "root": "synctropy-test",
  "files": [
    // --- Downloads/ (22 files) — scatter dump, mixed types and ages ---
    { "name": "invoice_acme_jan2025.pdf",         "template": "blank.pdf",  "folder": "Downloads",        "age_days": 15 },
    { "name": "invoice_acme_feb2025.pdf",         "template": "blank.pdf",  "folder": "Downloads",        "age_days": 45 },
    { "name": "receipt_amazon_march.pdf",         "template": "blank.pdf",  "folder": "Downloads",        "age_days": 10 },
    { "name": "bank_statement_jan2025.pdf",       "template": "blank.pdf",  "folder": "Downloads",        "age_days": 30 },
    { "name": "acme_invoice_dec2024.pdf",         "template": "blank.pdf",  "folder": "Downloads",        "age_days": 195 },
    { "name": "tax_receipt_2024.pdf",             "template": "blank.pdf",  "folder": "Downloads",        "age_days": 200 },
    { "name": "proposal_draft.docx",              "template": "blank.docx", "folder": "Downloads",        "age_days": 20 },
    { "name": "meeting_notes_client_call.docx",   "template": "blank.docx", "folder": "Downloads",        "age_days": 8 },
    { "name": "quarterly_report.docx",            "template": "blank.docx", "folder": "Downloads",        "age_days": 15 },
    { "name": "budget_template.xlsx",             "template": "blank.xlsx", "folder": "Downloads",        "age_days": 45 },
    { "name": "insurance_card_2025.pdf",          "template": "blank.pdf",  "folder": "Downloads",        "age_days": 5 },
    { "name": "resume_2025.pdf",                  "template": "blank.pdf",  "folder": "Downloads",        "age_days": 90 },
    { "name": "DSC_00891.jpg",                    "template": "blank.jpg",  "folder": "Downloads",        "age_days": 60 },
    { "name": "screenshot_2025_03_15.jpg",        "template": "blank.jpg",  "folder": "Downloads",        "age_days": 95 },
    { "name": "photo_vacation.jpg",               "template": "blank.jpg",  "folder": "Downloads",        "age_days": 300 },
    { "name": "email_export_march.txt",           "template": "blank.txt",  "folder": "Downloads",        "age_days": 40 },
    { "name": "how_to_setup_vpn.txt",             "template": "blank.txt",  "folder": "Downloads",        "age_days": 110 },
    { "name": "contract_draft.pdf",               "template": "blank.pdf",  "folder": "Downloads",        "age_days": 25 },
    { "name": "data_export.csv",                  "template": "blank.csv",  "folder": "Downloads",        "age_days": 55 },
    { "name": "untitled.docx",                    "template": "blank.docx", "folder": "Downloads",        "age_days": 3 },
    { "name": "notes2.txt",                       "template": "blank.txt",  "folder": "Downloads",        "age_days": 7 },
    { "name": "zzz_misc_file.txt",                "template": "blank.txt",  "folder": "Downloads",        "age_days": 150 },

    // --- Desktop stuff/ (16 files) — version chaos ---
    { "name": "proposal_v1.docx",                 "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 60 },
    { "name": "proposal_v2.docx",                 "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 55 },
    { "name": "proposal_v2_FINAL.docx",           "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 50 },
    { "name": "proposal_v2_FINAL_final.docx",     "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 48 },
    { "name": "report_copy.docx",                 "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 90 },
    { "name": "report_copy2.docx",                "template": "blank.docx", "folder": "Desktop stuff",    "age_days": 85 },
    { "name": "budget_2025.xlsx",                 "template": "blank.xlsx", "folder": "Desktop stuff",    "age_days": 30 },
    { "name": "Budget_2025.xlsx",                 "template": "blank.xlsx", "folder": "Desktop stuff",    "age_days": 28 },
    { "name": "contract_acme.pdf",                "template": "blank.pdf",  "folder": "Desktop stuff",    "age_days": 40 },
    { "name": "contract_acme (1).pdf",            "template": "blank.pdf",  "folder": "Desktop stuff",    "age_days": 38 },
    { "name": "contract_acme_v2.pdf",             "template": "blank.pdf",  "folder": "Desktop stuff",    "age_days": 35 },
    { "name": "notes.txt",                        "template": "blank.txt",  "folder": "Desktop stuff",    "age_days": 5 },
    { "name": "NOTES.txt",                        "template": "blank.txt",  "folder": "Desktop stuff",    "age_days": 4 },
    { "name": "Notes_final.txt",                  "template": "blank.txt",  "folder": "Desktop stuff",    "age_days": 3 },
    { "name": "invoice_FINAL.pdf",                "template": "blank.pdf",  "folder": "Desktop stuff",    "age_days": 20 },
    { "name": "invoice_FINAL_v2.pdf",             "template": "blank.pdf",  "folder": "Desktop stuff",    "age_days": 18 },

    // --- Misc/ (18 files) — temporal decay: old and new files mixed ---
    { "name": "tax_return_2021.pdf",              "template": "blank.pdf",  "folder": "Misc",             "age_days": 1500 },
    { "name": "bank_statement_2022.pdf",          "template": "blank.pdf",  "folder": "Misc",             "age_days": 1100 },
    { "name": "project_brief_2021.docx",          "template": "blank.docx", "folder": "Misc",             "age_days": 1600 },
    { "name": "client_contract_2020.pdf",         "template": "blank.pdf",  "folder": "Misc",             "age_days": 1800 },
    { "name": "insurance_2019.pdf",               "template": "blank.pdf",  "folder": "Misc",             "age_days": 2500 },
    { "name": "w2_2021.pdf",                      "template": "blank.pdf",  "folder": "Misc",             "age_days": 1400 },
    { "name": "tax_receipt_2019.pdf",             "template": "blank.pdf",  "folder": "Misc",             "age_days": 2600 },
    { "name": "old_budget.xlsx",                  "template": "blank.xlsx", "folder": "Misc",             "age_days": 800 },
    { "name": "photo_2020.jpg",                   "template": "blank.jpg",  "folder": "Misc",             "age_days": 2000 },
    { "name": "screenshot_old.jpg",               "template": "blank.jpg",  "folder": "Misc",             "age_days": 700 },
    { "name": "current_invoice.pdf",              "template": "blank.pdf",  "folder": "Misc",             "age_days": 5 },
    { "name": "new_proposal.docx",                "template": "blank.docx", "folder": "Misc",             "age_days": 12 },
    { "name": "receipt_today.pdf",                "template": "blank.pdf",  "folder": "Misc",             "age_days": 1 },
    { "name": "meeting_today.docx",               "template": "blank.docx", "folder": "Misc",             "age_days": 2 },
    { "name": "notes_old.txt",                    "template": "blank.txt",  "folder": "Misc",             "age_days": 1000 },
    { "name": "invoice_recent.pdf",               "template": "blank.pdf",  "folder": "Misc",             "age_days": 8 },
    { "name": "proposal_new.docx",                "template": "blank.docx", "folder": "Misc",             "age_days": 3 },
    { "name": "resume_old.pdf",                   "template": "blank.pdf",  "folder": "Misc",             "age_days": 900 },

    // --- Old Stuff/ (14 files) — archive candidates 2-4 years old ---
    { "name": "tax_return_2020.pdf",              "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 1800 },
    { "name": "tax_return_2019.pdf",              "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 2200 },
    { "name": "bank_statements_2020.pdf",         "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 1900 },
    { "name": "client_acme_final_report.pdf",     "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 1600 },
    { "name": "project_phoenix_deliverable.docx", "template": "blank.docx", "folder": "Old Stuff",        "age_days": 1700 },
    { "name": "insurance_policy_2019.pdf",        "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 2400 },
    { "name": "passport_copy_2018.pdf",           "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 2800 },
    { "name": "w2_2020.pdf",                      "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 1950 },
    { "name": "1099_2019.pdf",                    "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 2100 },
    { "name": "photo_backup_2020.jpg",            "template": "blank.jpg",  "folder": "Old Stuff",        "age_days": 1850 },
    { "name": "email_archive_2020.txt",           "template": "blank.txt",  "folder": "Old Stuff",        "age_days": 1900 },
    { "name": "contract_bigcorp_2019.pdf",        "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 2300 },
    { "name": "reference_article_save.pdf",       "template": "blank.pdf",  "folder": "Old Stuff",        "age_days": 1500 },
    { "name": "notes_archived.txt",               "template": "blank.txt",  "folder": "Old Stuff",        "age_days": 1600 },

    // --- Client Work/ (14 files) — projects domain, moderate organisation ---
    { "name": "proposal_acme_2025.docx",          "template": "blank.docx", "folder": "Client Work/Acme",       "age_days": 30 },
    { "name": "contract_acme_signed.pdf",         "template": "blank.pdf",  "folder": "Client Work/Acme",       "age_days": 25 },
    { "name": "invoice_acme_001.pdf",             "template": "blank.pdf",  "folder": "Client Work/Acme",       "age_days": 20 },
    { "name": "meeting_notes_kickoff.docx",       "template": "blank.docx", "folder": "Client Work/Acme",       "age_days": 22 },
    { "name": "sow_bigcorp.docx",                 "template": "blank.docx", "folder": "Client Work/BigCorp",    "age_days": 45 },
    { "name": "brief_bigcorp.docx",               "template": "blank.docx", "folder": "Client Work/BigCorp",    "age_days": 40 },
    { "name": "invoice_bigcorp_001.pdf",          "template": "blank.pdf",  "folder": "Client Work/BigCorp",    "age_days": 38 },
    { "name": "proposal_startup.docx",            "template": "blank.docx", "folder": "Client Work/StartupXYZ", "age_days": 60 },
    { "name": "contract_startup.pdf",             "template": "blank.pdf",  "folder": "Client Work/StartupXYZ", "age_days": 55 },
    { "name": "deliverable_v1.pdf",               "template": "blank.pdf",  "folder": "Client Work/StartupXYZ", "age_days": 50 },
    { "name": "invoice_misc_client.pdf",          "template": "blank.pdf",  "folder": "Client Work",            "age_days": 15 },
    { "name": "proposal_new_client.docx",         "template": "blank.docx", "folder": "Client Work",            "age_days": 10 },
    { "name": "meeting_notes_general.docx",       "template": "blank.docx", "folder": "Client Work",            "age_days": 5 },
    { "name": "client_tracker.xlsx",              "template": "blank.xlsx", "folder": "Client Work",            "age_days": 20 },

    // --- 2023/ (10 files) — date-named folder, stale files ---
    { "name": "tax_return_2023.pdf",              "template": "blank.pdf",  "folder": "2023",             "age_days": 400 },
    { "name": "bank_statement_dec2023.pdf",       "template": "blank.pdf",  "folder": "2023",             "age_days": 370 },
    { "name": "invoice_summary_2023.xlsx",        "template": "blank.xlsx", "folder": "2023",             "age_days": 390 },
    { "name": "year_end_report_2023.docx",        "template": "blank.docx", "folder": "2023",             "age_days": 380 },
    { "name": "photo_nye_2023.jpg",               "template": "blank.jpg",  "folder": "2023",             "age_days": 365 },
    { "name": "client_summary_2023.pdf",          "template": "blank.pdf",  "folder": "2023",             "age_days": 395 },
    { "name": "budget_2023.xlsx",                 "template": "blank.xlsx", "folder": "2023",             "age_days": 385 },
    { "name": "contract_renewal_2023.pdf",        "template": "blank.pdf",  "folder": "2023",             "age_days": 410 },
    { "name": "notes_2023.txt",                   "template": "blank.txt",  "folder": "2023",             "age_days": 375 },
    { "name": "receipts_2023.pdf",                "template": "blank.pdf",  "folder": "2023",             "age_days": 405 },

    // --- Temp/ (10 files) — triage bait: ambiguous names ---
    { "name": "zzz_thing.txt",                    "template": "blank.txt",  "folder": "Temp",             "age_days": 200 },
    { "name": "untitled_document.docx",           "template": "blank.docx", "folder": "Temp",             "age_days": 50 },
    { "name": "untitled_document (1).docx",       "template": "blank.docx", "folder": "Temp",             "age_days": 48 },
    { "name": "copy_of_file.pdf",                 "template": "blank.pdf",  "folder": "Temp",             "age_days": 100 },
    { "name": "data.csv",                         "template": "blank.csv",  "folder": "Temp",             "age_days": 30 },
    { "name": "export.csv",                       "template": "blank.csv",  "folder": "Temp",             "age_days": 25 },
    { "name": "temp_file.txt",                    "template": "blank.txt",  "folder": "Temp",             "age_days": 10 },
    { "name": "asdfgh.txt",                       "template": "blank.txt",  "folder": "Temp",             "age_days": 5 },
    { "name": "new_file.docx",                    "template": "blank.docx", "folder": "Temp",             "age_days": 3 },
    { "name": "file001.pdf",                      "template": "blank.pdf",  "folder": "Temp",             "age_days": 60 },

    // --- Reference/ (8 files) — reference domain, moderate age ---
    { "name": "how_to_file_taxes.pdf",            "template": "blank.pdf",  "folder": "Reference",        "age_days": 200 },
    { "name": "quickbooks_tutorial.pdf",          "template": "blank.pdf",  "folder": "Reference",        "age_days": 300 },
    { "name": "drive_organization_tips.txt",      "template": "blank.txt",  "folder": "Reference",        "age_days": 150 },
    { "name": "investment_guide.pdf",             "template": "blank.pdf",  "folder": "Reference",        "age_days": 500 },
    { "name": "home_office_deduction.pdf",        "template": "blank.pdf",  "folder": "Reference",        "age_days": 400 },
    { "name": "freelancer_finance_guide.pdf",     "template": "blank.pdf",  "folder": "Reference",        "age_days": 350 },
    { "name": "client_onboarding_template.docx",  "template": "blank.docx", "folder": "Reference",        "age_days": 180 },
    { "name": "proposal_template.docx",           "template": "blank.docx", "folder": "Reference",        "age_days": 220 },

    // --- Active/Finance/ (10 files) — clean control: well-named, recent, correct location ---
    { "name": "invoice_acme_2025_001.pdf",        "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 5 },
    { "name": "invoice_acme_2025_002.pdf",        "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 10 },
    { "name": "invoice_bigcorp_2025_001.pdf",     "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 8 },
    { "name": "receipt_software_subscription.pdf","template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 3 },
    { "name": "bank_statement_may2025.pdf",       "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 15 },
    { "name": "bank_statement_apr2025.pdf",       "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 45 },
    { "name": "tax_estimate_q1_2025.pdf",         "template": "blank.pdf",  "folder": "Active/Finance",   "age_days": 30 },
    { "name": "budget_2025_q2.xlsx",              "template": "blank.xlsx", "folder": "Active/Finance",   "age_days": 20 },
    { "name": "payroll_summary_may2025.xlsx",     "template": "blank.xlsx", "folder": "Active/Finance",   "age_days": 12 },
    { "name": "accounts_receivable.xlsx",         "template": "blank.xlsx", "folder": "Active/Finance",   "age_days": 7 }
  ]
}
```

> **Note:** JSON does not support comments (`//`). Remove all comment lines before saving. The comments above are for plan readability only. The actual file must be valid JSON.

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; json.load(open('scripts/seed_drive/template.json')); print('valid')"
```
Expected: `valid`

- [ ] **Step 3: Verify file count**

```bash
python -c "import json; d=json.load(open('scripts/seed_drive/template.json')); print(len(d['files']), 'files')"
```
Expected: `122 files`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed_drive/template.json
git commit -m "chore: add 122-file chaos template for drive seeder"
```

---

## Task 4: Auth Module

**Files:**
- Create: `scripts/seed_drive/auth.py`

**Produces:**
- `get_drive_service(credentials_path: str, token_path: str) -> Resource`

- [ ] **Step 1: Create `scripts/seed_drive/auth.py`**

```python
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/drive"]


def get_drive_service(credentials_path: str, token_path: str):
    """Return an authenticated Drive API service. Opens browser on first run."""
    creds = None
    token = Path(token_path)

    if token.exists():
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        token.write_text(creds.to_json())

    return build("drive", "v3", credentials=creds)
```

- [ ] **Step 2: Smoke-test auth (requires `credentials.json`)**

```bash
cd scripts/seed_drive
python -c "
from auth import get_drive_service
svc = get_drive_service('credentials.json', 'token.json')
print('auth OK:', type(svc).__name__)
"
```
Expected (after browser consent on first run): `auth OK: Resource`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed_drive/auth.py
git commit -m "feat: add Drive OAuth2 auth module"
```

---

## Task 5: Drive API Wrapper

**Files:**
- Create: `scripts/seed_drive/drive.py`

**Consumes:**
- `get_drive_service()` → `Resource` (from `auth.py`)

**Produces:**
- `find_folder(service, name: str, parent_id: str | None = None) -> str | None`
- `trash_item(service, file_id: str) -> None`
- `create_folder(service, name: str, parent_id: str) -> str`
- `upload_file(service, local_path: str, name: str, parent_id: str, modified_time: str) -> str`

- [ ] **Step 1: Create `scripts/seed_drive/drive.py`**

```python
from googleapiclient.http import MediaFileUpload
import mimetypes


def find_folder(service, name: str, parent_id: str | None = None) -> str | None:
    """Return the Drive file ID of the first folder matching name, or None."""
    q = f"name = '{name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        q += f" and '{parent_id}' in parents"
    results = service.files().list(q=q, fields="files(id, name)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def trash_item(service, file_id: str) -> None:
    """Move a Drive item to trash."""
    service.files().update(fileId=file_id, body={"trashed": True}).execute()


def create_folder(service, name: str, parent_id: str) -> str:
    """Create a Drive folder and return its ID."""
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def upload_file(service, local_path: str, name: str, parent_id: str, modified_time: str) -> str:
    """Upload a local file to Drive with an overridden modifiedTime. Returns file ID."""
    mime_type, _ = mimetypes.guess_type(local_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    metadata = {
        "name": name,
        "parents": [parent_id],
        "modifiedTime": modified_time,
    }
    media = MediaFileUpload(local_path, mimetype=mime_type)
    file = service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
    ).execute()
    return file["id"]
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed_drive/drive.py
git commit -m "feat: add Drive API wrapper (find, trash, create_folder, upload)"
```

---

## Task 6: Wipe Module

**Files:**
- Create: `scripts/seed_drive/wipe.py`

**Consumes:**
- `find_folder(service, name, parent_id=None) -> str | None` (from `drive.py`)
- `trash_item(service, file_id) -> None` (from `drive.py`)

**Produces:**
- `wipe_test_root(service, root_name: str, skip_confirm: bool = False) -> None`

- [ ] **Step 1: Create `scripts/seed_drive/wipe.py`**

```python
from drive import find_folder, trash_item


def wipe_test_root(service, root_name: str, skip_confirm: bool = False) -> None:
    """Find and trash the root test folder in Drive."""
    folder_id = find_folder(service, root_name)
    if folder_id is None:
        print(f"No existing '{root_name}' folder found — nothing to wipe.")
        return

    if not skip_confirm:
        answer = input(f"Trash existing '{root_name}' folder? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            raise SystemExit(0)

    trash_item(service, folder_id)
    print(f"'{root_name}' moved to trash.")
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed_drive/wipe.py
git commit -m "feat: add wipe module for synctropy-test folder"
```

---

## Task 7: Create Module

**Files:**
- Create: `scripts/seed_drive/create.py`

**Consumes:**
- `create_folder(service, name, parent_id) -> str` (from `drive.py`)
- `upload_file(service, local_path, name, parent_id, modified_time) -> str` (from `drive.py`)

**Produces:**
- `create_structure(service, template: dict, templates_dir: str) -> tuple[int, int]`
  Returns `(folder_count, file_count)`.

- [ ] **Step 1: Create `scripts/seed_drive/create.py`**

```python
import os
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from drive import create_folder, upload_file


def _modified_time(age_days: int) -> str:
    """Return an RFC 3339 timestamp for now minus age_days."""
    dt = datetime.now(timezone.utc) - timedelta(days=age_days)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_folder_path(service, path: str, root_id: str, folder_cache: dict) -> str:
    """
    Recursively ensure all folders in path exist under root_id.
    path is like 'Client Work/Acme'. Returns the leaf folder ID.
    """
    parts = path.split("/")
    current_id = root_id
    built = ""
    for part in parts:
        built = f"{built}/{part}" if built else part
        if built not in folder_cache:
            folder_cache[built] = create_folder(service, part, current_id)
        current_id = folder_cache[built]
    return current_id


def create_structure(service, template: dict, templates_dir: str) -> tuple[int, int]:
    """
    Create the root folder, all subfolders, and upload all files from template.
    Returns (folder_count, file_count).
    """
    root_name = template["root"]
    files = template["files"]

    # Create root — use 'root' as the Drive root parent
    root_id = create_folder(service, root_name, "root")
    folder_cache: dict[str, str] = {}

    # Build the set of unique folder paths and pre-create them (single-threaded)
    unique_folders = sorted(set(f["folder"] for f in files))
    for folder_path in unique_folders:
        _ensure_folder_path(service, folder_path, root_id, folder_cache)

    folder_count = len(folder_cache) + 1  # +1 for root

    # Upload files concurrently
    def upload_one(entry: dict) -> str:
        local_path = os.path.join(templates_dir, entry["template"])
        folder_id = folder_cache[entry["folder"]]
        modified_time = _modified_time(entry["age_days"])
        return upload_file(service, local_path, entry["name"], folder_id, modified_time)

    file_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(upload_one, entry): entry["name"] for entry in files}
        for future in as_completed(futures):
            future.result()  # raises on error
            file_count += 1
            if file_count % 10 == 0:
                print(f"  uploaded {file_count}/{len(files)}...")

    return folder_count, file_count
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed_drive/create.py
git commit -m "feat: add create module with concurrent file upload"
```

---

## Task 8: Entry Point

**Files:**
- Create: `scripts/seed_drive/seed.py`

**Consumes:**
- `get_drive_service(credentials_path, token_path) -> Resource` (from `auth.py`)
- `wipe_test_root(service, root_name, skip_confirm) -> None` (from `wipe.py`)
- `create_structure(service, template, templates_dir) -> tuple[int, int]` (from `create.py`)

- [ ] **Step 1: Create `scripts/seed_drive/seed.py`**

```python
import argparse
import json
import os
import sys

from auth import get_drive_service
from wipe import wipe_test_root
from create import create_structure

HERE = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS = os.path.join(HERE, "credentials.json")
TOKEN = os.path.join(HERE, "token.json")
TEMPLATE_FILE = os.path.join(HERE, "template.json")
TEMPLATES_DIR = os.path.join(HERE, "templates")


def main():
    parser = argparse.ArgumentParser(description="Seed synctropy-test folder in Google Drive")
    parser.add_argument("--yes", action="store_true", help="Skip wipe confirmation")
    args = parser.parse_args()

    if not os.path.exists(CREDENTIALS):
        print(f"ERROR: credentials.json not found at {CREDENTIALS}")
        print("See README.md for GCP setup instructions.")
        sys.exit(1)

    with open(TEMPLATE_FILE) as f:
        template = json.load(f)

    print("Authenticating...")
    service = get_drive_service(CREDENTIALS, TOKEN)

    print(f"Wiping existing '{template['root']}' folder...")
    wipe_test_root(service, template["root"], skip_confirm=args.yes)

    print(f"Creating '{template['root']}'...")
    folder_count, file_count = create_structure(service, template, TEMPLATES_DIR)

    # Get the root folder URL
    from drive import find_folder
    root_id = find_folder(service, template["root"])
    url = f"https://drive.google.com/drive/folders/{root_id}" if root_id else "(not found)"

    print(f"\n{template['root']} created: {folder_count} folders, {file_count} files")
    print(f"Root: {url}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed_drive/seed.py
git commit -m "feat: add seed.py entry point"
```

---

## Task 9: End-to-End Verification

This task verifies the complete seeder works against a real Google Drive account.

**Prerequisites:** `credentials.json` placed in `scripts/seed_drive/` (see README).

- [ ] **Step 1: Run the seeder for the first time**

```bash
cd scripts/seed_drive
python seed.py
```
Expected output:
```
Authenticating...
[browser opens for consent on first run]
Wiping existing 'synctropy-test' folder...
No existing 'synctropy-test' folder found — nothing to wipe.
Creating 'synctropy-test'...
  uploaded 10/122...
  uploaded 20/122...
  ...
  uploaded 120/122...

synctropy-test created: 16 folders, 122 files
Root: https://drive.google.com/drive/folders/<id>
```

- [ ] **Step 2: Open the Drive URL and verify structure**

Open the URL printed in the report. Confirm:
- `synctropy-test/` folder exists with ~16 subfolders
- `Downloads/` contains 22 files with mixed types
- `Desktop stuff/` has version-suffix duplicates (`proposal_v1`, `v2`, `v2_FINAL`, etc.)
- `Active/Finance/` has 10 clean, consistently named files
- File dates: click a file → Details → Modified should show the correct approximate age

- [ ] **Step 3: Run again to verify idempotency**

```bash
python seed.py --yes
```
Expected:
```
Authenticating...
Wiping existing 'synctropy-test' folder...
'synctropy-test' moved to trash.
Creating 'synctropy-test'...
...
synctropy-test created: 16 folders, 122 files
```
Confirm the old folder is in Drive Trash and a fresh one exists at the root.

- [ ] **Step 4: Verify Drive Trash (non-destructive)**

In Google Drive, click **Trash**. Confirm the old `synctropy-test` folder is there and can be restored if needed.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: drive seeder complete and verified end-to-end"
```

---

## Self-Review

**Spec coverage:**
- ✅ Personal OAuth (Desktop App flow) — Task 4
- ✅ Idempotent (wipe + recreate) — Tasks 6, 9
- ✅ 120+ files — Task 3 (122 files)
- ✅ All 7 classifier domains represented — template.json
- ✅ Realistic content classifiable by filename/path/MIME — template file names + blank binaries
- ✅ Scatter signal — Downloads/ (22 files), Misc/ (18 files)
- ✅ Naming chaos — Desktop stuff/ version suffixes, casing duplicates
- ✅ Temporal decay — Misc/ mixes 1-day and 2500-day files
- ✅ Triage bait — Temp/ (10 files with ambiguous names)
- ✅ Clean control folder — Active/Finance/ (10 files)
- ✅ `modifiedTime` override — `create.py:_modified_time()`
- ✅ Concurrent upload — `ThreadPoolExecutor(max_workers=10)`
- ✅ `--yes` flag — `seed.py` argparse
- ✅ `credentials.json` / `token.json` gitignored — `.gitignore`

**Type consistency:** All function signatures referenced across tasks are consistent — `create_structure` returns `tuple[int, int]` in Task 7 and is used as such in Task 8.

**Placeholder scan:** No TBDs, TODOs, or vague steps found.
