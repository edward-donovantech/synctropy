# Connect Claude to Synctropy in 5 minutes

Synctropy doesn't run in your browser — it runs as a conversation with Claude. The
dashboard (synctropy.vercel.app) shows you the *results* of a scan; this page gets
you to your first scan.

You'll need:
- A Google Drive account (the one you want organized)
- 5 minutes
- Claude Desktop **or** Claude Code (pick one below)

---

## Step 1 — Install a Claude client

**Option A: Claude Desktop** (easiest if you don't use a terminal)
Download it from [claude.ai/download](https://claude.ai/download), install it, and sign in.

**Option B: Claude Code** (if you already work in a terminal)
```bash
npm install -g @anthropic-ai/claude-code
```

---

## Step 2 — Connect Synctropy

**If you're using Claude Code**, run:
```bash
claude mcp add synctropy -- npx -y synctropy-mcp
```

**If you're using Claude Desktop**, open Settings → Developer → Edit Config, and add this
to the file that opens:
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
Save the file and restart Claude Desktop.

> Nothing to sign up for here — this step just teaches Claude a new skill. No account,
> no API key, nothing leaves your machine yet.

---

## Step 3 — Connect Google Drive

Inside your Claude conversation, just ask:

> "Connect to my Google Drive"

Claude will walk you through Google's own sign-in screen. Synctropy never sees your
password — Google hands Claude a permission token directly, the same way any
"Sign in with Google" button works.

---

## Step 4 — Start the scan

Paste this into Claude:

> "Run the Synctropy pipeline starting with /00-scan-connectors"

From here, Claude does the work and will stop and ask you two things along the way:

1. **Which folders are off-limits** — Synctropy pre-flags anything that looks personal
   (e.g. "Family") and asks you to confirm before it looks inside.
2. **Does this proposed folder structure look right** — you'll see a full plan before
   anything happens. You can approve it, or ask for changes.

**Nothing on your Drive is touched until you explicitly say "execute."** Every step
before that is read-only analysis.

---

## Step 5 — Review and clean up

When it's done, Claude creates a new `Suggested/` folder in your Drive — a complete,
reorganized *copy*. Your original files are untouched. Open `Suggested/`, look around,
and once you're happy with it, delete the originals yourself (Synctropy doesn't delete
anything automatically — that part stays your call).

---

## Where to see what happened

Head back to [synctropy.vercel.app](https://synctropy.vercel.app) and sign in — your
scan history, issue counts, and category breakdown will show up on the dashboard.

---

## Troubleshooting

- **"Claude doesn't see the synctropy tool"** — restart your Claude client after editing
  the config; it only re-reads it on launch.
- **Stuck on a step?** The pipeline is just a conversation — you can always ask Claude
  "what just happened?" or "what's next?" and it'll explain in plain language.
