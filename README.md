# Indenture

Private Credit Deal Intelligence & Routing Engine.

A deterministic-semantic deal triage system for private credit origination. Combines mandate filtering, LLM qualitative reasoning, human-in-the-loop review, enrichment-driven re-evaluation, and CRM routing with full audit trail.

## Problem

Private credit origination teams receive inbound deals that must be quickly triaged against lender mandates. The process requires:
- **Deterministic mandate checks** (EBITDA, leverage, geography) — hard filters
- **Qualitative reasoning** — LLM evaluates deal fit against lender's qualitative exclusion criteria
- **Human review** — Approve or override AI decisions with rationale
- **Enrichment** — External data (Apollo.io or demo provider) to fill information gaps
- **Re-evaluation** — Updated mandate checks and AI reasoning after enrichment
- **CRM routing** — Final decision routed to CRM (HubSpot/Attio) with audit trail

Indenture automates this workflow end-to-end with a clean audit trail at every step.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16 + React 18)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Triage UI    │  │ Analytics    │  │ Mandate      │          │
│  │ (HITL)       │  │ Dashboard    │  │ Sandbox      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Deal         │  │ Enrichment   │  │ CRM Adapter  │          │
│  │ Evaluation   │  │ (Demo/Apollo)│  │ (HubSpot)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐        ┌──────────┐      ┌──────────┐
   │ Supabase│        │ Groq LLM │      │  CRM     │
   │(Postgres)│        │(gpt-oss) │      │(HubSpot) │
   └─────────┘        └──────────┘      └──────────┘
