# PreventHub Frontend Tracker

## Purpose
This document tracks:
- frontend implementation progress by phase
- testing coverage and verification evidence
- blockers and deferred items
- immediate next actions

It should be updated at each meaningful frontend step.

Cross-reference:
- High-level project status and backend milestones: `progress-tracker.md`

## Project Status Snapshot

Current date:
- 2026-04-24

Overall status:
- Frontend foundation: completed
- Admin dashboard MVP: completed (MVP + mutation UX + analytics refresh)
- Citizen portal MVP: completed (MVP + profile filters + status regions)
- Analytics hub: completed (baseline in admin; optional dedicated hub deferred)
- Frontend testing pipeline: completed (unit + RTL integration + Playwright e2e)
- Frontend containerization: completed

## Backend Contract Baseline (Verified)

Gateway base URL:
- `http://localhost:8000`

Contracts available now:
- Campaigns:
  - `POST /api/campaigns/`
  - `GET /api/campaigns/`
  - `GET /api/campaigns/{id}`
  - `GET /api/campaigns/active`
  - `POST /api/campaigns/{id}/rules`
  - `POST /api/campaigns/{id}/launch`
- Stratification:
  - `POST /api/stratify/stratify/{campaign_id}`
- Engagement:
  - `POST /api/engagement/track`
  - `POST /api/engagement/track/click`
  - `POST /api/engagement/track/adherence`
- Communication:
  - `GET /api/communication/templates`
  - `GET /api/communication/preferences/{patient_id}`
  - `PUT /api/communication/preferences/{patient_id}`
- Analytics:
  - `GET /api/analytics/roi/{campaign_id}`
  - `GET /api/analytics/coverage/regional?campaign_id={id}`

## Phase Plan

### Phase A - Foundation and Tooling
Status:
- completed

Goal:
- establish frontend baseline architecture and test toolchain

Scope:
- scaffold Next.js App Router project
- configure Tailwind, TanStack Query, Recharts
- create shared API client and typed schemas
- establish route skeleton for `/admin` and `/citizen`
- create global layout and navigation shell

Testing in phase:
- configure `vitest`, `@testing-library/react`, and `playwright`
- add smoke tests:
  - app shell renders
  - query client provider mounts
  - base route navigation works

Definition of done:
- app runs in Docker
- shared API client is wired to gateway
- base UI shell is responsive
- baseline tests are scaffolded

Evidence:
- frontend scaffold and Dockerfile created in `frontend/`
- compose and nginx routing updated to include frontend service
- initial unit and e2e smoke tests added
- dependency/tooling setup expanded in `frontend/package.json` (TanStack Query, Recharts, Vitest, Playwright)
- query provider and API hooks added in `frontend/src/components/providers/query-provider.tsx` and `frontend/src/lib/api/hooks.ts`
- admin and citizen data-driven baseline components added in:
  - `frontend/src/components/admin/admin-dashboard.tsx`
  - `frontend/src/components/citizen/citizen-dashboard.tsx`
- Docker verification performed:
  - `docker compose build frontend` succeeded
  - `docker build --target tester -t preventhub-frontend-tester ./frontend` succeeded
  - `docker run --rm preventhub-frontend-tester npm run typecheck` passed
  - `docker run --rm preventhub-frontend-tester npm run lint` passed
  - `docker run --rm preventhub-frontend-tester npm run test` passed (4 tests; see Current automated test status below for latest counts)

### Phase B - Shared Data Layer and States
Status:
- completed

Goal:
- standardize data fetching and UX states across features

Progress evidence:
- typed API client and TanStack Query hooks for all MVP gateway endpoints in `frontend/src/lib/api/client.ts` and `frontend/src/lib/api/hooks.ts`
- citizen dashboard: separate success/error status for engagement vs preferences; list/active retry affordances (`frontend/src/components/citizen/citizen-dashboard.tsx`)
- admin dashboard: per-mutation success/error status lines, campaign list/detail/ROI/regional retry, manual metrics refresh (`frontend/src/components/admin/admin-dashboard.tsx`)
- stratify mutation invalidates ROI and regional queries; preference updates invalidate preference query (`frontend/src/lib/api/hooks.ts`)

### Phase C - Admin Dashboard MVP
Status:
- completed

Goal:
- deliver core admin campaign and audience workflow

Progress evidence:
- admin workflow now includes create/select/detail interactions in `frontend/src/components/admin/admin-dashboard.tsx`
- targeting rule builder now supports rule submission with validated literals in `frontend/src/components/admin/admin-dashboard.tsx`
- launch campaign action is wired to backend mutation in `frontend/src/lib/api/hooks.ts`
- audience preview action is wired to stratification endpoint and uses campaign rules
- query invalidation is now handled for campaign and active campaign keys after mutations
- e2e backend integration test covers admin create -> add rule -> launch -> preview flow in `frontend/tests/e2e/integration.spec.ts`
- RTL integration tests with mocked `api`: `frontend/src/components/admin/admin-dashboard.test.tsx`

### Phase D - Analytics Hub
Status:
- completed (embedded in admin)

Goal:
- expose ROI and regional coverage insights

Progress evidence:
- admin dashboard loads ROI and regional coverage for the selected campaign via `useRoi` and `useRegionalCoverage` in `frontend/src/components/admin/admin-dashboard.tsx`
- empty, loading, and error states for ROI and regional blocks; `data-testid` targets for e2e (`roi-total-messages`, `regional-chart`, `refresh-analytics-button`)
- e2e `admin analytics reflect async pipeline after audience preview` polls metrics until `total_messages > 0`, then asserts regional chart in `frontend/tests/e2e/integration.spec.ts`

