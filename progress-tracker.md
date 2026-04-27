# PreventHub Progress Tracker

## Purpose
This document tracks:
- what has been completed
- what is verified
- what is planned next
- what is blocked or deferred

It should be updated at each meaningful step of backend or frontend development.

## Project Status Snapshot

Current date:
- 2026-04-27

Overall status:
- Backend foundation: completed and verified
- Infrastructure stability: completed and verified
- Frontend implementation: MVP complete (admin + citizen + analytics baseline + Docker + tests); optional polish (shadcn, dedicated analytics hub, a11y) remains
- Documentation alignment: updated to reflect verified backend contracts
- Detailed frontend phase/evidence: see `front-end-tracker.md`

## Completed Work

### 1. Project foundation
Status:
- completed

Details:
- created root service structure for five FastAPI microservices
- created Dockerfiles for all backend services
- created root `docker-compose.yml`
- added PostgreSQL initialization scripts
- added API gateway configuration

### 2. Infrastructure stabilization
Status:
- completed

Details:
- replaced Traefik with NGINX because Docker provider access was problematic in the Windows environment
- configured NGINX path-based routing to all backend services
- configured Kafka in single-node KRaft mode
- configured PostgreSQL health checks
- fixed startup ordering between PostgreSQL and application services
- prevented premature service startup during Postgres init phase
- verified container health across the full stack

### 3. campaign-service
Status:
- completed and verified

Details:
- implemented campaign creation endpoint
- implemented targeting rule creation endpoint
- implemented campaign launch endpoint
- added schema validation for:
  - `min_age`
  - `max_age`
  - `region`
  - `milieu`
  - `risk_level`
- aligned targeting rule structure with stratification contract

### 4. stratification-service
Status:
- completed and verified

Details:
- implemented stratification endpoint
- added weighted Moroccan demographic data seeding
- increased seed size from mock records to `5000`
- added `numpy`
- implemented SQLAlchemy bulk insertion
- added exact-match filters for:
  - `region`
  - `milieu`
  - `risk_level`
- verified seeded data directly in PostgreSQL

### 5. communication-service
Status:
- completed and verified

Details:
- implemented background Kafka consumer for `audience.generated`
- implemented producer for `message.sent`
- updated log message to:
  - `Sending Moroccan validated message to patient {id}`
- verified service communication through logs

### 6. engagement-service
Status:
- completed and verified

Details:
- implemented `POST /track`
- validated `clicked` and `booked` actions
- published `user.engaged` events
- verified successful event recording during tests

### 7. analytics-service
Status:
- completed and verified

Details:
- implemented dual-topic Kafka consumer
- persisted raw message and raw engagement events
- implemented ROI endpoint
- implemented citizen activity timeline endpoint
- verified conversion rate calculations in end-to-end testing

### 8. Testing and verification
Status:
- completed and verified

Details:
- created and iteratively improved `test.ps1`
- fixed PowerShell JSON request issues
- added gateway health verification
- added contract validation checks
- added asynchronous analytics polling
- added inter-service communication verification
- added direct PostgreSQL seed verification

### 9. Documentation
Status:
- completed and re-aligned to current backend implementation

Details:
- refreshed `specifications.md` to reflect the actual working backend and frontend delivery path
- re-aligned endpoint and readiness statements with implemented contracts from service code and `test.ps1`
- created this detailed progress tracker

### 10. Frontend-readiness backend extensions
Status:
- completed and verified

Details:
- campaign-service now exposes frontend-ready read APIs:
  - `GET /` list campaigns
  - `GET /{id}` campaign detail
  - `GET /active` with optional personalized demographic filters
- communication-service exposes frontend support APIs:
  - `GET /templates`
  - `GET /preferences/{patient_id}`
  - `PUT /preferences/{patient_id}`
- engagement-service exposes frontend convenience aliases:
  - `POST /track/click`
  - `POST /track/adherence`
- analytics-service exposes regional coverage:
  - `GET /coverage/regional?campaign_id={id}`

### 11. Docker build/runtime recovery (2026-04-27)
Status:
- completed and verified

Details:
- fixed frontend Docker build failures in `frontend/src/components/citizen/citizen-dashboard.tsx`:
  - resolved JSX parser error (`className={}`)
  - resolved strict TypeScript issues for activity rendering
- added missing activity client method to frontend API client:
  - `frontend/src/lib/api/client.ts` (`getActivity`)
- repaired corrupted/truncated analytics implementation file:
  - `analytics-service/main.py`
- validated end-to-end container lifecycle:
  - `docker compose build frontend` passed
  - `docker compose build` passed for all services
  - `docker compose up -d` started stack successfully
  - analytics service logs confirmed healthy startup

## Verified Results

### Backend readiness
Status:
- verified

Evidence:
- all service health endpoints pass
- campaign lifecycle works through gateway
- campaign read/list/active endpoints are usable by frontend flows
- targeting rules persist correctly
- stratification returns valid patient matches
- engagement writes succeed
- ROI endpoint returns expected values
- communication templates and preference persistence APIs are available
- regional coverage analytics endpoint returns expected grouped data

### Inter-service communication
Status:
- verified

Evidence:
- stratification publishes audience events
- communication consumes audience events and emits message events
- engagement publishes user engagement events
- analytics consumes downstream events and updates campaign ROI

### Data seeding
Status:
- verified

Evidence:
- patient row count in `stratification_db.patients` is `5000`
- sample rows contain realistic Moroccan combinations
- top region/milieu/risk combinations match expected weighting trends

## Current Gaps Against Original Product Vision

