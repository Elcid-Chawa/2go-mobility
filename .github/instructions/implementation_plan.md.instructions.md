# 2GO Ecosystem — SDLC and 7-Day AI Implementation Plan

**Project:** 2GO Mobility Ecosystem MVP  
**Source:** 2GO Ecosystem — Platform Functional Blueprint, August 2026  
**Target:** Production-deployed MVP within 7 calendar days  
**Primary objective:** Deliver one integrated ride-hailing vertical slice with Customer, Driver, and Operations interfaces sharing one authoritative backend.

---

## 1. Executive Summary

The 2GO blueprint defines four connected platforms:

1. Customer App — booking, tracking, payment, safety, feedback.
2. Driver App — availability, trip execution, navigation, earnings, vehicle controls.
3. Call Center — support, dispatch assistance, complaints, payments, emergency escalation.
4. Owner/Operations — fleet, people, money, safety, performance, pricing, analytics.

All interfaces are intended to use one secure backend, identity system, trip/dispatch engine, pricing engine, payment layer, fleet database, support system, and analytics platform.

For a one-week implementation, the project must be treated as a focused MVP rather than full completion of the blueprint. The MVP shall prioritize:

- authentication and role-based access;
- customer booking;
- fare estimation;
- driver availability;
- driver matching/dispatch;
- driver acceptance;
- trip state management;
- live driver/trip tracking;
- trip completion;
- payment recording/abstraction;
- ratings;
- basic operations dashboard;
- deployment, testing, logging, backups, and documentation.

The Call Center should initially be represented as a support/operations module inside the Operations web application. Advanced fleet management, maintenance, telematics, leasing, corporate accounts, advanced analytics, AI/forecasting, and multi-city features are explicitly deferred.

---

# 2. Software Development Life Cycle

## Phase 1 — Initiation and Project Planning

### Objectives

- Establish project scope.
- Define MVP success criteria.
- Identify actors and responsibilities.
- Freeze the seven-day scope.
- Establish development repository and environments.

### Deliverables

- Project charter
- Scope statement
- Stakeholder/actor list
- MVP feature list
- Seven-day schedule
- Risk register
- Definition of Done

### MVP actors

- Customer
- Driver
- Operations
- Administrator

### MVP success criterion

A customer can request a ride, the backend can identify and assign an eligible driver, the driver can accept and execute the ride, the customer can receive real-time trip updates, the trip can be completed and recorded, and Operations can monitor the transaction.

---

# 3. Phase 2 — Requirements Engineering

## Functional Requirements

### Authentication

FR-001: Customer can register.
FR-002: Driver can authenticate.
FR-003: Operations/Admin can authenticate.
FR-004: System enforces role-based access.
FR-005: Sessions/tokens can be refreshed and revoked.

### Customer

FR-010: View profile.
FR-011: Select pickup location.
FR-012: Select destination.
FR-013: Select ride category.
FR-014: View fare estimate.
FR-015: Request a ride.
FR-016: View driver assignment.
FR-017: View live driver location.
FR-018: View trip status.
FR-019: View trip history.
FR-020: Record payment method/status.
FR-021: Rate completed trip.

### Driver

FR-030: View profile and assigned vehicle.
FR-031: Change online/offline status.
FR-032: Send current GPS location.
FR-033: Receive ride request.
FR-034: Accept or reject ride.
FR-035: Mark arrived.
FR-036: Start trip.
FR-037: Complete trip.
FR-038: View earnings/trip history.

### Dispatch

FR-040: Find eligible drivers.
FR-041: Rank eligible drivers by proximity.
FR-042: Offer request to a driver.
FR-043: Prevent two drivers from accepting the same trip.
FR-044: Reassign when a driver rejects or times out.
FR-045: Allow Operations to manually assign a driver.

### Operations

FR-050: View dashboard KPIs.
FR-051: View customers.
FR-052: View drivers.
FR-053: View vehicles.
FR-054: View trips.
FR-055: View active trips.
FR-056: View live vehicle/trip locations.
FR-057: Manually dispatch a driver.
FR-058: View basic revenue/trip statistics.