Deferred (optional):
- standalone analytics route or richer reporting beyond current cards/chart

### Phase E - Citizen Portal MVP
Status:
- completed

Goal:
- deliver citizen-facing discovery, engagement, and preference flows

Progress evidence:
- profile filters (age, region, milieu, risk) drive `GET /active` via `useActiveCampaigns` (`frontend/src/components/citizen/citizen-dashboard.tsx`)
- engagement and preference flows with dedicated status regions and e2e coverage in `frontend/tests/e2e/integration.spec.ts`
- RTL integration tests: `frontend/src/components/citizen/citizen-dashboard.test.tsx`

### Phase F - Hardening and Delivery
Status:
- in progress

Goal:
- finalize release quality, Docker integration, and regression coverage

Scope note:
- Docker integration, e2e profile, unit + integration tests are in place; optional follow-ups: accessibility audit, visual polish, shadcn/ui if desired

Progress evidence (latest):
- productized language pass applied to home/admin/citizen entry pages:
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/admin/page.tsx`
  - `frontend/src/app/citizen/page.tsx`
- admin analytics monitoring improved with operational sync behavior in `frontend/src/components/admin/admin-dashboard.tsx`:
  - post-preview auto-sync loop (5s interval, max attempts)
  - manual refresh status messaging
  - last-updated timestamp and auto-sync state indicator
- citizen action hardening added in `frontend/src/components/citizen/citizen-dashboard.tsx`:
  - positive patient-id guards before engagement/preference mutations
  - clearer inline invalid-id alert and backend-safe mutation blocking
- tests updated for new UX contract:
  - `frontend/src/app/page.test.tsx`
  - `frontend/src/components/citizen/citizen-dashboard.test.tsx`

Progress evidence (this execution slice):
- shared UI primitives introduced for consistency and maintainability:
  - `frontend/src/components/ui/status-message.tsx`
  - `frontend/src/components/ui/metric-card.tsx`
- admin and citizen dashboards now consume shared primitives:
  - status rendering moved to shared `StatusMessage`
  - ROI metric cards moved to shared `MetricCard`
- regression coverage expanded for backend failure/retry UX:
  - admin campaigns fetch error + retry test in `frontend/src/components/admin/admin-dashboard.test.tsx`
  - citizen active-campaigns fetch error + retry test in `frontend/src/components/citizen/citizen-dashboard.test.tsx`

Progress evidence (latest execution slice):
- analytics regression tests expanded for backend retry behavior in `frontend/src/components/admin/admin-dashboard.test.tsx`:
  - ROI fetch failure + retry + recovery assertion
  - regional coverage fetch failure + retry + chart recovery assertion
- accessibility improvements applied in form controls:
  - admin campaign name input now includes `aria-label`, `aria-invalid`, and `aria-describedby`
  - admin rule age range validation now exposes alert text and invalid field semantics
  - citizen patient id input now exposes invalid state via ARIA and linked helper text
  - files:
    - `frontend/src/components/admin/admin-dashboard.tsx`
    - `frontend/src/components/citizen/citizen-dashboard.tsx`

## Testing Matrix

Unit tests:
- API helpers and validation utilities
- data transforms and UI utility functions

Current automated test status:
- `docker run --rm preventhub-frontend-tester npm run typecheck` passed
- `docker run --rm preventhub-frontend-tester npm run lint` passed
- `docker run --rm preventhub-frontend-tester npm run test` passed (13 tests: utilities + admin/citizen RTL integration + analytics and failure/retry regressions)
- `docker compose --profile test run --rm frontend-e2e npm run test:e2e` passed (3 tests: admin workflow, admin analytics async, citizen flows; requires full stack up)

Latest execution note:
- after UI/test updates, e2e required rebuilding `frontend-e2e` image before re-run; post-rebuild Playwright passed all 3 tests.
- NGINX was force-recreated before e2e to ensure gateway routing remained current.

Verification note:
- React unit tests emit a known Recharts container-size warning in jsdom when validating chart render presence; this does not affect runtime Docker/e2e behavior.

Integration tests:
- query hooks with mocked responses
- form and mutation flows per feature

E2E tests:
- admin campaign lifecycle smoke
- admin ROI/regional smoke after audience preview (async Kafka path)
- citizen engagement and preference smoke

Docker integration test pipeline:
- `frontend-e2e` service added in `docker-compose.yml` with Playwright image target
- Playwright base URL for integration tests uses internal network route: `http://nginx:8000`
- frontend runtime API base switched to relative path to avoid host resolution issues in browser containers
- Playwright image/version alignment is locked:
  - Docker e2e stage uses `mcr.microsoft.com/playwright:v1.59.1-jammy` (`frontend/Dockerfile`)
  - npm package uses `@playwright/test` `1.59.1` (`frontend/package.json`)

## Current Blockers / Risks

Open blockers:
- none currently

Risks to monitor:
- backend contract drift during frontend build
- async analytics propagation timing in e2e tests
- stale NGINX container config after routing changes (mitigation: recreate nginx container in CI and local test runs)

Observed note:
- if NGINX config changes (especially frontend `/` proxy path), recreate container before running e2e to avoid stale 404 behavior.

## Immediate Next Actions

1. Optional: adopt shadcn/ui for consistent form controls and dialogs.
2. Optional: dedicated `/analytics` route or drill-down views if product scope expands.
3. Phase F: accessibility pass (labels, focus order), keyboard navigation checks, and additional failure/retry regression scenarios around analytics fetch failures.

## Update Rules

When updating this file:
- set each phase status to `pending`, `in_progress`, `completed`, `blocked`, or `deferred`
- add concrete evidence for completed items
- record any contract mismatch with service code
- record the next intended step before ending the session
