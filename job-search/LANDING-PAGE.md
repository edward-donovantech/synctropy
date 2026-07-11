# getsynctropy.com — Landing Page Rewrite (for Lovable)

*Note: this session's sandbox couldn't fetch the live site (network policy blocks the domain), so
this is written fresh from Synctropy's actual positioning. If anything below contradicts what's
live, paste me the current copy and I'll diff. Two ways to use this doc: paste the "Lovable
prompt" wholesale, or hand-edit sections into the existing page.*

## Positioning decision (read first)

The page has two audiences now, and that's fine — they want the same proof:
1. **Users** — people whose Drive/desktop is chaos and who use Claude
2. **Recruiters & hiring managers** — checking whether "shipped an AI-native product" is real

One page serves both IF it leads with a working product and shows architecture literacy. Don't
water it down with "hire me" copy — the founder section at the bottom does that quietly.

**Core reframe vs. old dashboard-era positioning:** Synctropy is not an app you open. It's a
capability you add to the AI you already use. The AI client is the UI.

---

## Page copy

### Hero
**Headline:** Your files, organized by the AI you already use.

**Subhead:** Synctropy plugs into Claude (or any MCP-compatible AI) and turns "my Drive is a
disaster" into a reviewed, approved, executed cleanup plan. You stay in charge — it never moves
a file without your sign-off.

**Primary CTA:** `Get started free →` (install instructions / waitlist)
**Secondary CTA:** `Watch the 3-minute demo` (the P0 demo video — this is why it's a P0)

**Hero visual:** terminal-style mock of a Claude conversation: user says "clean up my Downloads,"
Synctropy returns the entropy map + proposed moves, user approves, done. (Lovable can build this
as a styled chat mock — no screenshots needed.)

### Section 2 — How it works (3 steps)
1. **Connect** — Add Synctropy to Claude in one line. Your AI reads your file *listings* through
   the storage you already connected — names, dates, folders. Never contents.
2. **Understand** — Synctropy scores every folder for disorder (scatter, naming chaos, staleness),
   classifies every file into a clean taxonomy, and flags what it isn't sure about instead of
   guessing.
3. **Approve & execute** — You get a prioritized plan: what moves where, and why. Nothing happens
   until you say so. Dry-run first, always.

### Section 3 — Why it's different (the architecture as a selling point)
**Deterministic where it counts. Judgment where it helps. You, always in the loop.**
- Classification rules are versioned code, not model vibes — the same file gets the same answer
  every time.
- The AI handles the ambiguous cases — and asks you when it isn't sure.
- Destructive operations require your explicit approval. Every time.
- **Privacy by architecture:** file contents never leave your storage. Synctropy's engine sees
  metadata only. (Free tier runs fully offline.)

### Section 4 — Social proof / credibility strip
- "Built on the open Model Context Protocol" (+ MCP logo/link)
- Open-source core: link to the synctropy-mcp GitHub repo once public
- Once the P1 case study exists: one quoted result with a number

### Section 5 — Pricing
- **Free** — the full organization engine, runs locally, results written to your Drive
- **Premium** — run history, cross-scan analytics, dashboard, multi-platform (coming: price TBD)
- Keep this soft until premium is live: "Free while in early access. Premium tier coming."

### Section 6 — Founder note (the recruiter-facing 5%)
Short, personal, one photo:
> Synctropy is built by Edward Donovan — solutions architect (10 years, $15M+ enterprise deals at
> Siemens), patent-holding hardware engineer, and MCP-native builder. I started Synctropy because
> my own Drive was a museum of `_v2_FINAL` files, and because I believe the AI client — not
> another dashboard — is the interface for this whole product category.
> [LinkedIn] [GitHub] [Blog]

### Footer
Product (demo, GitHub, changelog) · Company (about, blog, contact) · hello@getsynctropy.com ·
Privacy: "We never store your file contents. Here's the architecture that makes that true →"
(links to blog post #2, see BLOG-PLAN.md)

---

## Lovable prompt (paste this)

> Redesign this landing page for Synctropy, an AI-native file organization tool that works as an
> MCP server inside Claude. Tone: technical-credible but warm; think Linear or Vercel, not
> corporate SaaS. Dark-mode-first with a light accent color. Sections in order: (1) hero with
> headline "Your files, organized by the AI you already use." + a stylized chat mockup showing a
> user asking Claude to clean up Downloads and receiving an organized plan; primary CTA "Get
> started free", secondary "Watch the 3-minute demo"; (2) three-step How It Works: Connect /
> Understand / Approve & execute; (3) "Why it's different" feature grid with four cards:
> deterministic rules, AI handles ambiguity, human approval gates, privacy by architecture (file
> contents never leave your storage); (4) credibility strip: "Built on the open Model Context
> Protocol" with GitHub repo link; (5) simple two-tier pricing: Free (full engine, local,
> early access) and Premium (history, analytics, dashboard — coming soon); (6) short founder note
> section with photo, the text I'll provide, and LinkedIn/GitHub/blog links; (7) footer with
> product/company links and the line "We never store your file contents." Make it responsive and
> fast; no stock photos anywhere.

## Checklist after publishing
- [ ] Point "Get started free" at real install instructions (README quickstart) or a waitlist form
- [ ] Add OpenGraph title/description/image (Lovable setting) — this is what LinkedIn shows when
      you share the link, and you're about to share it a lot
- [ ] Plausible or simple analytics so you can see if GTM efforts move anything
- [ ] Add the domain to your resume header and LinkedIn Featured section