### Payments

FR-060: Record cash payment.
FR-061: Support an abstract digital payment provider interface.
FR-062: Store transaction and payment status.
FR-063: Prevent duplicate payment records.

### Ratings

FR-070: Customer can rate driver/trip once.
FR-071: Store rating and optional comment.

---

# 4. Non-Functional Requirements

## Security

- Passwords must be hashed.
- Secrets must not be committed to Git.
- APIs must validate input.
- APIs must enforce authorization.
- Administrative endpoints require elevated roles.
- HTTPS must be used in production.
- Rate limiting should protect authentication and sensitive endpoints.
- Important administrative and financial actions should be auditable.

## Performance

- Normal API requests should target sub-second response times.
- GPS updates must not overload the database.
- Database indexes must be created for frequent queries.
- Real-time updates should use WebSockets rather than polling where practical.

## Reliability

- Backend exposes a health endpoint.
- Database backups are automated.
- Application errors are logged.
- Production deployment supports restart/recovery.

## Maintainability

- Use TypeScript.
- Use modular backend architecture.
- Separate controllers, services, models, validation, and routes.
- Avoid business logic inside UI components.
- Keep payment, pricing, dispatch, and notification providers abstract.

---

# 5. Phase 3 — System Analysis

## Primary business flow

Customer requests ride
→ backend validates request
→ pricing engine calculates estimate
→ dispatch engine finds eligible driver
→ driver receives request
→ driver accepts
→ customer receives assignment
→ driver navigates to pickup
→ driver marks arrived
→ driver starts trip
→ location updates are streamed
→ driver completes trip
→ final fare is calculated
→ payment is recorded
→ customer rates trip
→ Operations sees final record.

## Trip state machine

REQUESTED
→ SEARCHING_DRIVER
→ DRIVER_ASSIGNED
→ DRIVER_ACCEPTED
→ DRIVER_ARRIVED
→ TRIP_STARTED
→ TRIP_COMPLETED
→ PAYMENT_PENDING
→ PAID
→ RATED

Cancellation can occur from appropriate pre-completion states.

The backend must be the authoritative owner of trip state.

---

# 6. Phase 4 — Architecture and Design

## Architecture decision

Use a modular monolith for the seven-day MVP.

Do NOT implement microservices during Week 1.

## Technology target

### Mobile

React Native + Expo

### Operations Web

Next.js

### Backend

Node.js + Express + TypeScript

### Database

MongoDB + Mongoose

### Real-time

Socket.IO

### Authentication

JWT access/refresh token model

### Infrastructure

Docker + Docker Compose + Nginx + HTTPS

### Notifications

Expo push notifications for MVP

### Maps

Use a production mapping provider supporting maps, geocoding, routing, distance, and ETA.

### Payments

Use a provider abstraction. Implement cash first and connect a digital provider only if credentials and integration are available without jeopardizing the deadline.

---

# 7. High-Level Architecture

Internet
→ Nginx / HTTPS
→ Operations Web and API
→ Backend
→ MongoDB
→ Socket.IO
→ Customer Mobile / Driver Mobile

The backend contains modules:

- auth
- users
- customers
- drivers
- vehicles
- trips
- dispatch
- pricing
- payments
- ratings
- notifications
- audit

The Operations web application initially contains:

- dashboard
- live operations
- trips
- drivers
- vehicles
- customers
- dispatch
- basic support

---

# 8. Database Design

## users

- \_id
- name
- phone
- email
- passwordHash
- role
- status
- createdAt
- updatedAt

## drivers

- \_id
- userId
- licenseNumber
- approvalStatus
- onlineStatus
- availabilityStatus
- currentLocation
- rating
- totalTrips
- createdAt
- updatedAt

## customers

- \_id
- userId
- savedPlaces
- trustedContacts
- createdAt
- updatedAt

## vehicles

- \_id
- driverId
- registrationNumber
- make
- model
- year
- category
- status
- currentLocation

## trips

