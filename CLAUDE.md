# TransitOps — Project Bible (CLAUDE.md)

**Smart Transport Operations Platform | Odoo Hackathon '26 | 8-Hour Build**

Team: Suparshv (Team Leader), Joy, Aryan

---

## 0. Golden Rules (read before anything else)

1. **Code Freeze: 05:00 PM.** Final push must happen before this. No exceptions.
2. **Commit every 60 minutes, from your OWN GitHub account.** No exceptions — this is how individual points are assigned.
3. **Commit messages must be descriptive.** Format: `type(scope): what you did`
   Examples: `feat(trips): add cargo weight validation`, `fix(dashboard): correct fleet utilization calc`, `docs: update API routes in readme`
   Never commit as just `"update"` or `"fix"`.
4. **No blind copy-pasting AI code.** Understand it, adapt it, strip unused boilerplate before committing.
5. **Replace all static/mock JSON with live DB calls before final submission.** Judges specifically check for this.
6. **100% offline-compatible.** No cloud auth providers (no Clerk, no Auth0), no cloud API keys required to run the app locally.

---

## 1. Tech Stack

### Frontend
- **Framework:** React (Vite + TypeScript)
- **UI Library:** Shadcn UI + Tailwind CSS
- **Icons:** Lucide React
- **Notifications:** Sonner Toast
- **Charts:** Recharts or Chart.js (for KPI dashboard + analytics)

### Backend
- **Framework:** Express.js (Node.js) — standard REST API
  *(Use FastAPI/Python only if the team has a strong AI/ML analytics need — not required here)*
- **Validation:** Zod (shared schema between frontend + backend) or Express Validator
- **Auth:** Local JWT (`jsonwebtoken`) + `bcryptjs` for password hashing
  - Token stored in LocalStorage or app state (no HttpOnly cookie upgrade needed unless time permits)

### Database
- **Database:** SQLite (zero-config local file: `dev.db`) — no server setup, fully offline
- **ORM:** Prisma ORM (use Prisma Studio to inspect data visually during dev/demo)
- **Offline fallback:** Cache last-known API responses in LocalStorage in case of a live connectivity hiccup during demo

