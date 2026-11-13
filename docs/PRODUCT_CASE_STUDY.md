# Indenture — Product Case Study

**AI-powered Deal Intelligence and Operations Platform**

Live application: https://indenture-snowy.vercel.app

---

## 1. Problem Discovery and Business Context

Private-credit origination has an unglamorous operational problem at its front door: deals arrive faster than they can be processed well, and the process for handling them lives in inboxes, spreadsheets and people's heads.

I became interested in this problem by studying how private-credit lenders actually run origination. Deals come in from webforms, broker referrals, conferences and warm outreach. Each one has to be checked against specific lenders' mandates — hard criteria like minimum EBITDA, maximum leverage, allowed geographies and industry exclusions — and then judged qualitatively: does this company actually fit what this lender backs? The answer then has to travel: someone reviews it, someone decides it, and the decision has to land in the CRM with context attached.

None of that is hard individually. But nothing ties it together, and the failure modes are operational: qualified deals sit unnoticed, decisions get made without a record, and nobody can see where the pipeline is stuck.

## 2. Target Users

Indenture is designed for the people who run the deal process rather than the investors making credit calls:

- **Deal operations and business operations roles** who own the pipeline as a system.
- **Origination and investment-operations teams** at private-credit lenders and funds.
- **Founder's Office / Strategy & Operations profiles** who are asked to bring structure and tooling to exactly this kind of workflow.

The design goal was that a non-engineer could open the application and immediately understand what needs their attention — no documentation required.

## 3. The Existing Workflow and Its Friction Points

Mapping the manual workflow exposed five recurring friction points:

1. **Fragmented intake.** Deals arrive in inconsistent shapes and formats, so the first step of every review is reconstructing the facts.
2. **Manual mandate qualification.** Hard criteria are checked by hand, deal by deal — slow, error-prone, and inconsistent between reviewers.
3. **Invisible information gaps.** Deals stall in review because nothing surfaces *what* is missing or *what the next step should be*. The reviewer has to figure out what a deal needs in order to be decidable.
4. **Untracked decisions.** Approvals and judgment calls live in email threads and memory. When someone later asks "why did we pass on this?", the reasoning is gone.
5. **Broken handoffs.** A decided deal that never reaches the CRM is lost work — and until it's noticed, nobody is accountable for noticing.

Each of these became a product requirement rather than a feature idea.

## 4. The Proposed Solution

Indenture structures the workflow into a single operational loop:

**Inbound opportunity → enrichment → mandate evaluation → qualification → human review → decision recording → CRM handoff → pipeline intelligence.**

The key design stance: **automate the structured work, assist the judgment work, and never automate the accountability.** Deterministic mandate checks run first because they're rules, not opinions. An LLM evaluates qualitative fit because that *is* judgment — but it must produce written evidence, name its information gaps, and suggest a next action so a human can evaluate its reasoning. A human then approves or overrides. Nothing routes to CRM without that human decision.

## 5. Product Scope and Prioritization

I deliberately scoped the product around the modules where structure creates the most operational leverage:

- **Deal Operations** — the working queue: workload counts, inline "needs info" and review-age signals, and an inspector that shows evidence, mandate results, gaps and the recommended next action.
- **Pipeline Intelligence** — analytics computed only from data the system actually records: totals, decision distribution, source performance, human decisions.
- **Pipeline Health & Needs Attention First** — bottleneck stats and a prioritized, explained attention queue (failed handoffs → pending handoffs → stale reviews → missing-info HOLDs).
- **Human review with mandatory rationale** on override, feeding an append-only decision history.
- **Enrichment and re-evaluation** — fill the gaps, then re-check eligibility against the fuller picture.
- **CRM handoff** with visible status, record ID and error trail.
- **Scenario Analysis** — test mandate changes against the existing pipeline before committing them.

Features that would have been demo-flashy but operationally decorative — extra dashboards, speculative integrations, elaborate agent architectures — were cut. The product teaches one workflow end-to-end rather than hinting at five.

## 6. Why Human-in-the-Loop Decisions Matter

Credit qualification is a decision process with real consequences, so the design treats AI as a recommendation engine, not a decision-maker:

