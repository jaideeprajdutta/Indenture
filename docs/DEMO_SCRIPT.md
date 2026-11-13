# Indenture — Demo Script (2–3 minutes)

A founder-style walkthrough of one deal moving through the full workflow. One realistic, sanitized scenario; no code talk.

**Scenario:** *Meridian Diagnostics*, a healthcare-technology company — $18M revenue, referred by a broker — arrives in the pipeline against the **Apollo Credit** mandate.

---

### 1. The business problem (≈20s)

> "Private-credit teams get deals from everywhere — brokers, conferences, webforms. Each one has to be checked against each lender's mandate, judged qualitatively, reviewed by a person, and handed off to the CRM. Today that lives in inboxes and spreadsheets, so deals stall, decisions go untracked, and nobody can see where the pipeline is stuck. Indenture runs that whole workflow as one process — with a human signing off at the decision point."

### 2. An incoming opportunity (≈20s)

**[Screen: Deal Operations]**

> "Here's the live queue. The filter tabs show the actual workload — how many opportunities are awaiting review, approved, rejected. This row is Meridian Diagnostics, referred by a broker, $18M. The 'Needs info' flag tells me right away the AI found a gap in this deal — before I even open it."

### 3. Enrichment and mandate evaluation (≈30s)

**[Screen: Deal Inspector — evidence, mandate checks, missing info, next best action]**

> "Opening it, the mandate checks are deterministic — EBITDA floor, leverage ceiling, geography — hard filters, no model involved. On top of that, the AI evaluated qualitative fit and it wrote down its reasoning: why it leans ADVANCE, what's missing, and the next best action. If I want the full picture, I enrich — company intelligence fills the gaps, then the mandate checks and the evaluation re-run against the fuller data, with a before-and-after comparison."

### 4. The recommendation (≈15s)

> "So the recommendation is ADVANCE with evidence attached — and importantly, it's a recommendation. The system never makes the final call on a credit decision."

### 5. Human approval or override (≈25s)

**[Screen: Review actions → decision history]**

> "I approve it — or, if I disagree, I override, and the override *requires* a written rationale. Either way it's recorded: every evaluation, every enrichment, every human decision sits in an append-only history. If anyone asks six months from now why this deal moved forward, the answer is in the record."

### 6. The CRM handoff (≈20s)

**[Screen: CRM Handoff panel]**

> "The moment a decision is made, it routes to the CRM automatically — the decision maps to a pipeline stage, and the handoff status is visible right on the deal. In this demo environment you'll see a 'Simulated' label on the record — that's deliberate. Without live credentials the system tells you exactly what's real and what isn't. It never fakes an integration."

### 7. Pipeline Health and Needs Attention First (≈25s)

**[Screen: Pipeline Intelligence — Pipeline Health panel]**

> "Now the operations view. Pipeline Health shows where work is stuck: opportunities in review too long, decisions waiting on their CRM handoff, handoff failures, and HOLDs blocked on missing info. And this queue — Needs Attention First — ranks what to handle first, with the reason on every line. It's not just a list; it tells you why each item is urgent."

### 8. Close (≈15s)

> "That's the loop: in, qualified, decided by a human, handed off, and visible end to end. Every number here is computed from the actual pipeline — nothing estimated. Indenture brings operations discipline to a process that usually runs on memory."

---

## Delivery notes

- **Pace:** ~2.5 minutes at a natural clip; drop step 4 into step 3 if it runs long.
- **Data hygiene:** use the sanitized scenario deal; blur or avoid unrelated rows with real-looking company names.
- **If recording without credentials:** let the "Simulated" label show on purpose — the honest seam is part of the story.
- **Backup if live data is thin:** create a fresh opportunity with the "New Opportunity" button on camera (step 2) so the evaluation runs live.