- \_id
- customerId
- driverId
- vehicleId
- pickup
- destination
- distance
- estimatedDuration
- estimatedFare
- finalFare
- category
- status
- paymentStatus
- timestamps

## trip_locations

- \_id
- tripId
- driverId
- location
- heading
- speed
- timestamp

Use GeoJSON Point format for location and appropriate geospatial indexes.

## payments

- \_id
- tripId
- customerId
- amount
- currency
- method
- provider
- providerReference
- status
- timestamps

## ratings

- \_id
- tripId
- customerId
- driverId
- score
- comment
- createdAt

## notifications

- \_id
- userId
- type
- title
- message
- data
- readAt
- createdAt

## audit_logs

- \_id
- actorId
- actorRole
- action
- resourceType
- resourceId
- metadata
- createdAt

---

# 9. API Design

Base path: `/api/v1`

## Auth

POST `/auth/register`
POST `/auth/login`
POST `/auth/refresh`
POST `/auth/logout`

## Customer

GET `/customers/me`
PATCH `/customers/me`
GET `/customers/me/trips`

## Driver

GET `/drivers/me`
PATCH `/drivers/me/status`
GET `/drivers/me/trips`
GET `/drivers/me/earnings`
POST `/drivers/me/location`

## Trips

POST `/trips`
GET `/trips/:id`
POST `/trips/:id/accept`
POST `/trips/:id/reject`
POST `/trips/:id/arrive`
POST `/trips/:id/start`
POST `/trips/:id/complete`
POST `/trips/:id/cancel`

## Ratings

POST `/trips/:id/rating`

## Payments

POST `/trips/:id/payment`
GET `/trips/:id/payment`

## Operations

GET `/admin/dashboard`
GET `/admin/trips`
GET `/admin/drivers`
GET `/admin/customers`
GET `/admin/vehicles`
POST `/admin/trips/:id/assign`

Every endpoint must have validation, authentication, authorization where required, consistent errors, and tests.

---

# 10. Real-Time Design

Use REST for commands and CRUD.

Use Socket.IO for real-time events.

Example events:

- `trip.requested`
- `trip.offer`
- `trip.accepted`
- `trip.rejected`
- `trip.assigned`
- `driver.location`
- `trip.location_updated`
- `trip.arrived`
- `trip.started`
- `trip.completed`
- `payment.updated`

Customer joins `trip:{tripId}`.

Operations can subscribe to an operations namespace/room.

Driver location should be rate-limited/throttled so that GPS updates do not overwhelm MongoDB.

---

# 11. Dispatch Algorithm

When a customer requests a ride:

1. Validate pickup/destination.
2. Calculate estimated distance and duration.
3. Calculate estimated fare.
4. Find drivers who:
   - are approved;
   - are online;
   - are available;
   - have an active vehicle;
   - match requested category;
   - have a recent GPS position.
5. Calculate distance from driver to pickup.
6. Sort candidates by proximity.
7. Offer the trip to the best candidate.
8. Use a timeout.
9. If rejected/expired, offer to the next candidate.
10. Atomically assign the trip when accepted.
11. Mark driver unavailable.
12. Notify customer.
13. Record dispatch events.

Concurrency protection is mandatory so that only one driver can win an assignment.

---

# 12. Pricing Engine

Create a dedicated PricingService.

Example model:

fare =
baseFare

- distanceKm × pricePerKm
- durationMinutes × pricePerMinute
- applicable surcharge

* applicable discount

Pricing must be configurable rather than hard-coded into controllers.

Store pricing rules in the database.

---

# 13. Phase 5 — Implementation

## Day 1 — Foundation

Tasks:

- Create Git repository.
- Create project structure.
- Configure TypeScript.
- Configure linting/formatting.
- Configure environment variables.
- Configure MongoDB.
- Implement user model.
- Implement authentication.
- Implement JWT.
- Implement RBAC middleware.
- Create Docker development environment.
- Create initial CI pipeline.
- Create project documentation.

Acceptance:

- User can register.
- User can log in.
- Protected endpoint works.
- Wrong role is rejected.
- Tests pass.

