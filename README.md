# TransitOps — Smart Transport Operations Platform

> **Odoo Hackathon '26 | 8-Hour Build**  
> Team: Suparshv (Team Leader), Joy, Aryan

---

## What is TransitOps?

TransitOps is a centralized fleet management platform that replaces spreadsheets with a real-time, role-controlled web app. It covers:

- **Vehicle Registry** — register and track every vehicle's status and odometer
- **Driver Management** — safety profiles, license validity, status tracking
- **Trip Dispatcher** — create/dispatch/complete/cancel trips with capacity validation
- **Maintenance** — log service records; automatically pulls vehicles out of the dispatch pool
- **Fuel & Expense Management** — fuel logs, toll/misc expenses, auto-calculated operational cost
- **Reports & Analytics** — fuel efficiency, fleet utilization, ROI, monthly revenue, CSV export
- **RBAC** — four roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) enforced on both API and UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite + TypeScript), Shadcn UI, Tailwind CSS, Recharts, Sonner |
| Backend | Express.js (Node.js + TypeScript) |
| Database | SQLite via Prisma ORM |
| Auth | Local JWT (`jsonwebtoken` + `bcryptjs`) |
| Validation | Zod |

---

## Prerequisites

- **Node.js ≥ 18** (check: `node -v`)
- **npm ≥ 9** (check: `npm -v`)
- No database server required — SQLite is a local file

---

## Setup & Run (Backend)

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values (JWT_SECRET is the only thing to change)
cp ../.env.example .env

# 4. Generate Prisma client + create SQLite DB + run migrations
npx prisma migrate dev --name init

# 5. Seed demo data (vehicles, drivers, trips pre-loaded)
npx ts-node src/prisma/seed.ts

# 6. Start dev server (hot-reload)
npm run dev
# → API running at http://localhost:5000
```

---

## Setup & Run (Frontend)

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server
npm run dev
# → App running at http://localhost:5173
```

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Fleet Manager | fleet@transitops.in | password123 |
| Dispatcher | dispatch@transitops.in | password123 |
| Safety Officer | safety@transitops.in | password123 |
| Financial Analyst | finance@transitops.in | password123 |

> Role is **selected at login** from the dropdown — the same account can log in with a different role scoped session.

---

## API Overview

All endpoints return `{ success, data, error }`.  
All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

| Module | Base Path | Owner |
|---|---|---|
| Auth | `/api/auth` | Joy |
| Vehicles | `/api/vehicles` | Joy |
| Drivers | `/api/drivers` | Joy |
| Trips | `/api/trips` | Joy |
| Maintenance | `/api/maintenance` | Joy |
| Fuel Logs | `/api/fuel-logs` | Suparshv |
| Expenses | `/api/expenses` | Suparshv |
| Reports | `/api/reports` | Suparshv |
| Settings | `/api/settings` | Suparshv |

---

## Revenue Assumption

Trip Revenue is calculated as: **Planned Distance (km) × ₹30/km**  
This is a deliberate simplification to make ROI computable without a pricing engine. All ROI and monthly revenue figures use this formula.

---

## RBAC Permission Matrix

| Role | Fleet | Drivers | Trips | Fuel/Exp | Analytics |
|---|---|---|---|---|---|
| Fleet Manager | ✓ full | ✓ full | – | – | ✓ full |
| Dispatcher | view | – | ✓ full | – | – |
| Safety Officer | – | ✓ full | view | – | – |
| Financial Analyst | view | – | – | ✓ full | ✓ full |

---

## Inspect the Database

```bash
cd backend
npx prisma studio
# → Opens Prisma Studio at http://localhost:5555
```

---

*Built in 8 hours for Odoo Hackathon '26.*
