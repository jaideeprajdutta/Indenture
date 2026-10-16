# Indenture Frontend Audit Report

## 1. Frontend App Structure, Routes, Layouts, Shared Components

**Framework:** Next.js 16 (App Router), React 18, TypeScript

**Routes:**
- `/` — Triage Command Center (HITL queue + detail panes)
- `/analytics` — Analytics Dashboard (Overview + Deal Log tabs)
- `/sandbox` — Mandate Sandbox (simulate mandate changes)

**Layout:** Single root layout (`app/layout.tsx`) with Geist Sans/Mono fonts, globals.css, no shared layout components.

**Shared Components:** None extracted — all UI is inline in the three page.tsx files. Repeated patterns:
- `getDecisionConfig()` — decision badge styling (copied in all 3 pages)
- `formatCurrency()` — currency formatting (copied in 2 pages)
- Header chrome (logo, status pills, navigation) — duplicated across pages
- Modal patterns (override, simulate) — inline in page.tsx

**State Management:** React `useState`/`useCallback` only. No Zustand, Redux, Context. Server state fetched via Supabase client (direct) and `fetch()` to FastAPI backend.

---

## 2. Main Deal Triage Page (`app/page.tsx`)

**Structure:** Single massive component (~1000 lines) with two-pane split view:
- **Left pane (col-span-4):** Deal queue list, filter tabs (PENDING/ALL/APPROVED/REJECTED), skeleton loaders
- **Right pane (col-span-8):** Selected deal inspector with sections:
  - Deal header (name, lender, size, source, geo, industry, website link)
  - AI Decision badge
  - Mandate Checks (3 pills: EBITDA/Leverage/Geography pass/fail)
  - AI Evidence (monospace block)
  - Missing Information (amber alert box)
  - Next Best Action (blue info box)
  - Email Draft (monospace block)
  - Action buttons: Override, Route to CRM, Enrich Deal, Approve & Advance
  - Human Status display (when not PENDING)
  - CRM Routing status panel
  - Enrichment Status panel (with enriched fields grid)
  - Mandate Re-evaluation panel (before/after comparison)

**Interactions & API Calls:**
| Action | Endpoint | Method | Notes |
|--------|----------|--------|-------|
| Load queue | Supabase `deal_queue` select | Direct | Ordered by `created_at` desc |
| Select deal | — | Local state | Triggers `fetchHistory` |
| Fetch history | `/deal/history` | GET | Backend proxy |
| Approve | `/action/approve` | POST | `{deal_name, lender_name}` |
| Override | `/action/override` | POST | `{deal_name, lender_name, human_decision, override_reason}` |
| Route to CRM | `/deals/{id}/route-to-crm` | POST | Manual trigger |
| Enrich deal | `/deals/{id}/enrich` | POST | Triggers mandate re-eval + AI re-eval |
| Simulate deal | `/deals/simulate` | POST | Opens modal, creates new deals |

**Decision Workflow:**
1. Deal enters queue with `human_status=PENDING`, `ai_decision` from LLM
2. Human clicks deal → inspects evidence, mandate checks, missing info
3. **Approve** → `human_status=APPROVED`, `effective_decision=ai_decision`, routes to CRM
4. **Override** → modal for new decision + reason → `human_status=OVERRIDDEN`, `effective_decision=human_decision`, routes to CRM
5. **Enrich** → optional, adds external data, re-runs mandates + AI, shows before/after

**Optimistic Updates:** `handleOptimisticAction` removes deal from local queue immediately on approve/override, refetches on failure.

---

## 3. Analytics Page (`app/analytics/page.tsx`)

**Two tabs:**
- **Overview:** 6 metric cards, decision distribution bars, deals-by-source bars, source performance table
- **Deal Log:** Full table of all deals with decision badge, size, source, human_status, date

**Data Sources:**
- `/analytics` endpoint (aggregated metrics)
- Supabase `deal_queue` select (deal log table)

**Components:** Inline `MetricCard` component, duplicated `getDecisionConfig`, `formatCurrency`.

---

## 4. Mandate Sandbox Page (`app/sandbox/page.tsx`)

**Flow:**
1. Select lender from dropdown (fetches `/mandate-sandbox/lenders`)
2. Current mandate displayed read-only
3. Simulated mandate controls: min_ebitda, max_leverage, geography, min_deal_size, allowed_industry
4. Run Simulation → POST `/mandate-sandbox/simulate`
5. Results: 5 summary cards, decision distribution grid, 4 collapsible detail tables (newly eligible, no longer eligible, unchanged eligible, unchanged ineligible)

**Components:** Inline `SummaryCard`, `DealDetailSection` (with expandable table), duplicated `getDecisionConfig`, `formatCurrency`.

---

## 5. All Existing Interactions, API Calls, Supabase Queries, State Management