---

## Day 2 — Customer, Driver, Vehicle, Pricing

Tasks:

- Customer profile.
- Driver profile.
- Vehicle model.
- Driver online/offline state.
- GPS permission and location handling.
- Pickup/destination UI.
- Maps integration.
- Ride category.
- PricingService.
- Fare estimate endpoint.
- Mobile navigation structure.

Acceptance:

- Customer can select locations.
- Fare estimate is returned.
- Driver can go online.
- Driver location reaches backend.

---

## Day 3 — Booking and Dispatch

Tasks:

- Trip model.
- Trip state machine.
- Create trip endpoint.
- Driver eligibility query.
- Geospatial search.
- Dispatch service.
- Socket.IO.
- Driver ride-request screen.
- Accept/reject flow.
- Customer assignment screen.
- Timeout/reassignment logic.

Acceptance:

- Customer requests ride.
- Driver receives request in real time.
- Driver accepts.
- Customer sees assigned driver.
- Same trip cannot be accepted by two drivers.

---

## Day 4 — Trip Execution and Live Tracking

Tasks:

- Arrived action.
- Start trip action.
- Complete trip action.
- Driver GPS streaming.
- Customer live tracking.
- Operations live tracking.
- Trip history.
- Final fare calculation.
- Trip event/audit recording.

Acceptance:

- Driver can execute a complete trip.
- Customer sees location changes.
- Operations sees active trip.
- Completed trip is persisted correctly.

---

## Day 5 — Payments, Ratings, Operations

Tasks:

- Payment model.
- Cash payment.
- Payment abstraction.
- Payment status.
- Rating model.
- Customer rating screen.
- Operations dashboard.
- Trips management.
- Driver management.
- Vehicle management.
- Customer lookup.
- Manual dispatch.
- Basic revenue KPIs.

Acceptance:

- Trip payment is recorded.
- Customer can rate once.
- Operations can see active/completed trips.
- Operations can manually assign a driver.

---

## Day 6 — Testing and Hardening

Tasks:

- Unit tests.
- API tests.
- Integration tests.
- End-to-end ride test.
- Authentication security tests.
- Authorization tests.
- Duplicate acceptance tests.
- Cancellation tests.
- No-driver tests.
- Driver timeout tests.
- Payment failure tests.
- Invalid input tests.
- Mobile build testing.
- Production configuration review.
- Logging review.
- Backup verification.

Required end-to-end scenario:

Register customer
→ request ride
→ driver receives
→ driver accepts
→ customer sees driver
→ driver arrives
→ driver starts
→ location updates
→ driver completes
→ payment recorded
→ customer rates
→ operations sees completed trip.

---

## Day 7 — Deployment and UAT

Tasks:

- Provision production server.
- Configure Docker.
- Configure MongoDB.
- Configure Nginx.
- Configure HTTPS.
- Configure production environment variables.
- Configure database backups.
- Configure health checks.
- Deploy API.
- Deploy Operations web.
- Build mobile application.
- Configure production API URL.
- Run smoke tests.
- Run UAT.
- Fix only critical/blocking defects.
- Tag release.
- Publish release notes.

Acceptance:

- Production API is reachable.
- Operations dashboard is reachable.
- Mobile app communicates with production backend.
- Complete ride flow works in production.
- Logs are available.
- Backup exists.
- Critical security checks pass.

---

# 14. Testing Strategy

## Unit Tests

Test:

- pricing;
- trip state transitions;
- dispatch candidate selection;
- authorization;
- payment calculations.

## Integration Tests

Test:

- registration/login;
- trip creation;
- dispatch;
- acceptance;
- trip execution;
- payment;
- rating.

## End-to-End Tests

Run the full ride lifecycle.

## Security Tests

Verify:

- unauthorized requests;
- incorrect roles;
- expired tokens;
- invalid input;
- resource ownership;
- duplicate operations.

## UAT

Use:

- one customer;
- one driver;
- one operations user.

---

# 15. Deployment

Production architecture:

