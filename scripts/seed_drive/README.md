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