### Supabase Queries (Direct from Frontend)
```typescript
// page.tsx
supabase.from("deal_queue").select("*").order("created_at", { ascending: false })
supabase.from("deal_queue").update({ human_status }).eq("id", id)  // optimistic

// analytics/page.tsx  
supabase.from("deal_queue").select("*").order("created_at", { ascending: false })
```

### Backend API Calls (fetch to FastAPI)
| Endpoint | Page | Purpose |
|----------|------|---------|
| `/deal/history` | Triage | Audit trail for selected deal |
| `/action/approve` | Triage | Human confirms AI decision |
| `/action/override` | Triage | Human overrides with new decision |
| `/deals/{id}/route-to-crm` | Triage | Manual CRM routing |
| `/deals/{id}/enrich` | Triage | Enrichment + re-evaluation |
| `/deals/simulate` | Triage | Create simulated deal |
| `/analytics` | Analytics | Aggregated metrics |
| `/mandate-sandbox/lenders` | Sandbox | List lenders for dropdown |
| `/mandate-sandbox/simulate` | Sandbox | Simulate mandate changes |

### State Management
- **Local only:** `useState` for all UI state (queue, selected deal, filters, modals, loading, errors)
- **No global store:** No Context, Zustand, Redux, TanStack Query
- **No caching:** Refetches on every relevant action
- **Optimistic UI:** Only for approve/override (removes from queue immediately)

### Decision Workflow (Verified)
```
Deal Created (AI_DECISION) 
  → [Human Review] 
    → APPROVE: human_status=APPROVED, effective=ai_decision → CRM_ROUTED
    → OVERRIDE: human_status=OVERRIDDEN, effective=human_decision → CRM_ROUTED
  → [Optional Enrich] 
    → ENRICHMENT_COMPLETED → mandate_reevaluation + ai_reevaluation → AI_REEVALUATION (if changed)
  → [Manual CRM Route] → CRM_ROUTED/FAILED
```

---

## 6. Current CSS/Tailwind Setup, Breakpoints, Global Styles, Responsive Behavior

