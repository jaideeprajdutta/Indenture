# Screenshot Checklist — Indenture Portfolio

Eight captures cover the product story. Capture at 1440×900 (or 1920×1080) with real pipeline data, and blur or crop any rows you don't want shown. **No screenshots are fabricated here** — capture each one manually or with browser tooling against a running instance.

## Required captures

### 1. Deal Operations overview
- **Where:** `/` (Deal Ops tab)
- **Show:** queue with several opportunities, filter pills with workload counts ("Awaiting Review" count visible), one row selected
- **Highlight:** "Needs info" and "In review Nd" signals on rows; the "New Opportunity" / "Refresh" actions

### 2. Deal Inspector
- **Where:** `/`, right pane with a PENDING deal selected
- **Show:** deal header (lender, size, source), AI decision badge with evidence, mandate check results, missing info, next best action
- **Highlight:** the written evidence — it's the "AI explains itself" moment

### 3. Human Review
- **Where:** `/`, Deal Inspector review actions
- **Show:** the approve action; for override, the decision select + mandatory rationale field
- **Highlight:** override requires a reason — capture the open form if possible

### 4. Pipeline Intelligence
- **Where:** `/analytics`
- **Show:** metric row (Total Opportunities, Awaiting Review, Qualified (ADVANCE), Rejected, Human Decisions, Avg Deal Size), Decision Distribution, Opportunities by Source
- **Highlight:** every number traces to the pipeline — no estimated metrics anywhere

### 5. Pipeline Health
- **Where:** `/analytics`, Pipeline Overview tab, "Pipeline Health" panel
- **Show:** the four mini-stats (stuck in review 7d+, awaiting CRM handoff, handoff failures, HOLD — info missing)
- **Best with:** at least one genuinely stuck or failed deal in the data so the stats are non-zero

### 6. Needs Attention First
- **Where:** `/analytics`, bottom of the Pipeline Health panel
- **Show:** the prioritized list with severity dots and a reason line per item
- **Best with:** a mix of severities so the ranking logic is visible

### 7. Scenario Analysis
- **Where:** `/sandbox`
- **Show:** lender selector, mandate form (Min EBITDA, Max Leverage, Geography), before/after eligibility summary after running a scenario
- **Best with:** a run that produces at least one newly-eligible and one no-longer-eligible deal

### 8. CRM Handoff
- **Where:** `/`, Deal Inspector of a decided deal with a routing outcome
- **Show:** provider, status, record ID, routed timestamp
- **Honesty note:** capture the "Simulated" label on a `SIM-` record if working without HubSpot credentials — label it in the portfolio as deliberate honesty, not a defect

## Manual capture instructions (if browser automation is unavailable)

1. Start the backend (`cd backend; python -m uvicorn main:app --reload --port 8000`) and frontend (`cd frontend; npm run dev` → http://localhost:3000).
2. Seed or confirm realistic pipeline data: a few pending deals (at least one with missing info and one older than 7 days), one approved deal routed to CRM, and at least one CRM failure if possible.
3. Open the app in a full-width browser window at 1440×900.
4. For each capture above: navigate, arrange the view, press `Win + Shift + S` (Windows) or `⌘⇧4` (macOS), capture the relevant region, and save as `docs/screenshots/<number>-<name>.png` (e.g. `1-deal-operations.png`).
5. Scroll capture tips: for the full analytics page, take two captures (metrics + Pipeline Health) rather than one tall stitched image — cleaner for portfolio slides.
6. Review each capture for stray personal data (lender names, emails) before publishing.

## Placement map

| Screenshot | Used in |
|------------|---------|
| 1, 2, 5, 6 | README hero section / portfolio gallery |
| 3, 8 | Product case study (human oversight, handoffs) |
| 4 | Analytics section of any write-up |
| 7 | Scenario analysis section / demo video B-roll |