Internet
→ Nginx
→ HTTPS
→ API
→ MongoDB

Operations Web is served through the production web deployment.

Socket.IO operates through the same secure backend.

Use Docker Compose for Week 1.

Production containers:

- api
- admin
- mongodb
- nginx
- optional redis

Use environment-specific configuration.

---

# 16. CI/CD

Pipeline:

1. Checkout.
2. Install dependencies.
3. Lint.
4. Run tests.
5. Build.
6. Build Docker image.
7. Push image.
8. Deploy.
9. Run health check.
10. Fail deployment if health check fails.

Use Git branches:

- main
- develop
- feature/\*
- hotfix/\*

Commit prefixes:

- feat
- fix
- refactor
- test
- docs
- chore

---

# 17. Observability

Implement:

- `/health`;
- structured logs;
- error logging;
- authentication failure logging;
- trip failure logging;
- payment failure logging;
- administrative audit logs.

---

# 18. Implementation Status — 2026-09-02

This section records the repository state against the plan. A requirement is marked **done** only when there is working repository evidence, not just a UI placeholder or documentation claim.

## Done

- Backend modular monolith with TypeScript, Express, MongoDB, and Mongoose.
- User, customer, driver, vehicle, pricing, trip, trip-location, payment, and rating models.
- Customer, driver, operations, and admin roles with JWT authentication, refresh tokens, logout revocation, password hashing, and RBAC middleware.
- Customer registration, profile read/update, ride request, fare estimation, and server-owned trip state.
- Driver profile, online/offline status, GPS updates, ride acceptance/rejection, arrival, trip start, trip completion, and earnings totals.
- Proximity-based dispatch and atomic duplicate-acceptance protection.
- Configurable pricing rules stored in MongoDB.
- Cash payment provider abstraction, persisted payment status, and duplicate payment protection.
- One-rating-per-trip protection and driver rating recalculation.
- Health endpoint, security headers, global rate limiting, Winston logging, Socket.IO server setup, Docker Compose, Nginx proxy, and backup scripts.
- Backend Jest coverage for the happy-path ride lifecycle, authentication basics, duplicate acceptance, duplicate rating, cash payment, and dashboard KPIs.

## Partial

- **Mobile app:** Authentication, secure sessions, role-based routing, fare estimation, trip creation, driver status/GPS reporting, lifecycle actions, OpenStreetMap tiles, and Socket.IO client subscriptions are integrated. Customer and driver history, real geocoding/routing, and full backend state rendering still need completion.
- **Operations web:** Dashboard, trips, drivers, and dispatch pages exist, but use hard-coded data and do not call the backend or subscribe to live events.
- **Real-time layer:** Socket.IO handshake authentication, user/operations rooms, authorized trip-room joins, customer subscriptions, and driver offer subscriptions are implemented. Reconnect behavior, event integration tests, and complete operations client subscriptions remain.
- **Dispatch:** Candidate proximity ordering, active vehicle/category filtering when vehicle data exists, rejection redispatch, and offer expiry reassignment are implemented. Legacy driver profiles without a vehicle remain temporarily eligible for existing MVP compatibility; recent-location enforcement and dispatch event persistence remain.
- **Trip state and ownership:** Most transitions are enforced, but payment bypasses transition validation and cancellation/resource access need explicit customer or assigned-driver ownership checks.
- **Validation:** Auth and pricing validation exist; trip, driver, customer, vehicle, payment, rating, and admin inputs still need route-level validation.
- **Infrastructure:** Docker, Nginx, and backups exist, but the Operations web service, HTTPS, secret injection, backup scheduling, retention, and restore verification are missing.

## Remaining Work

### 1. Integrate the mobile clients

- Add shared API configuration and an authentication flow for customer, driver, and operations roles.
- Replace local customer state with fare-estimate, trip-create, trip-read, payment, and rating API calls.
- Replace local driver state with status, location, accept/reject, arrive, start, and complete API calls.
- Add Socket.IO client authentication, trip-room subscriptions, offer handling, live location updates, reconnect handling, and cleanup.
- Add real map, geocoding, routing, distance, and ETA integration.
- Add GPS permission handling and throttled location reporting.
- Add customer and driver trip-history screens.
- Verify Android/iOS builds and configure the production API URL.

