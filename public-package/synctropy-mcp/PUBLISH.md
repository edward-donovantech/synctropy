# Publish Checklist (you run these — nothing here is automated)

## 1. Review, then flip the repo public
- Read every file once more — especially README.md and package.json author fields
- GitHub → synctropy-mcp → Settings → General → Danger Zone → Change visibility → Public

## 2. Publish to npm
```bash
git clone https://github.com/edward-donovantech/synctropy-mcp && cd synctropy-mcp
npm install
npm test                # must be green
npm login               # your npm account (create at npmjs.com if needed)
npm publish             # prepublishOnly runs build + tests automatically
npx synctropy-mcp       # verify: should start and wait on stdio (Ctrl-C to exit)
```

## 3. Verify the 5-minute stranger test
On any machine: `claude mcp add synctropy -- npx -y synctropy-mcp`, then ask Claude to analyze a
folder. If that works cold, the resume link is real.

## 4. Optional listings (more discoverability)
- MCP Registry: https://github.com/modelcontextprotocol/registry — follow the submission README
- Smithery: https://smithery.ai — "Add server", point at the GitHub repo
- Awesome MCP servers list: PR to https://github.com/punkpeye/awesome-mcp-servers

## 5. Update the paper trail
- Resume (RESUME-AI-SA.md): swap in the unlock bullet — "Published Synctropy's MCP server as an
  open-source package (npx synctropy-mcp)"
- LinkedIn Featured section: add the repo link
- GitHub profile: pin the repo