**Tailwind Config (`tailwind.config.ts`):**
- Minimal config — only CSS variable mapping for `background`/`foreground`
- No custom colors, spacing, typography, breakpoints
- Uses default Tailwind breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`

**Globals CSS (`app/globals.css`):**
- Only base Tailwind imports + CSS variables for light/dark (unused — app forces dark via hardcoded classes)
- Body uses system font stack, overridden by Geist in layout

**Responsive Behavior (Current):**
| Page | Desktop (≥1024px) | Tablet (768-1023px) | Mobile (<768px) |
|------|-------------------|---------------------|-----------------|
| Triage | 4/12 + 8/12 split | Same (col-span-4/8) | **Broken** — both panes visible, horizontal scroll |
| Analytics | 6/3/2 col grids | Stacks to 2/1 cols | Stacks to 1 col, tables scroll horizontally |
| Sandbox | 2-col mandate controls | Stacks to 1 col | Stacks, tables scroll horizontally |

**Design System Issues:**
- Hardcoded dark theme colors: `bg-[#07080B]`, `bg-[#0B0C10]`, `bg-zinc-900/50`, `border-zinc-800`
- Excessive `font-mono` usage (deal names, sizes, metadata, evidence, email drafts)
- Repeated bordered panels: `bg-zinc-900/50 border border-zinc-800` everywhere
- Weak hierarchy: all sections same visual weight
- No design tokens for spacing, radii, shadows, transitions

---

## 7. Existing Tests and Production Build Commands

**Tests:** **None found.** No `__tests__`, `*.test.ts`, `*.spec.ts`, Cypress, Playwright, or Vitest config.

**Build Commands (from `package.json`):**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint ."
}
```

**Lint Config:** `eslint.config.mjs` (flat config) + `.eslintrc.json` (legacy) — both present.

---

## 8. Exact Files to Change Per Phase

### Phase 1: Design System Foundation (No Functional Changes)
| File | Change |
|------|--------|
| `frontend/tailwind.config.ts` | Add design tokens: colors (semantic), spacing scale, radii, shadows, transitions, breakpoints |
| `frontend/app/globals.css` | Add CSS custom properties for theme, `@layer base/components/utilities`, reset mono usage |
| `frontend/app/layout.tsx` | Add layout wrapper component for shared header/chrome |

### Phase 2: Shared Component Extraction
| File | Change |
|------|--------|
| `frontend/components/ui/` (new) | Create: `Button`, `Badge`, `Card`, `Panel`, `Table`, `Modal`, `Select`, `Input`, `Textarea`, `Tabs`, `Skeleton`, `Tooltip` |
| `frontend/components/layout/` (new) | Create: `PageHeader`, `PageShell`, `SplitPane` (responsive) |
| `frontend/components/triage/` (new) | Create: `DealQueue`, `DealQueueRow`, `DealInspector`, `MandateChecks`, `EvidenceBlock`, `MissingInfo`, `NextAction`, `EmailDraft`, `ActionBar`, `StatusDisplay`, `CRMPanel`, `EnrichmentPanel`, `MandateReevalPanel` |
| `frontend/components/analytics/` (new) | Create: `MetricCard`, `DecisionBars`, `SourceBars`, `SourceTable`, `DealLogTable` |
| `frontend/components/sandbox/` (new) | Create: `LenderSelector`, `MandateControls`, `SummaryCards`, `DecisionDistribution`, `DealDetailSection` |
| `frontend/lib/` (new) | `utils.ts` (formatCurrency, getDecisionConfig, cn), `hooks/` (useDeals, useHistory, useSimulation) |

### Phase 3: Triage Page Redesign (Desktop-First)
| File | Change |
|------|--------|
| `frontend/app/page.tsx` | Refactor to use shared components, implement new information hierarchy, fix queue row density, reduce mono usage, improve detail pane space utilization |
| `frontend/components/triage/SplitPane.tsx` | Desktop: 320px queue / 1fr detail. Tablet: collapsible drawer. Mobile: bottom sheet |

### Phase 4: Analytics Page Redesign
| File | Change |
|------|--------|
| `frontend/app/analytics/page.tsx` | Refactor to shared components, improve metric card density, add sparklines, fix table responsiveness |

### Phase 5: Sandbox Page Redesign
| File | Change |
|------|--------|
| `frontend/app/sandbox/page.tsx` | Refactor to shared components, improve form layout, enhance results visualization |

### Phase 6: Mobile Adaptation (Responsive Split-Pane)
| File | Change |
|------|--------|
| `frontend/components/layout/SplitPane.tsx` | Implement: Mobile queue as full-screen list → tap opens bottom sheet detail. Tablet: off-canvas drawer. |
| `frontend/components/triage/DealQueue.tsx` | Mobile: compact rows, swipe actions |
| `frontend/components/triage/DealInspector.tsx` | Mobile: bottom sheet with scrollable sections, sticky action bar |

### Phase 7: Verification & Polish
| File | Change |
|------|--------|
| All page files | Run lint, typecheck, build. Verify all workflows: simulate→queue→select→approve/override→enrich→CRM→history→analytics→sandbox |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing API contracts | Low | High | No backend changes; verify payload shapes match exactly |
| Losing optimistic update behavior | Medium | Medium | Preserve `handleOptimisticAction` pattern in new components |
| Mobile split-pane UX regression | Medium | High | Test on real devices; implement progressive enhancement |
| Mono font removal breaks evidence/email readability | Low | Medium | Keep mono only for evidence, email draft, code-like data |
| Supabase real-time not used (polling only) | N/A | Low | Current architecture is pull-based; no regression risk |
| No tests to catch regressions | High | High | Manual verification checklist per workflow; consider adding Playwright in follow-up |

---

## Verification Strategy

**Per-Phase Manual Verification Checklist:**

### Phase 1-2 (Foundation + Components)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] All 3 pages render without console errors
- [ ] Design tokens apply correctly (inspect computed styles)

### Phase 3 (Triage Desktop)
- [ ] Queue loads, filters work (PENDING/ALL/APPROVED/REJECTED)
- [ ] Click deal → detail pane populates all sections
- [ ] Mandate checks show correct pass/fail
- [ ] Override modal opens, submits, updates queue
- [ ] Approve button works, deal removed from queue
- [ ] Enrich Deal triggers re-evaluation panels
- [ ] Route to CRM works (simulated mode)
- [ ] History panel loads on deal select
- [ ] Simulate Deal modal creates new deal in queue

### Phase 4 (Analytics)
- [ ] Overview tab: metrics, bars, source table render
- [ ] Deal Log tab: table sortable, pagination not needed yet
- [ ] Decision badges match triage page styling

### Phase 5 (Sandbox)
- [ ] Lender dropdown loads
- [ ] Current mandate displays
- [ ] Form inputs update simulated mandate
- [ ] Run Simulation shows results
- [ ] Summary cards correct counts
- [ ] Detail tables expand/collapse, show check comparisons

### Phase 6 (Mobile)
- [ ] Triage: Queue full-width, tap opens bottom sheet detail
- [ ] Detail: scrollable, sticky action bar at bottom
- [ ] Analytics: tables horizontal scroll, cards stack
- [ ] Sandbox: forms stack, tables horizontal scroll
- [ ] Viewport 375px, 768px, 1024px, 1440px all functional

### Phase 7 (Full Regression)
- [ ] Complete workflow: Simulate → Select → Inspect → Override → Approve → Enrich → CRM → History → Analytics → Sandbox
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings
- [ ] Production build succeeds (`npm run build`)
- [ ] Visual parity check against design direction (dark institutional, refined hierarchy)