### Backend gaps still open
Status:
- not yet implemented

Items:
- authentication and role-based access control
- citizen feed enrichment beyond rule-based filtering (ranking/prioritization and recommendation logic)

### Frontend gaps
Status:
- MVP complete; optional enhancements remain

Optional / deferred:
- shadcn/ui component library
- dedicated analytics hub route (beyond embedded admin metrics)
- accessibility and visual polish pass
- auth integration (depends on backend RBAC)

Delivered for MVP:
- Next.js App Router scaffold and `/admin`, `/citizen` routes in `frontend/src/app`
- Tailwind, TanStack Query, Recharts, shared API client and hooks (`frontend/src/lib/api/`)
- Dockerized frontend, compose + NGINX integration, `frontend-e2e` profile for Playwright
- Admin: create campaign, list/detail, add rules, launch, audience preview, ROI + regional coverage, per-mutation status, metrics refresh, query invalidation after stratify
- Citizen: profile filters for active campaigns, engagement actions, preference read/update, separate status regions, retries on load failures
- Automated checks: typecheck, lint, unit + RTL integration (8 tests), e2e vs live stack (3 tests) — see `front-end-tracker.md`

Progress now available:
- Next.js app scaffold and route skeleton exist in `frontend/src/app`
- Tailwind setup is active in `frontend/src/app/globals.css`
- TanStack Query provider is wired in `frontend/src/components/providers/query-provider.tsx`
- chart baseline is active with Recharts in `frontend/src/components/admin/admin-dashboard.tsx`
- frontend tracker is available in `front-end-tracker.md`

## Immediate Next Work

### 1. Frontend foundation
Priority:
- completed (baseline)

Plan:
- scaffold, Tailwind, TanStack Query, Recharts, API client, Docker + NGINX integration — done; ongoing only for optional shadcn and refinements

### 2. Admin dashboard MVP
Priority:
- completed (MVP)

Plan:
- create campaign wizard
- add campaign history list and campaign detail views
- targeting rule builder
- launch action
- audience preview screen
- ROI dashboard card and chart section
- regional coverage table/chart section

Status:
- completed; see `frontend/src/components/admin/admin-dashboard.tsx` and admin e2e/RTL tests

### 3. Citizen portal MVP
Priority:
- completed (MVP)

Plan:
- simple patient-facing shell using personalized `GET /campaigns/active` filters
- engagement buttons using `POST /track`, `POST /track/click`, and `POST /track/adherence`
- communication preference UI using read and update preference endpoints

Status:
- completed; profile filters and status UX in `frontend/src/components/citizen/citizen-dashboard.tsx`

### Frontend implementation evidence update
Status:
- verified for current phase

Evidence:
- admin workflow code added in `frontend/src/components/admin/admin-dashboard.tsx`
- mutation and cache invalidation hooks added in `frontend/src/lib/api/hooks.ts`
- admin rule-input mapping utility and tests added:
  - `frontend/src/lib/api/admin-utils.ts`
  - `frontend/src/lib/api/admin-utils.test.ts`
- Docker-based validation passed:
  - typecheck
  - lint
  - unit + RTL integration tests (8 total passing)
- Playwright e2e vs gateway (`docker compose --profile test run --rm frontend-e2e npm run test:e2e`) passed: 3 tests (full stack required)
- frontend browser API requests now use gateway-relative paths (`NEXT_PUBLIC_API_BASE_URL=""` in compose), fixing Docker browser host-resolution issues
- Playwright Docker image and npm package versions are aligned at `1.59.1`
- NGINX route changes require container recreation before e2e runs to avoid stale config behavior

## Proposed Frontend Milestones

### Milestone A
Status:
- completed

Goal:
- project scaffold ready and running locally

Definition of done:
- Next.js app boots
- Tailwind is configured
- base layout renders
- API client points to gateway

Evidence:
- app runs via Docker; API uses gateway-relative paths for browser and compose networking

### Milestone B
Status:
- completed

Goal:
- admin campaign workflow functional

Definition of done:
- user can create campaign
- user can add targeting rule
- user can launch campaign
- user can see audience preview count

Evidence:
- wired in `frontend/src/components/admin/admin-dashboard.tsx`; e2e in `frontend/tests/e2e/integration.spec.ts`

### Milestone C
Status:
- completed

Goal:
- analytics dashboard functional

Definition of done:
- ROI card displays correctly
- chart reflects backend data
- loading and error states handled

Evidence:
- ROI and regional coverage in admin dashboard; refresh + retry; async e2e validates `total_messages` after preview (`frontend/tests/e2e/integration.spec.ts`)

### Milestone D
Status:
- completed

Goal:
- citizen engagement MVP functional

Definition of done:
- patient-facing page renders
- engagement actions call backend
- success/error handling is implemented

Evidence:
- `frontend/src/components/citizen/citizen-dashboard.tsx`; profile filters; preference + engagement in e2e and RTL tests

### Milestone E
Status:
- completed

Goal:
- frontend containerized and integrated into compose

Definition of done:
- multi-stage Dockerfile added
- frontend service added to compose
- application reachable in browser with backend integration

Evidence:
- `frontend/Dockerfile`, `docker-compose.yml`, NGINX routes; `frontend-e2e` service for integration tests

## Working Rules For Updates

When updating this file:
- mark each task as completed, in progress, pending, blocked, or deferred
- add concrete evidence when something is verified
- note mismatches between specification and implementation
- record the next intended step before ending a work session

## Next Update Placeholder

Expected next update:
- after any optional shadcn/a11y work or backend auth/RBAC milestones (see `front-end-tracker.md`)
