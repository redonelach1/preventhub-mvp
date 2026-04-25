# Project Specification: PreventHub

## 1. Project Overview
PreventHub is a public health platform designed to propose, manage, and evaluate targeted prevention campaigns such as vaccination, screening, and lifestyle improvement programs using demographic and epidemiological targeting rules.

The project follows an event-driven microservices architecture and is split into:
- a backend platform composed of FastAPI microservices, PostgreSQL, Kafka, and an API gateway
- a frontend application that will expose two portals:
  - a public health admin dashboard
  - a citizen/patient portal

This document reflects the current implementation target and the verified backend behavior in the workspace.

## 2. Current Architecture

### 2.1 Core Stack
- API Gateway: NGINX
- Backend Framework: FastAPI with Python 3.11
- Databases: PostgreSQL
- Message Broker: Apache Kafka in single-node KRaft mode
- ORM: SQLAlchemy
- PostgreSQL Driver: psycopg2-binary
- Kafka Client: confluent-kafka
- Containerization: Docker and Docker Compose

### 2.2 Service Topology
- `frontend`
- `frontend-e2e` (test profile)
- `campaign-service`
- `stratification-service`
- `communication-service`
- `engagement-service`
- `analytics-service`
- `postgres`
- `kafka`
- `nginx`

### 2.3 Gateway Routing
The current gateway routes frontend and test traffic through:
- `/api/campaigns` -> `campaign-service`
- `/api/stratify` -> `stratification-service`
- `/api/communication` -> `communication-service`
- `/api/engagement` -> `engagement-service`
- `/api/analytics` -> `analytics-service`
- `/` -> `frontend`

Note:
- The original vision referenced `/api/v1/...`.
- The currently implemented and verified gateway contract is the route set above.
- The frontend should initially integrate with the current route structure unless/until a versioned gateway path is added.

## 3. Backend Specification

### 3.1 campaign-service
Role:
- synchronous campaign creation, targeting rule management, and campaign discovery APIs

Port:
- `8001`

Models:
- `Campaign`
  - `id`
  - `name`
  - `status`
- `TargetingRule`
  - `id`
  - `campaign_id`
  - `min_age`
  - `max_age`
  - `region`
  - `milieu`
  - `risk_level`

Endpoints:
- `POST /`
  - create a campaign
- `GET /`
  - list campaigns
  - optional query: `status_filter`
- `GET /active`
  - list active campaigns
  - optional personalization query: `age`, `region`, `milieu`, `risk_level`
- `GET /{id}`
  - retrieve campaign detail including targeting rules
- `POST /{id}/rules`
  - add one targeting rule to a campaign
- `POST /{id}/launch`
  - change campaign status to `ACTIVE`
- `GET /health`

Current validation contract:
- `region` must match one of the supported Moroccan regions
- `milieu` must be `Urbain` or `Rural`
- `risk_level` must be `Low`, `Medium`, or `High`

### 3.2 stratification-service
Role:
- synchronous filtering
- Kafka event producer
- demographic data seeding

Port:
- `8002`

Dependencies:
- includes `numpy` for high-volume deterministic seed generation

Models:
- `Patient`
  - `id`
  - `age`
  - `region`
  - `milieu`
  - `risk_level`

Seeding behavior:
- on lifespan startup, the service checks whether the `Patient` table is empty
- if empty, it seeds `5000` Moroccan patients
- generation uses weighted random distributions for:
  - region
  - age groups
  - milieu
  - risk level
- insert strategy uses SQLAlchemy bulk insertion for performance

Reference seed distributions:
- `REGIONS`
  - `Casablanca-Settat`
  - `Rabat-Salé-Kénitra`
  - `Marrakech-Safi`
  - `Fès-Meknès`
  - `Tanger-Tétouan-Al Hoceima`
  - `Souss-Massa`
  - `Béni Mellal-Khénifra`
  - `L'Oriental`
  - `Drâa-Tafilalet`
  - `Guelmim-Oued Noun`
  - `Laâyoune-Sakia El Hamra`
  - `Dakhla-Oued Ed-Dahab`
- `REGION_WEIGHTS`
  - `[0.20, 0.14, 0.13, 0.12, 0.10, 0.08, 0.07, 0.07, 0.04, 0.02, 0.02, 0.01]`