### Version Control
- GitHub, public repo, `main` branch only (no complex branching strategy — time doesn't allow it)

---

## 2. Directory Structure

```
transitops/
├── CLAUDE.md                     # this file
├── README.md                     # setup instructions for judges
├── .env.example
├── .gitignore
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Vehicle, Driver, Trip, Maintenance, FuelLog, Expense, User
│   │   └── dev.db                # sqlite file (gitignored, seed script provided)
│   ├── src/
│   │   ├── index.ts              # express app entrypoint
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verify + role check
│   │   │   └── validate.ts       # zod middleware wrapper
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── vehicles.routes.ts
│   │   │   ├── drivers.routes.ts
│   │   │   ├── trips.routes.ts
│   │   │   ├── maintenance.routes.ts
│   │   │   ├── fuel.routes.ts
│   │   │   ├── expenses.routes.ts
│   │   │   └── reports.routes.ts
│   │   ├── controllers/          # business logic per route file above
│   │   ├── services/
│   │   │   └── statusEngine.ts   # centralized status-flip logic (see Section 4)
│   │   └── utils/
│   │       └── apiResponse.ts    # standard { success, data, error } wrapper
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/                  # axios/fetch wrappers per entity
    │   ├── components/
    │   │   ├── ui/                # shadcn components
    │   │   ├── layout/            # navbar, sidebar
    │   │   └── shared/             # StatusBadge, KpiCard, DataTable, etc.
    │   ├── pages/
    │   │   ├── Login.tsx              # Screen 0 — Auth (RBAC)
    │   │   ├── Dashboard.tsx          # Screen 1
    │   │   ├── VehicleRegistry.tsx    # Screen 2 — "Fleet" in sidebar
    │   │   ├── DriversSafety.tsx      # Screen 3 — "Drivers" in sidebar
    │   │   ├── TripDispatcher.tsx     # Screen 4 — "Trips" in sidebar
    │   │   ├── Maintenance.tsx        # Screen 5
    │   │   ├── FuelExpenses.tsx       # Screen 6
    │   │   ├── Analytics.tsx          # Screen 7 — "Reports & Analytics"
    │   │   └── Settings.tsx           # Screen 8 — Settings & RBAC
    │   ├── context/
    │   │   └── AuthContext.tsx    # RBAC state
    │   ├── hooks/
    │   └── lib/
    │       └── offlineCache.ts    # localStorage fallback layer
    └── package.json
```

**Persistent sidebar (all authenticated screens):** Dashboard · Fleet · Drivers · Trips · Maintenance · Fuel & Expenses · Analytics · Settings
Top bar on every screen: search box (left), signed-in user name + role badge (right, e.g. "Raven K. — Dispatcher").

---

## 3. Team Division of Labor

### 🟦 Joy — Backend
- Prisma schema design (Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense, User)
- Express API routes for all 9 screens (Section 4 above)
- Auth: login with role selection, failed-login counter + account lockout after 5 attempts (Screen 0)
- RBAC middleware enforcing the Section 5 permission matrix on every route
- **Status Engine** (`statusEngine.ts`) — the single source of truth that flips Vehicle/Driver status on every trip/maintenance event (see Section 4 — this is the most important piece of code in the entire project, must be bulletproof)
- Business rule enforcement server-side (uniqueness, capacity check, license checks — Section 4)
- Standard API response wrapper (`{ success, data, error }` — Section 5)
- Seed script for demo data (a few vehicles, drivers, trips pre-loaded so the demo isn't starting from zero)

### 🟩 Aryan — Frontend
- All React pages/screens (Login, Dashboard, Vehicle Registry, Driver Management, Trip Management, Maintenance, Fuel & Expenses, Reports)
- Shadcn/Tailwind UI — consistent color scheme, responsive layout (mobile + desktop)
- Charts for Reports & Analytics (fuel efficiency, utilization, ROI, cost)
- Client-side form validation (mirrors Zod schema used in backend)
- Toast notifications (Sonner) for every state change (dispatch, complete, maintenance created, etc.)
- Persistent navbar/sidebar navigation

### 🟨 Suparshv — Validation, Integration, Docs & Ops (Team Leader)
- **Admin duties (before 10 AM):** select problem statement, create + submit public GitHub repo, add evaluator as collaborator, submit repo link on portal
- Cross-check that client-side and server-side validation actually match (no gaps)
- Edge-case testing: empty fields, overweight cargo, expired license, double-booking, invalid input — confirm each is handled gracefully with clear error messages
- README.md — setup/run instructions for judges
- Own the `CLAUDE.md` / documentation, keep it updated as build evolves
- Coordinate the 1-hour commit rule across the team (gentle nagging is part of the job)
- Own the final demo video: script, record, edit, upload, set to "anyone with the link," submit before 5:45 PM
- Final `git push` and code freeze verification at 5:00 PM

> **Note:** These lanes will overlap. Whoever finishes their slice early jumps in to help the bottleneck — likely Joy's status engine or Aryan's Trip Management screen, since those are the highest-complexity pieces.

---

## 4. UI Mockup Spec — Screen-by-Screen (from Excalidraw board)

This is the source of truth for Aryan's frontend build. Build screens in this exact order; each maps 1:1 to a sidebar item.

### Screen 0 — Authentication (Login)
- Left panel: logo placeholder + "TransitOps — Smart Transport Operations Platform" + "One login, four roles:" list (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst)
- Right panel — Sign in form:
  - **Email** field (e.g. `raven.k@transitops.in`)
  - **Password** field (masked)
  - **Role (RBAC)** dropdown — selected at login (e.g. `Dispatcher`)
  - "Remember me" checkbox + "Forgot password?" link
  - **Sign In** button
  - Small print at bottom: what each role can access after login (Fleet Manager → Fleet, Maintenance; Dispatcher → Dashboard, Trips; Safety Officer → Drivers, Compliance; Financial Analyst → Fuel & Expenses, Analytics)
- **Error state (must implement):**
  - Invalid credentials → inline error
  - **Account locked after 5 failed login attempts** — this is a hard requirement, not just a nice-to-know. Track failed attempts per user (server-side counter), lock account, and show a clear lockout message.

### Screen 1 — Dashboard
- Filter bar: **Vehicle Type**, **Status**, **Region** dropdowns (all default "All")
- KPI cards (exact labels): Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers on Duty, **Fleet Utilization %**
- **Recent Trips** table: Trip ID, Vehicle, Driver, Status (colored badge), ETA
- **Vehicle Status** panel: horizontal bar breakdown of Available / On Trip / In Shop / Retired counts

### Screen 2 — Vehicle Registry ("Fleet" in sidebar)
- Filters: Type, Status, search-by-reg-no
- **+ Add Vehicle** button
- Table columns: Reg. No. (unique), Name/Model, Type, Capacity, Odometer, Acq. Cost, Status (colored badge)
- Footer rule text (surface this in the UI, not just docs): *"Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher"*

### Screen 3 — Drivers & Safety Profiles ("Drivers" in sidebar)
- **+ Add Driver** button
- Table columns: Driver, License No., Category, Expiry (flag visually if expired, e.g. "03/2025 EXPIRED"), Contact, Trip Compl. %, Safety (badge), Status (badge)
- Quick **status toggle buttons** below the table: Available / On Trip / Off Duty / Suspended
- Footer rule text: *"Expired license or Suspended status → blocked from trip assignment"*

### Screen 4 — Trip Dispatcher ("Trips" in sidebar)
- **Trip Lifecycle stepper** at top: `Draft → Dispatched → Completed / Cancelled` (visual progress indicator)
- **Create Trip** form: Source, Destination, Vehicle (available only — dropdown filtered server-side), Driver (available only — dropdown filtered server-side), Cargo Weight (kg), Planned Distance (km)
- **Inline validation error** (must match this pattern exactly): show Vehicle Capacity vs Cargo Weight side by side, e.g.:
  ```
  Vehicle Capacity: 500 kg
  Cargo Weight: 700 kg
  ✗ Capacity exceeded by 200 kg — dispatch blocked
  ```
  → **Dispatch button becomes disabled**, Cancel remains active
- **Live Board** (right panel): card per trip showing Trip ID, route, assigned Vehicle/Driver (or "Unassigned"), status badge, and a note (ETA, "Awaiting driver", "Vehicle went to shop", etc.)
- Footnote under Live Board: *"On Complete: odometer → fuel log → expenses → Vehicle & Driver Available"* — this is literally the completion pipeline, implement in that order

### Screen 5 — Maintenance
- **Log Service Record** form: Vehicle, Service Type, Cost, Date, Status
- **Save** button
- **Service Log** table: Vehicle, Service, Cost, Status (badge)
- Visual state-transition legend (render this on the page, it's good UX and matches the mockup):
  ```
  Available  --[opening active record]--> In Shop
  In Shop    --[closing record, not retired]--> Available
  ```
- Footer rule: *"In Shop vehicles are removed from the dispatch pool"*

### Screen 6 — Fuel & Expense Management
- **+ Log Fuel** and **+ Add Expense** buttons (top right)
- **Fuel Logs** table: Vehicle, Date, Liters, Fuel Cost
- **Other Expenses (Toll / Misc)** table: Trip, Vehicle, Toll, Other, Maint. (linked), Total, Status badge
- **Total Operational Cost (auto) = Fuel + Maint.** — shown as a running total at the bottom, must recompute live as logs are added

### Screen 7 — Reports & Analytics
- KPI cards: **Fuel Efficiency** (km/l), **Fleet Utilization** (%), **Operational Cost** (₹), **Vehicle ROI** (%)
- Formula shown directly in UI (small caption): `ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost`
- **Monthly Revenue** bar chart
- **Top Costliest Vehicles** horizontal bar list (ranked)

### Screen 8 — Settings & RBAC
- **General** panel: Depot Name, Currency (e.g. `INR (Rs)`), Distance Unit (e.g. `Kilometers`), **Save changes** button
- **Role-Based Access (RBAC)** table — render this exact matrix in the Settings UI (see Section 5 below for the authoritative version used in middleware too)

---

## 5. RBAC Permission Matrix (Authoritative — Frontend AND Backend)

This exact matrix comes straight from the mockup and must be enforced in **both** the UI (hide/disable) and the backend middleware (reject unauthorized requests even if someone bypasses the UI).

| Role | Fleet | Drivers | Trips | Fuel/Exp. | Analytics |
|---|---|---|---|---|---|
| **Fleet Manager** | ✓ full | ✓ full | – no access | – no access | ✓ full |
| **Dispatcher** | view only | – no access | ✓ full | – no access | – no access |
| **Safety Officer** | – no access | ✓ full | view only | – no access | – no access |
| **Financial Analyst** | view only | – no access | – no access | ✓ full | ✓ full |

**Legend:** `✓ full` = create/edit/delete, `view only` = read-only, `–` = route/UI hidden entirely (403 if hit directly)

**Implementation note:** Build a single `rolePermissions.ts` config (used by both `auth.ts` middleware on the backend and route guards on the frontend) so this matrix lives in exactly one place. Do not hardcode role checks scattered across controllers.

**Role is selected at login** (per Screen 0) — this is different from typical RBAC where role comes only from the user record. Confirm as a team whether the login-time role dropdown is: (a) purely cosmetic/session-scoped for a demo user who legitimately holds multiple roles, or (b) the actual source of truth for permissions that session. Document the decision in the README — evaluators may ask.

---

## 6. Business Rules & Status-Flipping Logic (CRITICAL — READ CAREFULLY)

This is what evaluators will stress-test most. All of this must be enforced **server-side**, not just in the UI.

### 4.1 Entity Status Values
| Entity  | Statuses |
|---|---|
| Vehicle | `Available`, `On Trip`, `In Shop`, `Retired` |
| Driver  | `Available`, `On Trip`, `Off Duty`, `Suspended` |
| Trip    | `Draft` → `Dispatched` → `Completed` / `Cancelled` |

### 4.2 Hard Validation Rules
- [ ] Vehicle **Registration Number** must be unique (DB-level unique constraint + friendly error message on collision)
- [ ] **Retired** or **In Shop** vehicles must NEVER appear in the vehicle dropdown when creating/dispatching a trip
- [ ] Drivers with an **expired license** (`licenseExpiryDate < today`) OR status `Suspended` must NEVER appear in the driver dropdown
- [ ] A vehicle or driver already `On Trip` cannot be assigned to a second trip
- [ ] **Cargo Weight ≤ Vehicle Max Load Capacity** — reject with clear message if exceeded (e.g. "450kg exceeds Van-05's 400kg capacity")

### 4.3 Status Transition Triggers (the Status Engine)
| Event | Vehicle Status Change | Driver Status Change |
|---|---|---|
| Trip **Dispatched** | → `On Trip` | → `On Trip` |
| Trip **Completed** | → `Available` | → `Available` |
| Trip **Cancelled** (from Dispatched) | → `Available` | → `Available` |
| Maintenance record **created/opened** | → `In Shop` | — |
| Maintenance record **closed** | → `Available` (unless vehicle is `Retired`) | — |

**Implementation rule:** All of these transitions must live in ONE place (`statusEngine.ts`), called by the relevant controllers. Never duplicate this logic inline in route handlers — that's how bugs and inconsistent states creep in under time pressure.

### 4.4 Calculated Fields / Formulas

**Operational Cost per vehicle:**
```
Operational Cost = Total Fuel Cost + Total Maintenance Cost
```

**Fuel Efficiency:**
```
Fuel Efficiency = Total Distance Traveled / Total Fuel Consumed (liters)
```

**Fleet Utilization (%):**
```
Fleet Utilization = (Vehicles Currently On Trip / Total Active Vehicles) × 100
```
*(Active = not Retired)*

**Trip Revenue (assumption, since the source doc doesn't define it):**
```
Trip Revenue = Planned Distance (km) × ₹30/km
```
> This is a deliberate simplification so the ROI formula below is computable without inventing a pricing engine. Sum `Trip Revenue` across all completed trips for a vehicle to get its total Revenue. **State this assumption explicitly in the README** — judges may ask how revenue is derived, and "flat per-km rate, documented as an assumption" is a clean answer.

**Vehicle ROI:**
```
ROI = (Revenue − (Maintenance Cost + Fuel Cost)) / Acquisition Cost
```
Where `Revenue` = sum of `Trip Revenue` (above) for all completed trips on that vehicle.

### 4.5 Example End-to-End Workflow (= your test script AND demo script)
1. Register vehicle `Van-05`, max capacity 500kg, status `Available`
2. Register driver `Alex` with valid (non-expired) license
3. Create trip: cargo weight 450kg → system validates `450 ≤ 500` → allowed
4. Dispatch trip → Van-05 and Alex both flip to `On Trip`
5. Complete trip (enter final odometer + fuel consumed) → both flip back to `Available`
6. Create maintenance record (e.g. "Oil Change") → Van-05 flips to `In Shop`, disappears from dispatch pool
7. Reports auto-update: operational cost, fuel efficiency reflect the new trip + fuel log

---

## 7. Standardized API Response Format

**Every** endpoint returns this shape — no exceptions, no inconsistent responses between routes.

**Success (HTTP 200 / 201):**
```json
{
  "success": true,
  "data": { /* ... */ },
  "error": null
}
```

**Error (HTTP 400 / 401 / 500):**
```json
{
  "success": false,
  "data": null,
  "error": "Descriptive error message"
}
```

Build the `apiResponse.ts` helper first thing — every controller imports it. Example:
```ts
export const ok = (data: any) => ({ success: true, data, error: null });
export const fail = (error: string) => ({ success: false, data: null, error });
```

### Suggested Route List
```
POST   /api/auth/signup
POST   /api/auth/login          # role selected at login; enforce 5-failed-attempt lockout server-side
GET    /api/auth/me
POST   /api/auth/forgot-password

GET    /api/vehicles
POST   /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id

GET    /api/drivers
POST   /api/drivers
GET    /api/drivers/:id
PATCH  /api/drivers/:id
DELETE /api/drivers/:id

GET    /api/trips
POST   /api/trips                 # Draft
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

GET    /api/reports/dashboard      # KPIs for homepage
GET    /api/reports/utilization
GET    /api/reports/roi
GET    /api/reports/top-costliest  # Top Costliest Vehicles list (Screen 7)
GET    /api/reports/monthly-revenue
GET    /api/reports/export.csv

GET    /api/settings
PATCH  /api/settings               # Depot Name, Currency, Distance Unit (Screen 8)
```

**Every route above (except `/api/auth/*`) must be gated by the RBAC matrix in Section 5** — apply the `checkRole(module, action)` middleware per route, not per screen, so a Dispatcher hitting `/api/fuel-logs` directly still gets a `403` even if they'd never see that page in the UI.

---

## 8. Git Protocol (Hourly, Mandatory)

**One-time setup (each member, once):**
```bash
git config --global pull.rebase true
```

**Every ~60 minutes, every member:**
```bash
git add -A
git commit -m "feat(scope): clear description of what changed"
git pull origin main
git push origin main
```

**If a merge conflict happens:**
1. Open the conflicting file(s), manually resolve (`<<<<<<<`, `=======`, `>>>>>>>` markers)
2. `git add -A`
3. `git commit -m "fix: resolved merge conflict in <area>"`
4. `git push origin main`

**Emergency abort (if a pull conflict goes sideways):**
```bash
git merge --abort
# or if mid-rebase:
git rebase --abort
```

**Reminders:**
- Commit from your **own** GitHub account — this is how individual contribution is scored.
- Push directly to `main` (no long-lived feature branches — not enough time in 8 hours to manage them safely).
- Before 10:00 AM: Suparshv creates the public repo, adds the evaluator as a collaborator, submits the repo URL on the portal.

---

## 9. Demo Video Script (Max 5 Minutes)

Based on the official checklist + the Example Workflow (Section 4.5):

| Segment | Time | Content |
|---|---|---|
| 1. Problem Overview | ~20s | One sentence: "Logistics companies rely on spreadsheets to track fleets — TransitOps centralizes vehicle, driver, and trip management in one platform." |
| 2. Live Feature Walkthrough | ~80s | Log in (show role dropdown at login) → show Dashboard KPIs → show Vehicle Registry + Drivers & Safety Profiles (clean UI, responsive) |
| 3. Core Workflow (Dynamic Data) | ~80s | Register Van-05 (500kg) + driver Alex → create trip with 450kg cargo → dispatch → show both flip to "On Trip" live on the Live Board → complete trip → both flip back to "Available" |
| 4. Validation & Edge Cases | ~40s | Try to: (a) exceed cargo capacity → inline error blocks dispatch, (b) assign a suspended/expired-license driver → rejected, (c) 5 failed logins → account lockout shown |
| 5. Maintenance + Reports | ~40s | Create maintenance record → vehicle flips to "In Shop," vanishes from dispatch pool → show Reports/Analytics page (fuel efficiency, operational cost, ROI, top costliest vehicles) |
| 6. RBAC | ~15s | Quick flash of Settings & RBAC screen showing the permission matrix |
| Close | ~5s | Quick mention of tech stack + "thank you" |

**Reminders:**
- Total video ≤ 5 minutes (official notice extended it from 2 to 5 minutes — don't ramble regardless)
- Upload as unlisted YouTube or Google Drive link, set to "Anyone with the link can view"
- Suparshv submits the link under "Submit Problem Solution" before 05:45 PM

---

## 10. Priority Order (If Time Runs Short)

**Must-have, in build order:**
1. Auth (JWT login/signup, role selected at login, 5-failed-attempt lockout) + RBAC middleware using the Section 5 matrix
2. Vehicle + Driver CRUD (Screens 2 & 3)
3. Trip creation + dispatch/complete/cancel with all validation rules + Live Board (Screen 4)
4. Status Engine wired correctly (this is the #1 thing evaluators will poke at)
5. Maintenance workflow (auto status flip, Screen 5)
6. Dashboard KPIs (Screen 1)
7. Fuel/Expense logging + cost rollups (Screen 6)
8. Reports & Analytics (Screen 7) + Settings & RBAC display (Screen 8)

**Bonus, only if finished early (do NOT start these before #1-7 above are solid):**
- Charts/visual analytics polish
- PDF export (CSV is the mandatory one — this is extra)
- Email reminders for expiring licenses
- Vehicle document uploads
- Dark mode
- HttpOnly cookie upgrade for JWT (CSRF/XSS hardening)

---

## 11. Evaluation Checklist (Self-Audit Before Submission)

- [ ] Dynamic/real-time data — no leftover static JSON, everything hits the live DB
- [ ] Clean, responsive UI — consistent colors, works on mobile and desktop
- [ ] Robust input validation — client AND server side, edge cases handled with clear messages
- [ ] RBAC matrix (Section 5) enforced on both frontend routes/UI and backend middleware — not just one or the other
- [ ] Account lockout after 5 failed login attempts actually works (test it)
- [ ] Intuitive navigation — persistent navbar, consistent spacing/padding
- [ ] Proper git version control — every member committed from their own account, hourly, with meaningful messages
- [ ] Backend API + local database — real REST endpoints, SQLite via Prisma
- [ ] No blind copy-pasting — code is understood and adapted, no unused boilerplate left in
- [ ] Offline/local fallback — app doesn't depend on internet connectivity or cloud auth
- [ ] Purposeful tech stack — nothing added just to look trendy

---

*Last updated: build day — keep this file current as decisions change.*