```

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| API | FastAPI | REST endpoints for deal evaluation, enrichment, CRM routing |
| Database | Supabase (PostgreSQL) | `deal_queue` + `deal_history` tables |
| LLM | Groq (gpt-oss-20b) | Qualitative fit evaluation |
| Enrichment | Demo / Apollo.io | Company data enrichment (revenue, employees, etc.) |
| CRM | HubSpot (simulated) | Deal routing with decision mapping |
| Frontend | Next.js 16 + Tailwind | Triage, Analytics, Mandate Sandbox UIs |

## Core Workflow

### 1. Inbound Deal → Mandate Checks → AI Decision

```
POST /webhook/evaluate-deal        # Webhook from external source
POST /deals/simulate               # Manual simulation (UI)
```

- Deal evaluated against 3 lender mandates (Apollo Credit, Oak Hill, Blue Owl)
- Deterministic checks: EBITDA ≥ min, Leverage ≤ max, Geography ∈ allowed
- LLM evaluates qualitative fit → ADVANCE / HOLD / NURTURE / REJECT
- Results persisted to `deal_queue` with `ai_decision`, `evidence`, `mandate_checks`

### 2. Human Review

```
POST /action/approve               # Human confirms AI decision
POST /action/override              # Human overrides with new decision + reason
```

- **Approve**: Sets `human_status=APPROVED`, `effective_decision = ai_decision`
- **Override**: Sets `human_status=OVERRIDDEN`, `human_decision=X`, `effective_decision=X`
- Both record `HUMAN_APPROVE` / `HUMAN_OVERRIDE` in `deal_history`
- Both route to CRM using the **effective decision**

### 3. Enrichment (On-Demand)

```
POST /deals/{id}/enrich
```

- Fetches deal from DB → calls enrichment provider (Demo or Apollo)
- **Demo**: Deterministic synthetic data (website, revenue, employees, ownership, transaction type)
- **Apollo**: Real company data via domain lookup (requires valid company domain)
- On success:
  - Updates deal with enriched fields
  - **Re-runs mandate checks** with enriched data → stores `mandate_reevaluation` (before/after)
  - **Re-runs AI reasoning** with enriched data → stores `ai_reevaluation` (previous→new decision)
  - Records `ENRICHMENT_COMPLETED` / `ENRICHMENT_FAILED` in history
  - Records `AI_REEVALUATION` in history if decision changes

### 4. CRM Routing

```
POST /deals/{id}/route-to-crm      # Manual trigger (UI)
```

- Called automatically after Approve/Override
- Uses `effective_decision` → `human_decision` → `ai_decision` priority
- HubSpot adapter maps decisions to deal stages
- Records `CRM_ROUTED` / `CRM_ROUTE_FAILED` in history
- Updates `deal_queue` with `crm_status`, `crm_record_id`, `crm_error`

### 5. Audit Trail

```
GET /deal/history?deal_name=X&lender_name=Y
```

Every state change recorded in `deal_history`:
- `AI_DECISION` — initial AI evaluation
- `ENRICHMENT_COMPLETED` / `ENRICHMENT_FAILED`
- `AI_REEVALUATION` — decision change after enrichment
- `HUMAN_APPROVE` — human confirmed AI decision
- `HUMAN_OVERRIDE` — human changed decision
- `CRM_ROUTED` / `CRM_ROUTE_FAILED`

### 6. Analytics

```
GET /analytics
```

Aggregates from `deal_queue`:
- Total deals, decision percentages (ADVANCE/HOLD/NURTURE/REJECT)
- Average deal size
- Deals by source with advance/reject rates
- Source performance table

### 7. Mandate Sandbox

```
POST /mandate-sandbox/simulate
GET /mandate-sandbox/lenders
```

- Simulate mandate changes against existing deals
- Shows: eligible before/after, newly eligible, no longer eligible, unchanged
- Decision distribution for affected deals
- Drill-down tables with mandate check comparisons

## Data Model

### `deal_queue` (key columns)

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `deal_name` | text | Deal identifier |
| `lender_name` | text | Lender mandate applied |
| `deal_size` | numeric | |
| `industry` | text | |
| `geography` | text | |
| `ebitda` | numeric | |
| `leverage` | numeric | |
| `source` | text | simulated/webhook/referral/conference |
| `website` | text | Optional company website for Apollo |
| `ai_decision` | text | ADVANCE/HOLD/NURTURE/REJECT |
| `evidence` | text | AI reasoning |
| `email_draft` | text | Suggested outreach email |
| `missing_info` | text | Gaps identified by AI |
| `next_best_action` | text | Suggested next step |
| `mandate_checks` | jsonb | {ebitda_check, leverage_check, geography_check} |
| `human_status` | text | PENDING/APPROVED/OVERRIDDEN |
| `human_decision` | text | Override decision if any |
| `override_reason` | text | Rationale for override |
| `effective_decision` | text | Final decision used for CRM |
| `enrichment_status` | text | PENDING/ENRICHED/FAILED |
| `enrichment_source` | text | demo/apollo |
| `enrichment_confidence` | numeric | 0–1 |
| `mandate_reevaluation` | jsonb | Before/after mandate comparison |
| `ai_reevaluation` | jsonb | Previous→new AI decision + reasoning |
| `crm_provider` | text | hubspot |
| `crm_status` | text | ROUTED/FAILED |
| `crm_record_id` | text | CRM record ID |
| `crm_error` | text | Error if failed |
| `created_at` | timestamptz | |

### `deal_history`

| Column | Type | Description |
|--------|------|-------------|
| `deal_queue_id` | int FK | References deal_queue |
| `event_type` | text | AI_DECISION, ENRICHMENT_*, AI_REEVALUATION, HUMAN_*, CRM_* |
| `previous_decision` | text | |
| `new_decision` | text | |
| `reason` | text | Human-readable explanation |

## Enrichment Providers

### Demo Provider (default, enabled)
- Deterministic synthetic data based on deal_name + lender_name hash
- Always succeeds with confidence ~0.85–0.95
- Fields: website, revenue, employee_count, ownership_type, transaction_type
- **Use for testing without API keys**

### Apollo.io Provider (optional)
- Requires `APOLLO_ENABLED=true` and `APOLLO_API_KEY`
- Extracts domain from `deal.website` field
- **Strict domain validation** — rejects synthetic/test domains (localhost, test.*, demo.*, fake.*, etc.)
- Returns real company data: revenue, employee_count, website
- On failure: clear error (404 not found, 422 invalid domain, 401 auth, 429 rate limit)
- **Will not fake success** — if no valid domain, returns actionable error

## CRM Integration

### HubSpot Adapter
- Enabled via `HUBSPOT_ENABLED=true` + `HUBSPOT_ACCESS_TOKEN`
- Maps decisions to deal stages:
  - ADVANCE → appointmentscheduled
  - HOLD → qualifiedtobuy
  - NURTURE → presentationscheduled
  - REJECT → closedlost
- Creates deal with custom properties (lender, EBITDA, leverage, etc.)
- **Simulated mode** (default): Returns `SIM-<timestamp>` record ID, no API call

### Attio (legacy)
- Original `push_to_crm` endpoint, kept for reference
- Not used in current workflow

## Decision Semantics

| Decision | Meaning | CRM Stage |
|----------|---------|-----------|
| **ADVANCE** | Strong fit, no issues — move forward | appointmentscheduled |
| **HOLD** | Potentially viable but missing critical info | qualifiedtobuy |
| **NURTURE** | Not suitable now, could become suitable later (too small, early stage) | presentationscheduled |
| **REJECT** | Clearly outside mandate or violates exclusion | closedlost |

**HOLD ≠ NURTURE** — HOLD = "need more data", NURTURE = "not now, maybe later"

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase project (PostgreSQL)
- Groq API key
- Optional: Apollo API key, HubSpot access token

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
python -m uvicorn main:app --reload --port 8000
```