### 2. Integrate the Operations console

- Add an authenticated operations login and protected routes.
- Replace hard-coded dashboard, trips, drivers, and dispatch data with backend API calls.
- Add live operations-room subscriptions for active trips, driver locations, and trip events.
- Complete customer, vehicle, active-trip, revenue, and manual-dispatch views.
- Add basic support/complaint records and workflows.

### 3. Close backend correctness gaps

- Add route schemas and validation middleware for all remaining write and read parameters.
- Enforce resource ownership on trip, payment, rating, customer, and driver endpoints.
- Enforce valid state transitions for payment and cancellation paths.
- Add vehicle approval, active status, category, and recent-location checks to dispatch eligibility.
- Implement offer expiry timers, reassignment, and dispatch event persistence.
- Add GPS throttling and a bounded breadcrumb persistence policy.
- Add notification and audit modules, including administrative and financial audit records.

### 4. Expand verification

- Add tests for logout/revocation, wrong roles, expired tokens, ownership, cancellation, no-driver dispatch, timeout/reassignment, payment failures, invalid inputs, GPS throttling, and Socket.IO behavior.
- Add restore-test coverage for backups and document recovery steps.
- Add mobile build tests, Operations integration tests, production smoke tests, and the three-role UAT flow.
- Reconcile [walkthrough.md](../../walkthrough.md) with actual implementation and test output; remove claims that are not yet verified.

### 5. Harden and deploy

- Add CI/CD for install, lint, typecheck, tests, build, Docker image, deployment, and health-check failure handling.
- Add backend linting and explicit typecheck scripts.
- Move all secrets to environment-managed deployment configuration and remove fallback production secrets.
- Restrict CORS to configured origins and add endpoint-specific limits for authentication and sensitive operations.
- Add HTTPS certificates, HTTP-to-HTTPS redirect, and secure WebSocket proxy configuration.
- Deploy the Operations web service alongside the API, MongoDB, and Nginx.
- Add scheduled backups, retention, restore verification, release notes, and a production Definition of Done/UAT record.

## Explicitly Deferred After MVP

Full call-center tooling, telematics, maintenance, leasing, corporate accounts, promotions/loyalty, advanced settlement and analytics, AI/forecasting, multi-city management, fleet-owner SaaS, and third-party public APIs remain outside the current MVP scope.

Track:

- uptime;
- API latency;
- errors;
- CPU;
- RAM;
- disk;
- database availability.

---

# 18. Backup and Recovery

Minimum:

- automated daily database backup;
- backup retention;
- restore test;
- documented recovery procedure.

Do not consider the system production-ready until a backup can actually be restored.

---

# 19. Definition of Done

A feature is complete only when:

- code exists;
- database changes exist;
- API exists;
- validation exists;
- authorization exists;
- error handling exists;
- UI exists;
- tests exist;
- documentation is updated;
- feature works locally;
- feature works in production;
- Git changes are committed.

---

# 20. MVP Scope Control

## MUST HAVE

- Auth
- Customer booking
- Pricing
- Driver availability
- Dispatch
- Driver acceptance
- Trip state machine
- GPS tracking
- Trip completion
- Payment recording
- Ratings
- Operations dashboard
- Deployment
- Testing
- Backups
- Logging

## SHOULD HAVE IF TIME ALLOWS

- Push notifications
- Saved places
- Basic cancellation rules
- Basic support records
- More detailed reports

## DEFER

- Full call-center application
- Full telematics
- Maintenance management
- Leasing
- Corporate accounts
- Promotions/loyalty
- Advanced settlements
- Advanced analytics
- AI/forecasting
- Multi-city management
- Fleet-owner SaaS
- Third-party public APIs

---

# 21. Risks

## Risk: Scope explosion

Mitigation: freeze MVP scope.

## Risk: Maps integration consumes time