- `AGE_GROUPS`
  - `[(0, 14), (15, 24), (25, 59), (60, 90)]`
- `AGE_GROUP_WEIGHTS`
  - `[0.26, 0.16, 0.46, 0.12]`
- `MILIEUX`
  - `["Urbain", "Rural"]`
- `MILIEU_WEIGHTS`
  - `[0.63, 0.37]`
- `RISK_LEVELS`
  - `["Low", "Medium", "High"]`
- `RISK_LEVEL_WEIGHTS`
  - `[0.70, 0.20, 0.10]`

Endpoints:
- `POST /stratify/{campaign_id}`
  - accepts targeting rules with:
    - `min_age`
    - `max_age`
    - `region`
    - `milieu`
    - `risk_level`
  - returns:
    - `campaign_id`
    - `patient_ids`
    - `matched_count`
- `GET /health`

Event published:
- topic: `audience.generated`
- payload:
```json
{
  "campaign_id": 1,
  "patient_ids": [1, 2, 3]
}
```

### 3.3 communication-service
Role:
- Kafka consumer
- Kafka producer
- synchronous communication template and preference management for frontend flows

Port:
- `8003`

Behavior:
- runs an `asyncio` background consumer on `audience.generated`
- for each received patient id, logs:
  - `Sending Moroccan validated message to patient {id}`
- publishes one event per patient

Endpoints:
- `GET /health`
- `GET /templates`
  - list seeded communication templates
- `GET /preferences/{patient_id}`
  - fetch a patient's communication preference
  - creates default `SMS` preference if none exists
- `PUT /preferences/{patient_id}`
  - upsert communication channel (`Email`, `SMS`, `Push`)

Event consumed:
- topic: `audience.generated`

Event published:
- topic: `message.sent`
- payload:
```json
{
  "patient_id": 1,
  "campaign_id": 1,
  "timestamp": "2026-04-24T12:00:00+00:00"
}
```

### 3.4 engagement-service
Role:
- synchronous event recording
- Kafka producer

Port:
- `8004`

Models:
- `TrackingEvent`
  - `id`
  - `patient_id`
  - `campaign_id`
  - `action`

Allowed actions:
- `clicked`
- `booked`

Endpoints:
- `POST /track`
- `POST /track/click`
  - alias for click action
- `POST /track/adherence`
  - alias that maps to booked action
- `GET /health`

Event published:
- topic: `user.engaged`
- payload:
```json
{
  "patient_id": 1,
  "campaign_id": 1,
  "action": "booked",
  "timestamp": "2026-04-24T12:00:00+00:00"
}
```

### 3.5 analytics-service
Role:
- Kafka consumer
- synchronous analytics read endpoint
- medallion-style raw event persistence for ROI calculation

Port:
- `8005`

Models:
- `RawMessage`
  - `id`
  - `patient_id`
  - `campaign_id`
- `RawEngagement`
  - `id`
  - `patient_id`
  - `campaign_id`
  - `action`

Endpoints:
- `GET /roi/{campaign_id}`
- `GET /coverage/regional?campaign_id={id}`
  - aggregate campaign message and booking outcomes by region
- `GET /health`

Event consumption:
- consumes both:
  - `message.sent`
  - `user.engaged`

Current ROI logic:
- conversion rate = `(count(booked engagements) / count(messages sent)) * 100`

Regional coverage logic:
- message and booking events are joined with patient region data from `stratification_db`
- response includes per-region:
  - `region`
  - `total_messages`
  - `total_bookings`
  - `conversion_rate`

Example response:
```json
{
  "campaign_id": 4,
  "total_messages": 251,
  "total_bookings": 1,
  "conversion_rate": 0.4
}
```

## 4. Infrastructure Specification

### 4.1 docker-compose
The root `docker-compose.yml` provisions:
- Kafka single-node KRaft broker on `9092`
- PostgreSQL on `5432`
- NGINX gateway on `8000`
- frontend service on internal port `3000` routed by NGINX
- frontend Playwright e2e service under compose `test` profile
- the five backend services

### 4.2 PostgreSQL Initialization
The database initialization creates:
- `campaign_db`
- `stratification_db`
- `communication_db`
- `engagement_db`
- `analytics_db`

