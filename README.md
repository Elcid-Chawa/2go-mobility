# 2GO Mobility Ecosystem — MVP

Authoritative, full-stack ride-hailing vertical slice uniting Customer, Driver, and Operations interfaces powered by a single authoritative TypeScript backend.

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Node.js + Express + TypeScript (Modular Monolith)
- **Database**: MongoDB with Mongoose ODM (GeoJSON 2dsphere indexing)
- **Real-Time Stream**: Socket.IO (room-based dispatch, GPS tracking, and operations stream)
- **Authentication & Security**: Stateless JWT (Access + Refresh tokens), bcrypt password hashing, RBAC middleware
- **Operations Web**: Next.js 16 (Turbopack), React 19, Tailwind CSS, Lucide Icons
- **Mobile Apps**: React Native + Expo (unified Customer & Driver interface)
- **Infrastructure**: Docker, Docker Compose, Nginx reverse proxy

### Domain Services

The existing `backend/` remains the ride-share service and authentication
authority. Independent Node.js/TypeScript service scaffolds are available for
Movers, Shopping, Car Rentals, and Delivery under [`services/`](services/README.md).
Each currently has its own process, Docker image, and MongoDB database name.
Service APIs are routed through Nginx under `/api/v1/{service}`. See the
[domain services guide](services/README.md) for local and Docker instructions.

---

## 🚀 Quick Start & Development

### 1. Authoritative Backend

```bash
cd backend
npm install
npm test          # Run Jest unit and E2E lifecycle test suites
npm run seed      # Seed initial pricing rules, admin, demo customer & driver
npm run dev       # Start dev server on http://localhost:5000
```

### 2. Operations Web Dashboard

```bash
cd ops-web
npm install
npm run dev       # Start Next.js Operations Console on http://localhost:3000
```

### 3. Mobile Apps (Expo)

```bash
cd mobile
npm install
npx expo run:android   # Build/install the native development client (first run or after native dependency changes)
npx expo start --dev-client --clear
```

The mobile project uses native Expo modules and a custom development client.
Rebuild and reinstall that client whenever native dependencies or app plugins
change; a JavaScript reload cannot add native modules to an already-installed
app. For iOS, run `npx expo run:ios` on macOS, or create/install the EAS
development build with `eas build --profile development --platform ios`.

---

## 🧪 Automated Testing

Run the full end-to-end integration and lifecycle tests:

```bash
cd backend
npm test
```

### Verified E2E Flow:
1. **Registration & Auth**: Customer, Driver, and Admin users registered with JWT tokens.
2. **Driver Availability**: Driver sets `ONLINE` and reports GPS coordinates.
3. **Fare Estimation**: Pricing engine calculates dynamic estimates for categories (`STANDARD`, `COMFORT`, `PREMIUM`, `XL`).
4. **Booking & Dispatch**: Customer requests ride; dispatch engine matches nearest eligible candidate and offers ride.
5. **Driver Acceptance & Race-Condition Lock**: Driver accepts; duplicate acceptances are atomically rejected.
6. **Execution & Live Breadcrumbs**: Driver marks arrived, starts trip, and streams GPS updates.
7. **Completion & Settlement**: Final fare calculated, cash payment recorded (duplicate payment prevented).
8. **Feedback**: Customer submits 1-5 star rating; driver score updated.
9. **Operations Oversight**: Admin monitors active metrics, completed trips, and revenue KPIs.

## Driver onboarding and Operations access

Public registration supports customer and driver accounts only. A newly
registered driver remains pending and cannot go online or receive dispatch
offers until Operations reviews and approves the application and an active
vehicle is assigned.

The mobile driver onboarding flow collects identity and contact details,
address, driving-licence information, and vehicle details. Drivers must upload
a profile photo, vehicle photo, identity document, driving licence, and vehicle
registration/vignette; insurance is optional. Drivers can save a draft, submit
it for review, and correct and resubmit a rejected application. Uploaded files
are private: authenticated, authorized requests are required to view them.

Operations permissions are enforced by the backend, not just hidden in the
web UI:

| Role | Default access |
| --- | --- |
| `SYSTEM_OWNER`, `ADMIN` | All operations |
| `OPERATIONS` | View operations, verify drivers, dispatch, manage fleet and users |
| `DISPATCHER` | View operations and dispatch |
| `AGENT`, `VIEWER` | Read-only operations |
| `CUSTOMER`, `DRIVER` | No Operations permissions |

An authorized administrator can manage accounts and fleet records in the
Operations console. Grant staff roles only to trusted team members; the public
registration endpoint rejects staff and administrator roles. The console
provides the onboarding review queue, dashboard, users, drivers, vehicles,
dispatch, and trip views according to the signed-in user's permissions.

Uploads use local disk storage by default (`UPLOAD_DIR`, defaulting to
`backend/uploads`). Docker Compose sets this to `/app/uploads` and persists it
in the named `driver-uploads` volume. Back up this volume with the database;
for multi-instance production deployments, use shared persistent object storage
instead of instance-local storage.

---

## 🐳 Docker Deployment

To launch the full production stack using Docker Compose:

```bash
cd docker
docker-compose up -d --build
```
Services exposed:
- `http://localhost/` -> Nginx Reverse Proxy
- `http://localhost/health` -> API Healthcheck
- `http://localhost/api/v1` -> Authoritative REST API
- `http://localhost/socket.io/` -> Real-Time WebSocket Engine
