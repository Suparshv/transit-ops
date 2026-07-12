# TransitOps — Smart Transport Operations Platform

Centralized fleet management for logistics teams: vehicles, drivers, trips, maintenance, fuel, expenses, and analytics — all in one offline-capable web app.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite + TypeScript | React 18.3, Vite 5.3, TS 5.5 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | 0.376 |
| Notifications | Sonner | 1.4 |
| Charts | Recharts | 2.12 |
| Routing | React Router DOM | 6.22 |
| Backend | Express.js + TypeScript | Express 4.19, TS 5.5 |
| ORM | Prisma | 5.14 |
| Database | SQLite (local file, zero config) | — |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | JWT 9.0, bcryptjs 2.4 |
| Validation | Zod | 3.23 |

---

## Setup (run this exactly, in order)

### Prerequisites
- Node.js 18+
- No database server required — SQLite runs as a local file

### 1. Backend

```bash
cd backend
npm install
```

Copy and edit the env file:

```bash
# On Mac/Linux:
cp ../.env.example .env

# On Windows:
copy ..\.env.example .env
```

Open `backend/.env` and confirm these exact values:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="any-long-random-string-here"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

> **Important:** `DATABASE_URL` must be `file:./dev.db` — NOT `file:./prisma/dev.db`.
> Prisma resolves this path relative to the `prisma/` folder, so using `./prisma/dev.db`
> creates a nested `prisma/prisma/dev.db` in the wrong location.

Run the database migration and seed:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the dev server:

```bash
npm run dev
# API running at http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
# UI running at http://localhost:5173
```

No frontend `.env` file is required — the frontend defaults to `http://localhost:5000` for the API. If your backend runs on a different port, create `frontend/.env` with:

```env
VITE_API_URL="http://localhost:5000"
```

### 3. Optional: Prisma Studio (visual DB browser)

```bash
cd backend
npm run prisma:studio
# Opens http://localhost:5555
```

---

## Demo Credentials

All accounts use password: **`password123`**

At the login screen, enter the email and **select the matching role from the dropdown** — role is chosen at login, not stored on the user account.

| Email | Role to select |
|---|---|
| `fleet@transitops.in` | Fleet Manager |
| `dispatch@transitops.in` | Dispatcher |
| `safety@transitops.in` | Safety Officer |
| `finance@transitops.in` | Financial Analyst |

### Seeded edge cases (useful for testing business rules)

| Entity | What it tests |
|---|---|
| **Rahul Das** (driver) | Expired license — blocked from trip assignment |
| **Meena Pillai** (driver) | Suspended status — blocked from trip assignment |
| **Mini-08** (vehicle, `KA-03-EF-9012`) | InShop with active maintenance — hidden from dispatch pool |

The seed also includes 5 trips in mixed statuses (2 Completed, 1 Dispatched, 1 Draft, 1 Cancelled) so the Dashboard and Analytics pages show real data immediately.

---

## RBAC Matrix

Role is selected at login and embedded in the JWT for the session. The matrix below is the single source of truth (`backend/src/config/rolePermissions.ts`) — enforced on both backend routes and frontend navigation.

| Role | Fleet | Drivers | Trips | Fuel/Exp. | Analytics | Maintenance | Settings |
|---|---|---|---|---|---|---|---|
| **Fleet Manager** | ✓ full | ✓ full | — | — | ✓ full | ✓ full | ✓ |
| **Dispatcher** | view | — | ✓ full | — | — | view | ✓ |
| **Safety Officer** | — | ✓ full | view | — | — | view | ✓ |
| **Financial Analyst** | view | — | — | ✓ full | ✓ full | view | ✓ |

`✓ full` = create/edit/delete · `view` = read-only · `—` = route hidden + 403 if hit directly

> **Note:** Maintenance and Settings are accessible to all authenticated users at the UI level. Maintenance write actions (log/close records) are restricted to Fleet Manager by the backend `checkRole` middleware. The Dashboard is intentionally exempt from the analytics gate — it's the post-login landing page for all four roles.

---

## Key Features

### Authentication (§3.1)
- JWT login with role selected at login — role is session-scoped, not stored on the user record
- Account lockout after 5 consecutive failed login attempts (server-side counter, persisted in DB)
- Forgot-password flow generates a reset token (see Assumptions section below)

### Dashboard (§3.2)
- 7 live KPI cards: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips, Drivers on Duty, Fleet Utilization %
- Recent Trips table (last 10, with vehicle name, driver name, status, ETA)
- Vehicle status breakdown: horizontal bar chart (Available / On Trip / In Shop / Retired)
- Filter bar: Vehicle Type, Status, Region

### Fleet — Vehicle Registry (§3.3)
- Full CRUD: add, edit, delete vehicles
- Registration number enforced unique at DB level with friendly error on collision
- Type, Status, and reg-no/name search filters
- Retired/InShop vehicles automatically excluded from the trip dispatch pool

### Drivers & Safety (§3.4)
- Full CRUD: add, delete drivers
- License expiry date flagged visually (strikethrough + EXPIRED badge)
- Quick status toggle: Available / On Trip / Off Duty / Suspended

### Trip Dispatcher (§3.5)
- Visual lifecycle stepper: Draft → Dispatched → Completed / Cancelled
- Vehicle and driver dropdowns show **available-only** — ineligible options are absent, not greyed out
- Inline capacity validation callout with exact numbers (format from Design.md §4 Screen 4)
- Dispatch button disabled when cargo exceeds vehicle capacity
- Complete trip pipeline: final odometer entry → fuel log written automatically → vehicle and driver flipped to Available
- Cancel from Draft or Dispatched; resources freed only if was Dispatched