- The AI's output is a **recommendation with reasoning** — evidence, gaps, next action — not a verdict.
- **Approval confirms; override requires a rationale.** The friction is placed exactly where accountability lives.
- Every state change lands in an **append-only decision history**: initial evaluation, enrichment events, re-evaluations, human decisions, CRM outcomes. Any pipeline outcome can be reconstructed later.
- The **effective decision** is computed at routing time from the human record, so what was decided and what was recorded can't drift apart.

This is the core product thesis: in a process like this, an AI that decides is less useful than an AI that explains, prioritizes, and hands off cleanly — with a human who signs their name on the outcome.

## 7. Pipeline Health and Prioritization Logic

The operations question is never "what is the pipeline?" — it's "what in the pipeline needs me first?" Pipeline Health answers it with figures derived from recorded data and timestamps:

- **Stuck in review (7+ days)** — opportunities where the review itself has become the bottleneck.
- **Awaiting CRM handoff** — decisions made but not yet delivered; work done but not landed.
- **Handoff failures** — routing errors that need a retry.
- **HOLD with missing information** — deals that are decidable the moment someone fills a gap.

The **Needs Attention First** queue then prioritizes by operational impact: broken work (failed handoffs) outranks undelivered work (pending handoffs), which outranks stale reviews, which outrank information-blocked HOLDs — oldest first within each tier, deduplicated, capped at five with an overflow count. Critically, **every item carries the reason it's surfaced**. A prioritized list without explanations is just another opaque queue.

## 8. Product Trade-offs

Decisions I made knowingly, and why:

- **Honest simulation over fake integration.** Without HubSpot credentials, handoffs produce `SIM-` record IDs that the UI labels "Simulated." A demo that pretends to integrate is a liability; a demo that shows its seams demonstrates judgment.
- **Client-computed operational views over new backend services.** Pipeline Health derives from the deal log the frontend already reads — no new endpoints, no new failure modes, and it stays honest because it can't outpace the source data.
- **Few metrics, all real.** The analytics page reports counts the schema supports and nothing else. Estimated conversion rates or fabricated industry benchmarks would poison the credibility of every other number.
- **Enrichment gated behind configuration, with a labeled demo fallback.** The workflow stays demonstrable without API keys, and the interface never blurs which provider produced a given record.
- **A small, strict decision vocabulary.** ADVANCE / HOLD / NURTURE / REJECT — with HOLD ("need more data") deliberately distinct from NURTURE ("not now, maybe later") because conflating them is a real operational failure mode.

## 9. Technical Decisions Supporting the Business Workflow

- **Two-layer evaluation.** Deterministic mandate checks (pure rules) + LLM qualitative fit (structured, validated output with evidence). Rules stay consistent; the model handles judgment and must always explain itself.
- **Writes centralized in the backend; the frontend reads.** All external calls and mutations go through FastAPI, so the audit trail can't be bypassed and provider logic lives in one place.
- **Adapter pattern for every external dependency.** CRM and enrichment are interface-based and environment-gated — swapping or adding a provider is a configuration change, not a rewrite.
- **Supabase for state, append-only history for accountability.** `deal_queue` holds the current pipeline; `deal_history` preserves every transition, immutably, by convention.
- **Env-gated integrations with labeled fallbacks.** Apollo and HubSpot run live with credentials and behave as clearly-labeled demo/simulated paths without — the same code path, honestly presented either way.

## 10. Limitations and Future Opportunities

**Limitations, stated plainly:**

- Live integrations require credentials; without them CRM routing is simulated and enrichment falls back to synthetic demo data.
- The pipeline is single-tenant — no per-user authentication or role-based access yet.
- This is a portfolio product: there is no external customer adoption, revenue, or measured business outcome behind it. The benefits described here are the intended effects of the workflow design, not measured results.

**Future opportunities:**

- **HubSpot production path** — the adapter is implemented; activating it needs a private-app token, confirmed pipeline/stage IDs, and rate-limit handling, followed by two-way stage sync.
- **Clay-style waterfall enrichment** — Apollo first, additional providers behind the same adapter interface; Clay tables could feed qualified companies straight into the existing webhook.
- **Data activation (Hightouch) and workflow automation (Zapier/Make)** — reverse-ETL out of the deal queue and lightweight alerting (e.g., Slack notification on handoff failure) once the workflow earns a place in a real team's day.
- **Multi-user access control** — reviewer identity on decisions, per-role visibility.