### 4.3 Environment Variables
All services load infrastructure addresses through environment variables, including:
- `DATABASE_URL`
- `KAFKA_BOOTSTRAP_SERVERS`
- topic names and consumer group names where relevant

Frontend-specific variables:
- `NEXT_PUBLIC_API_BASE_URL`
  - currently set to empty string in compose so browser requests use gateway-relative `/api/...` routes
- `PLAYWRIGHT_BASE_URL`
  - used by `frontend-e2e`
  - currently set to `http://nginx:8000` for internal Docker network tests

## 5. Verified Backend State
The backend has been validated end to end through:
- gateway health checks
- campaign creation
- campaign read/list/active queries
- targeting rule creation
- campaign launch
- audience stratification
- engagement tracking
- Kafka-based inter-service propagation
- analytics ROI calculation
- regional coverage analytics calculation
- communication preferences and templates API checks
- seeded patient verification directly in PostgreSQL

Verified observations include:
- seeded Moroccan patient dataset contains exactly `5000` rows
- stratification against valid Moroccan segmentation returns realistic audience sizes
- communication-service emits message activity for matched patients
- analytics-service eventually reflects asynchronous events in ROI output
- campaign-service supports admin history views and personalized active campaign filtering
- communication-service exposes templates and patient communication preference persistence
- analytics-service exposes regional coverage for dashboard segmentation views

## 6. Frontend Architecture

### 6.1 Frontend Stack
- Next.js with App Router
- Tailwind CSS
- TanStack Query
- Recharts

Frontend testing stack:
- Vitest
- React Testing Library
- Playwright

Note:
- `shadcn/ui` remains optional/deferred in the current implementation.

### 6.2 Portals
The frontend should be implemented as a single application with two logical portals.

#### A. Admin Dashboard
Target users:
- public health agencies
- local authorities

Core modules:
- `Campaign Manager`
  - create campaign
  - define targeting rules
  - launch campaign
- `Audience Previewer`
  - submit targeting rules for segmentation preview
  - display matched audience counts and preview-oriented summaries
- `Impact Analytics Hub`
  - display ROI and campaign effectiveness metrics

#### B. Citizen / Patient Portal
Target users:
- citizens
- patients

Core modules:
- `Personalized Dashboard`
  - show relevant active campaigns
- `Engagement Actions`
  - allow click / booking style actions
- `Communication Preferences`
  - select preferred channels such as email, SMS, or push

## 7. Frontend Delivery Status

Current MVP status:
- frontend foundation: completed
- admin portal MVP: completed
- citizen portal MVP: completed
- analytics baseline: completed (embedded in admin)
- docker integration: completed
- automated testing pipeline: completed (unit + RTL integration + Playwright e2e)

Delivered in frontend:
- admin:
  - create campaign
  - campaign history list and selection
  - campaign detail
  - targeting rule builder
  - launch campaign
  - audience preview
  - ROI cards and regional coverage chart
  - mutation/status messaging and retry controls
- citizen:
  - profile filters (`age`, `region`, `milieu`, `risk_level`) for active campaigns
  - engagement aliases (`track/click`, `track/adherence`)
  - communication preference read/update
  - separate status regions for engagement and preference actions

Automated verification currently in repo:
- unit and RTL integration tests in `frontend/src/**/*.test.tsx`
- Playwright e2e tests in `frontend/tests/e2e/integration.spec.ts` covering:
  - admin campaign flow
  - admin analytics async propagation
  - citizen preference and engagement flows

Still deferred / later scope:
- optional auth and role-based access control (backend + frontend)
- citizen feed enrichment beyond rule-based filtering (ranking/prioritization and recommendation logic)
- optional dedicated analytics route beyond embedded admin metrics
- optional shadcn/ui adoption and additional accessibility/visual polish pass

## 8. Frontend Implementation Progress by Phase

### Phase 1 (foundation)
- completed

### Phase 2 (admin workflow)
- completed

### Phase 3 (analytics + citizen)
- completed for MVP baseline

### Phase 4 (docker + gateway integration)
- completed

### Phase 5 (hardening)
- in progress (optional polish and additional regression coverage)

## 9. Documentation Rule
This file is the canonical working specification and should be updated when:
- backend contracts change
- gateway routes change
- frontend phases are refined
- major milestones are completed
