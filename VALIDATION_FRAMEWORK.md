# Synctropy Validation Framework

## Core Hypotheses Map

This document maps Synctropy's product features to entrepreneurial hypotheses, embedded assumptions, and lean experiments needed to validate them before scaling.

---

## 1. PROBLEM VALIDATION HYPOTHESES

### H1.1: File Organization is a Real, Urgent Problem
**Current Assumption:** Knowledge workers experience significant friction from disorganized files that justifies a solution.

**Why This Matters:** If users don't feel acute pain, they won't adopt (even free solutions have churn).

**Evidence We'd Need:**
- Users spontaneously mention file chaos unprompted (not when asked)
- They describe specific moments of failure ("I couldn't find the invoice," "wasted 30 mins searching")
- They've attempted solutions before (named versions, folder reorganization)

**Experiments:**
| Experiment | Method | Target Segment | Success Criteria | Timeline |
|---|---|---|---|---|
| **Problem Interview** | 30-min calls, open-ended ("walk me through your file workflow") | Individuals + Teams | 7+ interviews, ≥5 mention file chaos unprompted | Week 1-2 |
| **Slack Community Scan** | Search #productivity, #tools channels for complaints about file organization | Individuals | ≥10 organic mentions of "can't find files," "too many versions" | Week 1 |
| **Usability Test (Shadow)** | Watch 3 users manage files; count friction points | Individuals | ≥2 moments of >5 min search time per session | Week 2 |
| **Survey (Segmented)** | "On a scale of 1-10, how frustrated are you with file organization?" + segmented follow-up | All segments | ≥60% rate 6+ for at least one segment | Week 2-3 |

