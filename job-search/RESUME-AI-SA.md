# Edward J. Donovan

Boston, MA | (617) 438-8892 | ejoseph.donovan@gmail.com | linkedin.com/in/edwardjdonovan
github.com/edwardjdonovan | [demo video link — record per PROJECT-ROADMAP.md P0] | donovantechnology.com

> Working copy for AI-startup SA / SE / FDE applications. Adapted from the Maven AGI resume
> (which stays the PDF source of truth). Diffs from that version are marked with ✏️ notes at the bottom.

## Summary

Solutions Architect and Forward-Deployed Engineer with 10+ years taking complex enterprise systems
from whiteboard to production. Won $15M+ in deal value alongside sales teams, architected solutions
for CTOs and procurement leaders, and built the technical bridge between what sales commits and what
engineering delivers. Currently shipping AI-native products hands-on: production MCP server
architectures, agent orchestration, and LLM-powered systems across the modern AI stack.

## Core Capabilities

- **Customer-facing:** Technical demos, PoC ownership, RFP responses, pre-SOW scoping, enterprise sales cycles, CTO-level engagement, onsite deployment
- **AI & Agentic Systems:** LLM APIs (Anthropic, OpenAI), MCP server architecture, agent orchestration, evals & regression gates, guardrails, human-in-the-loop design, agentic SDLC, multi-cloud integration
- **Engineering:** Python, TypeScript/Node.js, Spring Boot/Java, C/C++ (embedded Linux), AWS, Docker, REST APIs, CI/CD, Supabase/Postgres

## Experience

### Donovan Technology LLC — Founder | April 2024 – Present

**Synctropy — Founder & CEO (AI-Native File Intelligence)**
- Designed and shipped a production MCP server (Node.js/TypeScript, stdio + HTTP transports, deployed on Railway) that decouples organizational intelligence from storage integrations, enabling compatibility with any MCP-compatible AI client.
- Architected a 12-skill agentic pipeline where deterministic rules, persistence, and user config live server-side while the AI client owns judgment calls and execution — a clean human-in-the-loop agent design.
- Repositioned the original web dashboard into an AI-native MCP product after identifying that LLM platforms were commoditizing the UI layer; conducted structured customer discovery across 4+ industries to validate the pivot.
- Designed guardrails for agent-driven file operations: dry-run previews, protected-folder confirmation gates, and a strict server/client boundary so no file content ever touches the server.

<!-- Unlock these bullets as PROJECT-ROADMAP.md items complete:
- Published Synctropy's MCP server as an installable open-source package (npx synctropy-mcp); listed on the MCP registry  [READY — package built & tested in public-package/; unlock the moment you run push-to-new-repo.sh + npm publish]
- Deployed with live customer data: [N] files organized, [X] hrs/week saved  [after P1-3]
- Built an eval harness for the classification engine: [P]% precision across [K] domains, wired into CI as a regression gate  [after P1-4]
-->


**BackBurn — Fractional CTO (AI Coaching Platform)**
- Designed an AI-native platform using MCP server architecture to integrate domain-specific intelligence directly into AI agents.
- Validated system architecture with a hypothesis-driven experiment framework tracing decisions from customer assumptions through capability requirements to implementation.
- Advise early-stage clients on AI adoption strategy, agentic system design, and vendor evaluation.

### Siemens (acquired Bytemark) — Solution Architect | October 2019 – April 2024
- Partnered with sales to win $15M+ in new deal value through technical RFP strategy, solution designs, and executive-level presentations to CTOs and procurement leaders.
- Delivered architecture and design documentation that unlocked $990K in milestone payments for enterprise transit clients, serving as the technical bridge between sales commitments and engineering delivery.
- Owned pre-SOW technical scoping — integration complexity, data flows, risk surface, effort estimates — across multiple concurrent enterprise accounts.
- Architected revenue control systems integrating payment gateways, legacy fare infrastructure, and new mobile/EMV channels across multiple transit agencies: data contracts, fallback behavior, acceptance gates.
- Documented 83 production applications and their interdependencies using C4 architecture modeling, creating reusable reference architectures that reduced onboarding and design risk.

### Bytemark — Hardware/Software Engineer → Senior | August 2016 – October 2019
- Co-invented patented Bluetooth mobile ticketing and sensor-fusion systems, resulting in $1.5M new revenue.
- Created rapid embedded and cloud prototypes to validate new product opportunities for executives, enabling fast technical go/no-go decisions.
- Engineered a hardware-agnostic fare validation REST API adopted by client systems for high-frequency transactions.

### ASSA ABLOY — Product Development Engineer | December 2013 – August 2016
- Led electrical design for a BLE access control product with $3.48M projected three-year revenue.
- Scaled production to 4,000+ units/year; cut manufacturing cycle time 60% through test fixture design.

## Leadership & Recognition
- **Patents:** Co-inventor, Sensor Fusion Systems for Hands-Free Ticketing (US 10,375,573; US 11,803,784)
- **Speaking:** ITS California (2021), APTATech (2020)
- **Fabric of Tuck Award** — elected by the Dartmouth Tuck community

## Education
B.S. Electrical Engineering & B.S. Physics — Trinity College, Hartford, CT

---

## ✏️ Changes vs. the Maven AGI PDF version

1. **Summary:** added "Forward-Deployed Engineer" to the title line and made the hands-on AI work concrete ("production MCP server architectures") instead of "advising startups" — FDE screens filter for builders.
2. **Synctropy first, BackBurn second** under Donovan Technology — Synctropy has more shipped-production detail and reads stronger for FDE roles.
3. **Synctropy bullets rewritten** with deployment specifics (Node.js/TypeScript, Railway, stdio+HTTP transports) and the 12-skill agentic pipeline — turns "designed" into "shipped."
4. **Core capabilities:** added "evals," "onsite deployment," and named LLM providers; added Supabase/Postgres.
5. **Per-application tweak list:** for Anthropic lead with MCP everywhere; for Code Metal move the embedded/C++ line up; for CX companies (Decagon/Sierra/Intercom) add a line on high-volume consumer transaction systems from transit.

## ✏️ Improvement checklist (what this resume still needs — from Phase 2 review)

**Fix now (before next application batch):**
1. **Links line** — added above, but the demo-video placeholder must become a real link (PROJECT-ROADMAP.md P0-2) and confirm the GitHub handle. A resume claiming "shipped two production MCP servers" with nothing clickable reads as unverified.
2. **FDE vocabulary** — evals, guardrails, human-in-the-loop now appear where truthful. Do NOT add RAG/fine-tuning unless you actually do it; FDE interviewers probe every keyword.
3. **Numbers on the AI work.** The Siemens bullets have $15M/$990K/83 apps; the Synctropy bullets have zero numbers — the contrast whispers "the AI work isn't real yet." Even honest small numbers beat none: tools exposed, artifact types persisted, test count, discovery interviews (4+ industries is already there — keep mining for more).

**Fix as projects land (see PROJECT-ROADMAP.md):**
4. Swap in the unlock bullets (npm package, customer deployment metrics, eval precision) as each completes — these three bullets are worth more than everything else on this checklist combined.

**Per-company one-line swaps for the Summary's last sentence:**
- Anthropic: "...including two production MCP servers built on Anthropic's protocol and SDK."
- Code Metal: "...combining a decade of embedded systems (C/C++, two hardware patents) with current agentic-AI depth."
- Decagon/Sierra/Intercom: "...with recent deep work in agentic CX architecture and enterprise support automation."
- Glean: "...as a 0-to-1 founder who has also carried $15M+ of enterprise pre-sales."