### Database (Supabase)

Run `supabase/schema.sql` in Supabase SQL editor to create:
- `deal_queue` table
- `deal_history` table
- Indexes

### Frontend

```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```

### Environment Variables

**Backend (.env)**
| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for LLM |
| `SUPABASE_URL` | Yes | https://your-project.supabase.co |
| `SUPABASE_KEY` | Yes | Service role or anon key |
| `BACKEND_CORS_ORIGINS` | No | Default: http://localhost:3000 |
| `APOLLO_ENABLED` | No | "true" to enable Apollo |
| `APOLLO_API_KEY` | If Apollo enabled | Apollo.io API key |
| `ENRICHMENT_DEMO_ENABLED` | No | "true" (default) for demo provider |
| `HUBSPOT_ENABLED` | No | "true" to enable HubSpot |
| `HUBSPOT_ACCESS_TOKEN` | If HubSpot enabled | HubSpot private app token |
| `ATTIO_API_KEY` | No | Legacy, not used in current flow |

**Frontend (.env.local)**
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_BACKEND_URL` | No | Default: http://localhost:8000 |

## Demo Instructions

### Quick Start (Demo Mode)
1. Start backend: `cd backend && source venv/bin/activate && python -m uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000

### Simulate a Deal
1. Click **+ Simulate** in Triage
2. Fill: Deal Name, Context (required), optional financials + website
3. Submit → Deal appears in queue with AI decision
4. Click deal to inspect: mandate checks, evidence, email draft, missing info

### Test Enrichment
1. Select a deal → **Enrich Deal**
2. Demo provider: Always succeeds with synthetic data
3. With valid website (e.g., `https://stripe.com`) + Apollo enabled: Real data
4. Observe: Mandate Re-evaluation panel, AI Re-evaluation panel, Decision History

### Human Review
- **Approve & Advance**: Confirms AI decision, routes to CRM
- **Override**: Choose new decision + reason, routes to CRM with overridden decision

### Analytics
- Navigate to `/analytics` — overview + deal log

### Mandate Sandbox
- Navigate to `/sandbox`
- Select lender, modify mandate parameters
- Run simulation → see impact on historical deals

## Known Limitations / Demo Notes

- **Synthetic data**: Simulated deals use generated financials. No real company data unless you provide a valid website + Apollo key.
- **Apollo validation**: Strictly rejects non-real domains. Provide a real company website (e.g., `https://stripe.com`) for Apollo to work.
- **HubSpot**: Runs in simulated mode by default (returns `SIM-` record IDs). Enable with real token for actual CRM writes.
- **No authentication**: This is a demo/internal tool — no auth layer.
- **Single-tenant**: One Supabase project, one set of lenders in `backend/data.json`.
- **LLM model**: Uses Groq's `openai/gpt-oss-20b`. Requires Groq API key.
- **No webhook receiver**: `/webhook/evaluate-deal` reads from static `data.json` for demo purposes.

## Project Structure

```
Indenture/
├── backend/
│   ├── main.py                 # FastAPI routes
│   ├── services.py             # Mandate logic, AI evaluation, CRM push
│   ├── schemas.py              # Pydantic models
│   ├── enrichment_adapter.py   # Demo + Apollo providers
│   ├── crm_adapter.py          # HubSpot adapter
│   ├── data.json               # Lender mandates + sample webhook
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Triage (HITL command center)
│   │   ├── analytics/page.tsx  # Analytics dashboard
│   │   └── sandbox/page.tsx    # Mandate sandbox
│   ├── package.json
│   └── .env.local
├── supabase/
│   └── schema.sql
└── README.md
```

## API Reference

### Deal Evaluation
- `POST /webhook/evaluate-deal` — Process webhook deal (static data)
- `POST /deals/simulate` — Simulate inbound deal (body: SimulateDealRequest)

### Actions
- `POST /action/approve` — Approve deal (body: {deal_name, lender_name})
- `POST /action/override` — Override decision (body: {deal_name, lender_name, human_decision, override_reason})

### Enrichment
- `POST /deals/{id}/enrich` — Enrich deal (body: {deal_name, lender_name})

### CRM
- `POST /deals/{id}/route-to-crm` — Manual CRM routing (body: {deal_name, lender_name})

### Analytics
- `GET /analytics` — Aggregated metrics

### History
- `GET /deal/history?deal_name=X&lender_name=Y` — Audit trail

### Mandate Sandbox
- `GET /mandate-sandbox/lenders` — List lenders
- `POST /mandate-sandbox/simulate` — Simulate mandate changes

## License

MIT