**Red Flags (Pivot if True):**
- Users say "my system works fine for me" or describe workarounds they're happy with
- No one mentions the problem unprompted (it's bottom-of-mind)
- Users tried solutions before and abandoned them

---

### H1.2: The Problem is Acute for [SPECIFIC SEGMENT]
**Current Assumption:** Problem urgency varies by segment; one segment has acute pain.

**Why This Matters:** Easier to sell a solution to a segment with acute pain. Requires narrowing target.

**Experiments:**
| Experiment | Method | Target Segment | Success Criteria | Timeline |
|---|---|---|---|---|
| **Segment Pain Ranking** | Ask 5 users per segment (individual, team, enterprise) to score pain 1-10 | All | One segment averages ≥7/10, others ≤5 | Week 2-3 |
| **Consequence Mapping** | "What happens if you can't find a file?" - qualitative impact | All | Teams/Enterprise report lost revenue/efficiency cost; Individuals report lost time/stress | Week 3 |

**Expected Outcome:** By Week 3, should know which segment(s) to focus on for solution interview.

---

## 2. SOLUTION VALIDATION HYPOTHESES

### H2.1: Users Will Trust AI to Organize Their Files
**Current Assumption:** Users are comfortable with AI categorizing/moving files without human review.

**Why This Matters:** Core product bet. If users don't trust, solution won't work.

**Embedded Assumptions in Product:**
- Confidence scoring (0-1) catches ambiguous files → triage to human
- Entropy scoring (0-100) helps users understand why folders are scored as "critical"
- Suggested operations (move/rename) show up as recommendations, not auto-executed

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Concept Interview** | Show wireframe of entropy dashboard + suggested operations. "What would you need to trust this?" | ≥70% say "I'd try it if I could review first" | Week 3 |
| **Prototype A/B** | Test two concepts: (1) Auto-execute moves (premium), (2) Review-only recommendations | Prototype users prefer review-only 3:1 or higher | Week 4 |
| **Dry-Run Test** | Show users MCP analyze_structure output (folder scores + operations) without executing. Did they match expectations? | ≥80% say suggestions were "reasonable" or "exactly what I'd do" | Week 4 |
| **Permission Comfort** | Show users the RLS policy: "only you can see your files; our server never touches content." Does this increase trust? | Qualitative: 0 users express privacy concerns during review | Week 4 |

**Red Flags:**
- Users want to "try on test data first" (suggests low trust)
- Users don't understand entropy scores (usability issue, not trust issue)
- ≥2 users say "I'd never let an AI touch my files"

---

### H2.2: The [Domain Classification] Model is Accurate Enough
**Current Assumption:** Current taxonomy (finance, projects, admin, media, comms, reference, inbox) with ≥60% confidence catches most files correctly. Low-confidence files routed to triage.

**Why This Matters:** Accuracy drives trust and retention. Bad recommendations = user churn.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Real File Test** | Run analyze_structure on 3 users' actual Drive (with permission). Manual audit of classifications. | ≥85% of high-confidence classifications correct; <5% false positives in "suggested move" | Week 4-5 |
| **Edge Case Hunt** | Identify files that break the model (PDFs vs docs, archived projects, templates). | Taxonomy can be updated to handle ≥80% of edge cases | Week 5 |
| **Domain Expansion** | Do users suggest additional domains? (e.g., "archived," "waiting," "legal," "procurement") | If ≥30% of users suggest new domains, model may need refinement | Week 5 |
| **Confidence Threshold Sweep** | Test: what confidence level makes users trust the recommendation? 60%, 70%, 80%? | Find sweet spot where users trust ≥80% of recommendations | Week 5 |

**Red Flags:**
- ≥15% of classifications are wrong (accuracy too low)
- Users have to create custom domains to get value (product too rigid)
- Low-confidence triage pile is >40% of all files (model is unreliable)

---

### H2.3: Entropy Scoring (0-100) is Actionable for Users
**Current Assumption:** Entropy score + signals (scatter, naming chaos, temporal decay) gives users enough context to act.

**Why This Matters:** If entropy is abstract/confusing, users won't take action.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Comprehension Test** | Show 5 users: folder with score 72 + signals ("15 version files," "files >3 years old"). "What's wrong? What would you do?" | ≥80% understand the issue and suggest relevant action | Week 4 |
| **Action Interview** | "If you saw this entropy report for your team's drive, would you act? Why/why not?" | ≥70% say they'd take action; reasons align with offered operations | Week 4 |
| **Redesign Feedback** | (From CLAUDE.md: dashboard moving to "raw metrics" instead of abstract scores). Show users both versions. Which drives action? | User feedback suggests raw metrics (files/folders/size) > abstract entropy | Week 5 |

**Red Flags:**
- Users say "I don't know what to do with this score"
- Users ignore folders with high entropy (not actionable)
- Users request "just tell me which files to delete" (want prescriptive, not diagnostic)

---

### H2.4: Premium Feature Set Justifies Pricing
**Current Assumption:** Premium users (is_premium=true) value artifact persistence + storage mode flexibility enough to pay.

**Why This Matters:** Freemium model only works if premium tier has real value.

**Embedded Features:**
- save_pipeline_artifact (persist skill outputs to Supabase)
- storage_mode flexibility ('drive' vs 'supabase' vs 'both')
- Access to full pipeline_artifacts history

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Value Interview (Post-Use)** | After users experience the product (free tier), ask: "Would you pay for faster scans + cloud history + integrations?" | ≥30% say "yes, maybe" (not "definitely no") | Week 6 |
| **Pricing Sensitivity** | Show users three price points ($5/mo, $15/mo, $50/mo). Which feels "right"? | ≥50% select the same tier (price anchoring working) | Week 6 |
| **Feature Preference** | Rank premium features: (1) History/artifacts, (2) Faster scans, (3) Team sharing, (4) Integrations. | Clear winner emerges; informs actual build roadmap | Week 6 |
| **Freemium Degradation** | Limit free tier (e.g., 1 scan/month, no artifact history). Do users upgrade or churn? | ≥20% of engaged free users upgrade (baseline to beat) | Weeks 7-8 |

**Red Flags:**
- Users never ask about artifacts or premium features
- ≥30% say "I'd rather use [competitor]" or "I'd build my own"
- No one selects same price point (price unclear)

---

## 3. MARKET VALIDATION HYPOTHESES

### H3.1: [SEGMENT] is a Viable Go-to-Market
**Current Assumption:** One of {individuals, teams, enterprises} has enough pain + willingness-to-pay to justify focus.

**Why This Matters:** Segment choice drives everything: messaging, GTM, pricing, features.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Segment Scorecards** | For each segment, score: (1) Pain (1-10), (2) Willingness to pay (% saying yes), (3) Accessibility (how many fit profile) | One segment scores ≥7 on all three | Week 3 |
| **Persona Interviews** | 10 interviews per segment with clearly defined personas (e.g., "VP of Ops at 50-person startup") | Consensus emerges on: job to be done, key objections, willingness to pay | Weeks 4-5 |
| **Referral Test** | Do users in [segment] refer others? (strong proxy for product-market fit at segment level) | ≥20% of users refer a peer | Week 7-8 |

---

### H3.2: There's a Viable Monetization Model
**Current Assumption:** Freemium (free tier + premium subscription) is the right model.

**Why This Matters:** Wrong model = early success followed by collapse.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Model A/B** | Test three models: (1) Freemium ($X/mo), (2) Free + one-time upsell, (3) Free trial → paid. | One model shows ≥25% conversion; others <15% | Week 6-7 |
| **Willingness to Pay Study** | Use Van Westendorp Price Sensitivity or direct "would you pay $X?" | 30%+ say they'd pay at at least one price point | Week 6 |
| **Enterprise Pricing Hypothesis** | If targeting teams/enterprises, test per-user or per-org pricing. | Pricing model tracks user value (more files = more value) | Week 7 |

**Red Flags:**
- Users want "try before you buy" but never come back (low conversion)
- Freemium attracts wrong segment (storage hoarders vs active organizers)
- No price point gets >20% willingness to pay

---

## 4. TECHNICAL VALIDATION HYPOTHESES

### H4.1: Classification Accuracy Scales to Real User Data
**Current Assumption:** Taxonomy + weighted voting + confidence thresholds work on real Google Drives.

**Why This Matters:** If accuracy breaks at scale, the entire product fails.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Scale Test** | Run MCP analyze_structure on 5 users with varying drive sizes (100 files to 100k files). | Performance: <30s for 100k files; accuracy holds at >85% | Week 5 |
| **Domain Edge Cases** | Collect 100 real files from user drives that the model misclassifies. Analyze patterns. | <20% of misclassifications are unsolvable by rule update; most have a pattern | Week 5-6 |
| **Confidence Calibration** | Compare confidence scores (0-1) to actual correctness. Does a 0.9 score predict >90% accuracy? | Confidence scores are well-calibrated (no overconfidence) | Week 6 |
| **Multi-Language Test** | Do non-English filenames break the model? (e.g., "財務.xlsx", "Dokumenty") | Model degrades gracefully; suggests triage instead of guessing | Week 7 |

**Red Flags:**
- Accuracy drops below 80% at scale
- Performance >30s per scan (users will abandon)
- Confidence scores are poorly calibrated (users learn not to trust them)

---

### H4.2: MCP Server Can Handle Planned Load
**Current Assumption:** Architecture supports freemium + premium tiers without scaling costs exploding.

**Why This Matters:** If infrastructure costs exceed revenue, business doesn't work.

**Experiments:**
| Experiment | Method | Success Criteria | Timeline |
|---|---|---|---|---|
| **Load Test** | Simulate 100 concurrent users running analyze_structure. | Response time <5s at p95; server CPU/memory usage <70% | Week 6 |
| **Cost Estimate** | Run 100 scans; measure Supabase usage (reads, writes, storage). Calculate per-user cost. | Cost per premium user <20% of expected revenue | Week 6 |
| **Persistence Degradation** | Test: what happens when Supabase is down? (Skills should run offline, MCP gracefully falls back) | Analyze_structure returns result even if artifact save fails | Week 5-6 |

**Red Flags:**
- Database reads/writes scale poorly; cost per user >30% of revenue
- Response time >10s (users abandon mid-flow)
- Offline degradation doesn't work (users stuck)

---

## 5. PRIORITIZED VALIDATION ROADMAP

### Phase 1: Problem + Segment Validation (Weeks 1-3)
**Goal:** Confirm the problem is real AND identify the segment with highest pain.

**Experiments:**
1. Problem interviews (H1.1) - 7 interviews, 3 segments
2. Slack community scan (H1.1)
3. Segment pain ranking (H1.2) - score each segment
4. Consequence mapping (H1.2) - understand impact

**Exit Criteria:**
- ≥5 users mention file chaos unprompted
- One segment averages ≥7/10 pain; others ≤5
- Clear understanding of consequence (lost time, stress, lost revenue)

**If Failed:** Pivot to different problem (e.g., data discovery, compliance) or confirm problem is too small to build on.

---

### Phase 2: Solution + Trust Validation (Weeks 4-5)
**Goal:** Confirm users will trust AI + validate accuracy on real data.

**Experiments:**
1. Concept interviews (H2.1) - show wireframes
2. Prototype A/B (H2.1) - auto vs review-only
3. Real file test (H2.2) - run on 3 users' drives, audit
4. Comprehension test (H2.3) - entropy scoring clarity
5. Scale test (H4.1) - accuracy + performance
6. Load test (H4.2) - infrastructure

**Exit Criteria:**
- ≥70% willing to try if they can review first
- ≥85% classification accuracy on real data
- ≥80% understand entropy scores + what to do
- Response time <5s; cost per user viable

**If Failed:** 
- Low trust → redesign interaction model (more human control, better explanations)
- Low accuracy → refine taxonomy or signal weights
- Poor performance → reconsider architecture (e.g., caching, lightweight scanning)

---

### Phase 3: Engagement + Retention (Weeks 6-7)
**Goal:** Confirm users take action + come back.

**Experiments:**
1. Action interview (H2.3) - will they act on recommendations?
2. Freemium degradation test (H2.4) - do users upgrade?
3. Referral tracking (H3.1) - do users refer peers?
4. Model A/B test (H3.2) - which monetization model converts?
5. Persistence degradation (H4.2) - does offline mode work?

**Key Metrics to Track:**
- % of users who apply at least one recommendation
- % of users who return for a second scan
- % of users who refer
- Churn rate (% inactive after 30 days)
- Upgrade conversion (free → premium)

**Exit Criteria:**
- ≥50% of users apply at least one recommendation
- ≥40% return for second scan
- ≥20% upgrade to premium (or choose any paid model)
- Churn <20% month 1

**If Failed:**
- Low action → entropy scoring isn't motivating; test "done-for-you" mode
- Low return → not sticky enough; add integrations, email reminders
- Low upgrade → value proposition unclear; test different pricing/features

---

### Phase 4: Product-Market Fit Signals (Weeks 8+)
**Goal:** Identify whether you have strong signals for one segment.

**Key Signals (Choose 2-3 that matter for your segment):**

**For Individuals:**
- Net Promoter Score (NPS) ≥40 (strong for consumer)
- 40%+ monthly active use
- ≥30% upgrade conversion
- Organic referrals (≥20% of new users from word-of-mouth)

**For Teams:**
- 60%+ of invited team members accept + use product
- NPS ≥50 (higher bar for B2B)
- ≥25% upgrade (per-user or per-org)
- Customer willingness to introduce you to peers

**For Enterprise:**
- Logo win (first paying customer sign-on)
- 3-month retention ≥80%
- Expansion revenue (additional team sign-ups from existing customer)

**If Strong Signals:** Move to scaling (raise funding, hire, build GTM).

**If Weak Signals:** Iterate:
- A different segment has better fit → switch focus
- Problem is real but solution is wrong → redesign core interaction
- Market is too small → explore adjacent problems (compliance, analytics, integrations)

---

## 6. KEY METRICS BY STAGE

### Problem-Solution Fit Metrics (Weeks 1-5)
| Metric | Target | How to Measure |
|--------|--------|---|
| Problem unprompted mentions | ≥70% of interviews | Interview transcript analysis |
| Classification accuracy | ≥85% | Manual audit of real Drive scans |
| User trust (willingness to try) | ≥70% | Post-concept-interview survey |
| Entropy comprehension | ≥80% understand + know what to do | Comprehension test |
| Response time | <5s p95 | Load test results |
| Cost per user | <20% of revenue forecast | Infrastructure audit |

### Product-Market Fit Metrics (Weeks 6-8+)
| Metric | Target (Individuals) | Target (Teams) | How to Measure |
|--------|---|---|---|
| % applying recommendations | ≥50% | ≥60% | In-app event tracking |
| Return rate (7-day) | ≥40% | ≥50% | Login frequency |
| Churn (30-day) | <20% | <15% | Inactive user tracking |
| Upgrade conversion | ≥30% | ≥25% | Payment funnel |
| NPS | ≥40 | ≥50 | NPS survey (weeks 7-8) |
| Referral rate | ≥20% of new users | ≥30% of new users | Referral source tracking |
| Organic CAC | N/A (bootstrap) | N/A (bootstrap) | Cost of referral vs paid acquisition |

---

## 7. ASSUMPTION MAP (What Could Break)

| Assumption | Risk | Experiment to Test | Mitigation if False |
|---|---|---|---|
| Users experience acute file chaos | Medium | Problem interviews, Slack scan | Pivot to problem (data discovery, backup) or segment (teams/enterprises) |
| One segment has >2x more pain | Medium | Segment pain ranking | Serve multiple segments, complex GTM |
| Users trust AI with file ops | High | Concept test, prototype A/B | Redesign as "human-in-the-loop" tool (audit-only, no moves) |
| Classification accuracy ≥85% | High | Real file test, scale test | Retrain model, simplify taxonomy, or pivot to "analysis-only" product |
| Entropy scores are actionable | Medium | Comprehension test, action interview | Switch to "here's what changed" model (before/after view) |
| Freemium monetization works | Medium | Model A/B, willingness-to-pay | Test per-scan pricing, per-user (teams), or per-month premium |
| Infrastructure costs stay low | Medium | Cost estimate, load test | Optimize scans (batch mode, caching), or move to per-scan pricing |
| Users return after first scan | High | Retention tracking | Add automation (weekly scans), email reminders, or integrations (Slack, calendar) |
| Users will refer product | Medium | Referral tracking | Add referral incentives, or focus on viral loop (team invites) |

---

## 8. Success Definition for Launch

By **end of Week 8**, you should have evidence for AT LEAST ONE of:

1. **Problem Validation:** ≥7 interviews from [SEGMENT] who spontaneously mention file chaos, describe consequence, and express willingness to try a solution
2. **Solution Validation:** ≥3 users run real scans, apply ≥1 recommendation, return for second scan, NPS ≥40
3. **Market Validation:** ≥5 users from [SEGMENT] across 2 different companies/contexts (suggesting generalizability)
4. **Monetization Validation:** ≥1 user upgrades to premium (or indicates strong willingness to pay)

If you have evidence for all 4 by Week 8, you have **strong product-market fit signals** and should scale.

If you have strong evidence for 1-2, you have **directional fit** and should refine before scaling.

If you have weak evidence across all, **pivot or pause** until assumptions change.

---

## 9. Next Steps

1. **This Week:** Schedule 7 problem interviews across your target segments (individuals, teams, enterprises)
2. **Week 1:** Run Slack scan + synthesize interview findings
3. **Week 2:** Rank segments by pain; decide which to pursue
4. **Week 3:** Begin solution interviews (H2.1 - H2.2 experiments)
5. **Week 4-5:** Run technical experiments in parallel (scale test, load test)
6. **Week 6-8:** Monitor key metrics; decide pivot or scale

**Tracking:** Create a simple spreadsheet with:
- Date, Hypothesis, Experiment, Result, Decision
- Use this as your living validation roadmap

---

## References

**Lean Startup Framework:**
- Eric Ries, "The Lean Startup" — build-measure-learn loop
- Steve Blank, "The Four Steps to the Epiphany" — customer development interviews

**Jobs to Be Done:**
- Clayton Christensen, "Competing Against Luck" — understand customer motivation
- "What do customers hire this for?" (not just who uses it)

**Metrics:**
- Sean Ellis, Lean Analytics — retention, churn, NPS, CAC LTV
- David Skok on SaaS metrics — define your "north star"

---

**Document Owner:** You (as Founder)  
**Last Updated:** 2026-06-22  
**Review Cadence:** Weekly (update experiment results, adjust roadmap)