Mitigation: integrate only required map/geocoding/routing capabilities.

## Risk: Payment provider delays

Mitigation: implement payment abstraction and cash first.

## Risk: Real-time instability

Mitigation: implement Socket.IO early on Day 3 and test continuously.

## Risk: Concurrent driver acceptance

Mitigation: atomic assignment and database constraints/transactions where supported.

## Risk: GPS overload

Mitigation: throttle location writes and separate live events from historical location storage.

## Risk: Deployment failure

Mitigation: deploy a minimal backend by Day 3/4 instead of waiting until Day 7.

---

# 22. AI IMPLEMENTATION MASTER PROMPT

Use the following as the instruction to an implementation AI.

---

## ROLE

You are the lead software architect and senior full-stack engineer responsible for implementing the 2GO Mobility Ecosystem MVP.

You must implement the system according to this specification. Do not expand the scope unless explicitly requested.

The target is a production-deployed MVP within seven calendar days.

---

## ENGINEERING RULES

1. Use a modular monolith for the MVP.
2. Use TypeScript throughout the backend.
3. Use React Native + Expo for mobile.
4. Use Next.js for Operations.
5. Use Node.js + Express for API.
6. Use MongoDB + Mongoose.
7. Use Socket.IO for real-time events.
8. Use JWT authentication.
9. Use Docker and Docker Compose.
10. Use environment variables for all secrets.
11. Use REST for commands/CRUD and WebSockets for real-time events.
12. Backend is the authoritative source of truth.
13. Never duplicate authoritative trip state in clients.
14. Do not implement microservices during MVP.
15. Do not add deferred features unless requested.
16. Write tests for critical business logic.
17. Maintain documentation as implementation progresses.
18. Never silently invent business rules; if the specification is missing a critical decision, choose the simplest safe MVP behavior and document the assumption.

---

## IMPLEMENTATION ORDER

Implement in this exact order:

### Stage 1

- repository;
- project structure;
- Docker;
- configuration;
- database;
- logging;
- authentication;
- RBAC.

### Stage 2

- users;
- customers;
- drivers;
- vehicles;
- pricing.

### Stage 3

- trips;
- trip state machine;
- dispatch;
- Socket.IO.

### Stage 4

- driver execution;
- GPS;
- customer tracking;
- operations tracking.

### Stage 5

- payments;
- ratings;
- dashboard;
- reports.

### Stage 6

- tests;
- security;
- performance;
- backups;
- monitoring.

### Stage 7

- production deployment;
- smoke tests;
- UAT;
- release.

---

## REQUIRED BACKEND MODULES

Create:

src/modules/auth
src/modules/users
src/modules/customers
src/modules/drivers
src/modules/vehicles
src/modules/trips
src/modules/dispatch
src/modules/pricing
src/modules/payments
src/modules/ratings
src/modules/notifications
src/modules/audit

Each module should separate:

- model;
- service;
- controller;
- routes;
- validation;
- tests where applicable.

---

## REQUIRED MOBILE EXPERIENCE

Customer:

- authentication;
- home;
- pickup;
- destination;
- category;
- fare estimate;
- request;
- searching;
- assigned driver;
- live tracking;
- trip completion;
- payment;
- rating;
- history;
- profile.

Driver:

- authentication;
- dashboard;
- online/offline;
- ride request;
- accept/reject;
- navigation;
- arrived;
- start;
- active trip;
- complete;
- earnings;
- profile.

---

## REQUIRED OPERATIONS EXPERIENCE

- authentication;
- dashboard;
- KPI cards;
- live map;
- active trips;
- trip list;
- trip detail;
- drivers;
- vehicles;
- customers;
- manual dispatch;
- basic revenue/reporting.

---

## TRIP STATE RULES

Implement the state machine exactly.

Valid progression:

REQUESTED
→ SEARCHING_DRIVER
→ DRIVER_ASSIGNED
→ DRIVER_ACCEPTED
→ DRIVER_ARRIVED
→ TRIP_STARTED
→ TRIP_COMPLETED
→ PAYMENT_PENDING
→ PAID
→ RATED

