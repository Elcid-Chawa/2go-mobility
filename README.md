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
npm start         # Launch Expo dev server (Customer & Driver views)
```

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