### Maintenance (§3.6)
- Log service records (vehicle, service type, cost, date)
- Opening an Active record flips vehicle → InShop
- Closing a record flips vehicle → Available (Retired vehicles are exempt)
- State-transition legend rendered directly in the UI

### Fuel & Expense Management (§3.7)
- Fuel logs: vehicle, date, liters, cost — linked to trips where applicable
- Expenses: toll + misc + linked maintenance cost → auto-computed total
- Running total operational cost displayed live at the bottom of the page

### Reports & Analytics (§3.8)
- 4 KPI cards: Fuel Efficiency (km/l), Fleet Utilization (%), Operational Cost (₹), Vehicle ROI (%)
- Monthly Revenue bar chart (last 7 months, Recharts)
- Top 5 Costliest Vehicles horizontal ranked bar list
- CSV export of per-vehicle analytics (registration, revenue, costs, ROI, efficiency)

### Settings (§3.8)
- Depot Name, Currency, Distance Unit — persisted in DB
- Full RBAC matrix rendered as a reference table

---

## Business Rules Enforced (Server-Side)

1. Vehicle registration number must be unique — DB unique constraint + 409 with friendly message
2. Retired or InShop vehicles are excluded from the trip dispatch pool
3. Drivers with a Suspended status cannot be assigned to any trip
4. Drivers with an expired license cannot be assigned to any trip
5. A driver already OnTrip cannot be assigned to a second trip
6. Cargo weight must not exceed the vehicle's capacity — rejected with exact numbers shown
7. Dispatching a trip atomically flips Vehicle → OnTrip and Driver → OnTrip
8. Completing a trip writes a fuel log, updates vehicle odometer, then atomically flips Vehicle → Available and Driver → Available; driver's trip completion % is recalculated
9. Opening a maintenance record flips vehicle → InShop (OnTrip vehicles cannot be put InShop)
10. Closing a maintenance record flips vehicle → Available, unless the vehicle is Retired

---

## Documented Assumptions & Simplifications

**Trip Revenue formula**
There is no pricing engine in the spec. Revenue is calculated as:
```
Trip Revenue = Planned Distance (km) × ₹30/km
```
This flat rate is applied to all Completed trips to derive vehicle ROI. The rate and simplification are stated explicitly in the Analytics UI.

**Forgot Password — no email sent**
The forgot-password endpoint generates a cryptographically random reset token, stores it with a 1-hour expiry in the database, and **prints the reset link to the server console** instead of sending an email. There is no SMTP server configured. For the demo, check the backend terminal output after clicking "Forgot password?" — the full reset link will be logged there.

**Role is session-scoped, not record-scoped**
A user account has no role field in the database. Role is selected at the login screen and embedded in the JWT for that session only. This means the same email can log in as different roles in different browser sessions — intentional for a demo/hackathon environment.

**SQLite — no enum support**
Prisma does not support native enums on SQLite. All status fields (`Vehicle.status`, `Driver.status`, `Trip.status`, etc.) are plain `String` columns. Valid values are enforced by application logic and the status engine, not at the database constraint level.

---

## Bonus Features

| Feature | Status |
|---|---|
| CSV export (per-vehicle analytics) | ✅ Implemented |
| Search, filters, and sorting | ✅ Implemented (Fleet: type/status/reg-no; Dashboard: type/status/region) |
| Dark mode | ✅ Always-on dark theme (no light mode toggle) |
| Email reminders for expiring licenses | ❌ Not implemented |
| Vehicle document uploads | ❌ Not implemented |

---

## API Endpoints

All responses follow `{ success: boolean, data: T | null, error: string | null }`.
All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

```
POST   /api/auth/login
POST   /api/auth/signup
GET    /api/auth/me
POST   /api/auth/forgot-password

GET    /api/vehicles              ?availableOnly=true for dispatch pool
POST   /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id

GET    /api/drivers               ?availableOnly=true for dispatch pool
POST   /api/drivers
GET    /api/drivers/:id
PATCH  /api/drivers/:id
DELETE /api/drivers/:id

GET    /api/trips
POST   /api/trips
PATCH  /api/trips/:id/dispatch
PATCH  /api/trips/:id/complete
PATCH  /api/trips/:id/cancel

GET    /api/maintenance
POST   /api/maintenance
PATCH  /api/maintenance/:id/close

GET    /api/fuel-logs
POST   /api/fuel-logs

GET    /api/expenses
POST   /api/expenses

GET    /api/reports/dashboard
GET    /api/reports/utilization
GET    /api/reports/roi
GET    /api/reports/top-costliest
GET    /api/reports/monthly-revenue
GET    /api/reports/export.csv

GET    /api/settings
PATCH  /api/settings
```

---

## Team

| Member | Role |
|---|---|
| **Joy** | Backend core — Prisma schema, auth, vehicles, drivers, trips, maintenance, status engine |
| **Suparshv** | Fuel/expenses/reports backend, seed script, integration, documentation |
| **Aryan** | Frontend — all React pages, Tailwind UI, charts, RBAC guards |

---

*Odoo Hackathon '26 · SQLite + Prisma · Fully offline-capable · No cloud dependencies*