Reject invalid state transitions.

Implement cancellation as a controlled transition.

All transitions must be validated server-side.

---

## DISPATCH RULES

Only drivers satisfying all of these can be selected:

- approved;
- online;
- available;
- vehicle active;
- matching category;
- recent location.

Rank by distance to pickup.

Prevent duplicate acceptance.

Support timeout and reassignment.

Support Operations manual assignment.

---

## REAL-TIME RULES

Implement Socket.IO events for:

- trip offers;
- assignment;
- acceptance;
- arrival;
- start;
- completion;
- driver location;
- trip location.

Customer must receive location updates for the assigned trip.

Operations must see active trip/driver updates.

Do not rely on client-side state as authoritative.

---

## PAYMENT RULES

Create an interface:

PaymentProvider

Implement:

- CashPaymentProvider.

Create a clear extension point for a digital provider.

Never couple trip completion directly to a specific payment vendor.

---

## QUALITY REQUIREMENTS

Before declaring MVP complete, verify:

1. Customer can register/login.
2. Driver can login.
3. Driver can become online.
4. Driver location is recorded.
5. Customer can request ride.
6. Fare is calculated.
7. Driver receives request.
8. Driver can accept.
9. Customer sees driver.
10. Driver can mark arrived.
11. Driver can start.
12. Customer receives location updates.
13. Driver can complete.
14. Final fare is recorded.
15. Payment is recorded.
16. Customer can rate.
17. Operations can see the trip.
18. Operations can manually assign.
19. Unauthorized operations are rejected.
20. Duplicate driver acceptance is impossible.
21. Production deployment works.
22. Backup works.
23. Health check works.
24. Critical tests pass.

---

## AI WORKING METHOD

Work incrementally.

For each stage:

1. Inspect the current repository.
2. Determine what already exists.
3. Do not overwrite working code unnecessarily.
4. Implement the smallest complete increment.
5. Run tests.
6. Fix failures.
7. Update documentation.
8. Show changed files.
9. State remaining tasks.
10. Continue to the next stage.

Never generate an enormous untested code dump.

Prioritize a working vertical slice over superficial completeness.

---

## FIRST TASK

Start by producing:

1. repository structure;
2. architecture decision record;
3. database schema plan;
4. API route plan;
5. environment-variable plan;
6. Docker plan;
7. seven-day task checklist.

Then implement Stage 1.

Do not start advanced features until the authentication and project foundation are working.

---

# 23. Release Criteria

Version 1.0.0 may be released only when:

- complete ride lifecycle passes;
- critical API tests pass;
- mobile production build works;
- Operations dashboard works;
- production backend is healthy;
- database backup is confirmed;
- HTTPS works;
- no critical security issue remains;
- deployment is reproducible;
- documentation is complete enough for another engineer to operate the system.

---

# 24. Post-MVP Roadmap

After the MVP is stable, implement the blueprint's operational-control features:

- Call Center console;
- support tickets;
- emergency/SOS workflows;
- incident management;
- telematics;
- fleet management;
- maintenance;
- driver scorecards;
- payment reconciliation.

Then commercial scale:

- corporate accounts;
- delivery;
- promotions;
- advanced analytics;
- automated settlements;
- premium services.

Finally:

- leasing;
- fleet-owner portal;
- third-party APIs;
- advanced forecasting/AI;
- multi-city management.

---

# 25. Source Alignment

The project scope and terminology in this plan are derived from the supplied 2GO Ecosystem Platform Functional Blueprint. The blueprint identifies the four interfaces, shared backend components, integrated operating flow, role-based access, development roadmap, KPI framework, and product design principles.

The blueprint's MVP phase specifically identifies customer booking, driver app, basic dispatch, live tracking, fare calculation, payment workflow, ratings, and basic owner dashboard as the first development phase.

The seven-day schedule, technology choices, modular-monolith architecture, detailed API design, database design, testing strategy, and deployment procedure are engineering implementation decisions created to make that MVP achievable within the requested one-week constraint.
