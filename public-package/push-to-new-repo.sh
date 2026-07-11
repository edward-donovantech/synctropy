#!/usr/bin/env bash
# Creates the synctropy-mcp GitHub repo (PRIVATE) and pushes the package to it.
# Run from anywhere inside the synctropy repo. Requires: gh CLI, logged in (gh auth login).
set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/synctropy-mcp" && pwd)"
REPO="edward-donovantech/synctropy-mcp"

# Sanity: build + tests must pass before anything leaves this machine
cd "$PKG_DIR"
npm install
npm run build
npm test

# Create the repo PRIVATE — flip to public only after your own review (see PUBLISH.md)
gh repo create "$REPO" --private \
  --description "AI-native file intelligence as an MCP server — entropy scoring, taxonomy classification, and reorganization planning for any file tree. Fully offline."

# Push a clean copy (excludes node_modules/dist via .gitignore)
TMP="$(mktemp -d)"
rsync -a --exclude node_modules --exclude dist --exclude package-lock.json "$PKG_DIR/" "$TMP/"
cd "$TMP"
git init -b main
git add -A
git commit -m "Initial release: synctropy-mcp v0.1.0"
git remote add origin "https://github.com/$REPO.git"
git push -u origin main

echo
echo "Done: https://github.com/$REPO (private)"
echo "Next steps: see $PKG_DIR/PUBLISH.md"
