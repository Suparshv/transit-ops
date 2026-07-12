# TransitOps — Design.md

**Design Specification | Derived from Excalidraw Wireframes + CLAUDE.md**

This document translates the 9 hand-drawn wireframe screens into a concrete design system: layout rules, components, colors, typography, and per-screen specs. Use this as the reference when building the UI (whichever tool/method you use).

---

## 1. Overall Layout Pattern

Every authenticated screen (1 through 8) shares the same shell:

```
┌─────────────┬──────────────────────────────────────────────┐
│             │  [Search box]           [User Name] [Role]   │  ← Top bar
│  TransitOps │──────────────────────────────────────────────│
│             │                                              │
│  Dashboard  │                                              │
│  Fleet      │                                              │
│  Drivers    │              PAGE CONTENT                    │
│  Trips      │                                              │
│  Maintenance│                                              │
│  Fuel & Exp │                                              │
│  Analytics  │                                              │
│  Settings   │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
   ← Sidebar (fixed, ~180px)
```

- **Sidebar:** fixed width, left-aligned nav list, app name/logo at top. Active page has a distinct highlighted state (colored left border + slightly filled background in the wireframes).
- **Top bar:** search input pinned left, user identity pinned right — always shows the logged-in user's name + a role badge (pill/rounded rect) right next to it (e.g. "Raven K." + "Dispatcher" badge with initials avatar "RK").
- **Content area:** everything below/right of the top bar, scrollable independently of the sidebar.
- Screen 0 (Login) is the only screen that does NOT use this shell — it's a standalone two-panel split layout.

---

## 2. Color System

### Base
| Token | Use |
|---|---|
| Near-black background | Main app background, sidebar background |
| Slightly lighter panel background | Cards, tables, form containers, top bar |
| Thin light-gray/white border (low opacity) | Card outlines, table dividers, section separators — **borders, not drop shadows**, throughout |
| White / light-gray text | Primary text |
| Muted gray text | Labels, captions, footer rule text, placeholder text |

### Accent
| Token | Use |
|---|---|
| Amber/orange (warm accent) | Primary buttons ("Sign In", "+ Add Vehicle", "+ Add Driver", "Save", "+ Log Fuel"), active sidebar item highlight, key numeric emphasis (e.g. Total Operational Cost figure), section icons |

### Status Colors (functional — applied consistently as badges across every screen)
| Color | Meaning |
|---|---|
| Green | Available (vehicle/driver), Completed (trip/maintenance) |
| Blue | On Trip, Dispatched |
| Orange | In Shop, Pending/Active maintenance |
| Red | Retired, Suspended, Cancelled, expired license flags |
| Gray | Draft, Off Duty |

Badge style: small rectangular/rounded-rect tag, solid-but-muted background fill with matching text color — not oversaturated blocks. Consistent sizing across every table in the app.

### Error/Validation
- Red-bordered callout box with red "✗" icon prefix for blocking validation errors (see Trip Dispatcher spec below) — dashed or solid red border, dark red-tinted background fill.

---

## 3. Typography

- Page title: large, top-left of content area, prefixed with its screen number in the wireframes for reference (e.g. "1. Dashboard") — **drop the number prefix in the real build**, just show "Dashboard".
- Section labels / table headers: small, uppercase, muted-gray, letter-spaced (e.g. "RECENT TRIPS", "VEHICLE STATUS", "REG. NO. (UNIQUE)")
- Body/table text: regular weight, light gray/white
- KPI numbers: large, bold, high contrast — the most visually dominant element on any card
- Footer rule/note text: small, italic or muted-colored (amber/orange in the wireframes), sits directly under the relevant table — these are **business-rule reminders surfaced in the UI**, not just documentation (e.g. "Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher")

---

## 4. Core Components

### KPI Card
- Rectangular card, colored left border (border color = semantic: green for "available/good", blue for "active", orange for "attention", etc.)
- Small uppercase label at top ("ACTIVE VEHICLES")
- Large number/value below
- Used on: Dashboard (7 cards), Analytics (4 cards)

### Status Badge
- See Color System above. Same component reused everywhere: Fleet status, Driver status, Trip status, Maintenance status, Expense status.

### Data Table
- Header row: uppercase muted labels
- Rows: alternating readability via subtle row separators (not zebra-striping in the wireframes — thin horizontal rules)
- Status column always rendered as a Badge, right-aligned or in a consistent column position
- Filter/search controls sit directly above the table (dropdowns + search box), not in a separate modal

### Form (Add/Log entities)
- Vertical stacked fields, label above input (small uppercase label, e.g. "VEHICLE", "SERVICE TYPE", "COST")
- Primary action button (amber, full-width or prominent) at the bottom
- Used for: Login, Add Vehicle, Add Driver, Create Trip, Log Service Record, Log Fuel, Add Expense, Settings/General

### Inline Validation Callout
- Appears directly below the relevant form (not a modal, not a toast-only) when a blocking rule is violated
- Shows the specific numbers in conflict, then a line with "✗" + plain-English consequence
- Exact pattern (from Trip Dispatcher wireframe):
  ```
  Vehicle Capacity: 500 kg
  Cargo Weight: 700 kg
  ✗ Capacity exceeded by 200 kg — dispatch blocked
  ```
- When this callout is showing, the primary action button (e.g. "Dispatch") becomes visibly disabled; the secondary action (e.g. "Cancel") stays active

### Stepper / Lifecycle Indicator
- Horizontal row of connected nodes representing a linear state machine
- Used once: Trip Lifecycle (`Draft → Dispatched → Completed → Cancelled`) at the top of the Trip Dispatcher screen
- Current state node is filled/highlighted (amber or blue), future states are dim/gray, connecting line between them

### Live Board / Activity Feed
- Vertical stack of bordered cards, each representing one live entity (a Trip)
- Each card: primary identifier (Trip ID) + route description, assigned resources (Vehicle/Driver or "Unassigned"), a status badge, and a small secondary note line (ETA, "Awaiting driver", "Vehicle went to shop")
- Used on: Trip Dispatcher screen, right-hand panel

### State-Transition Legend
- Small inline diagram: `State A --(trigger condition)--> State B`
- Used on: Maintenance screen, to visually document the two automatic status flips
- Rendered directly in the UI as a subtle reference, not just internal documentation

### Toggle Button Group
- Row of buttons representing mutually exclusive states, used as a quick-action control
- Used on: Drivers & Safety Profiles screen ("TOGGLE STATUS": Available / On Trip / Off Duty / Suspended)

### Chart Components
- **Bar chart** — Monthly Revenue (Analytics), vertical bars, muted single-hue coloring
- **Horizontal ranked bar list** — Top Costliest Vehicles (Analytics), Vehicle Status breakdown (Dashboard) — each row is a labeled bar whose fill length is proportional to its value, colored semantically

---

## 5. Screen-by-Screen Design Spec

### Screen 0 — Login
- **Layout:** two-panel split, roughly 40/60 width
- **Left panel:** light/neutral background (contrast against the dark right panel), logo placeholder (square icon), app name "TransitOps", tagline "Smart Transport Operations Platform", a bulleted "One login, four roles:" list, footer copyright line
- **Right panel:** dark background, form title "Sign in to your account" + subtitle, then:
  - Email input
  - Password input (masked)
  - Role (RBAC) dropdown — this is a **selectable field at login**, not read-only
  - "Remember me" checkbox (left) + "Forgot password?" link (right), same row
  - Primary "Sign In" button (amber, full-width)
  - Caption block below explaining per-role access scope
- **Error state (side annotation in wireframe, render inline in real build):** red-bordered dashed callout: "✗ Invalid credentials." + "Account locked after 5 failed attempts."

### Screen 1 — Dashboard
- Filter row: Vehicle Type / Status / Region dropdowns, all default "All"
- 7 KPI cards in a single row: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers on Duty, Fleet Utilization %
- Below: two-column split —
  - Left/wide: "Recent Trips" table (Trip, Vehicle, Driver, Status badge, ETA)
  - Right/narrow: "Vehicle Status" — horizontal ranked bars for Available / On Trip / In Shop / Retired

### Screen 2 — Fleet (Vehicle Registry)
- Filter row: Type dropdown, Status dropdown, search-by-reg-no input, "+ Add Vehicle" button pinned top-right
- Table: Reg. No. (unique), Name/Model, Type, Capacity, Odometer, Acq. Cost, Status badge
- Footer rule text directly under table (amber/muted): "Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher"

### Screen 3 — Drivers & Safety Profiles
- "+ Add Driver" button top-right
- Table: Driver, License No., Category, Expiry (visually flag expired dates, e.g. "03/2025 EXPIRE[D]"), Contact, Trip Compl. %, Safety badge, Status badge
- Below table: "TOGGLE STATUS" button group (Available / On Trip / Off Duty / Suspended)
- Footer rule text: "Expired license or Suspended status → blocked from trip assignment"

### Screen 4 — Trips (Trip Dispatcher)
- Top: "TRIP LIFECYCLE" stepper (Draft → Dispatched → Completed → Cancelled)
- Left column: "CREATE TRIP" form — Source, Destination, Vehicle (available only), Driver (available only), Cargo Weight (kg), Planned Distance (km)
- Inline validation callout appears below the form when capacity is exceeded (see Component spec above); Dispatch button disables, Cancel stays enabled
- Right column: "LIVE BOARD" — stacked trip cards (Trip ID, route, assigned resources or "Unassigned", status badge, note)
- Footer caption under Live Board: "On Complete: odometer → fuel log → expenses → Vehicle & Driver Available"

### Screen 5 — Maintenance
- Left column: "LOG SERVICE RECORD" form — Vehicle, Service Type, Cost, Date, Status, "Save" button (amber, full-width of form column)
- Right column: "SERVICE LOG" table — Vehicle, Service, Cost, Status badge
- Below the form: state-transition legend showing `Available → In Shop` (on opening active record) and `In Shop → Available` (on closing, if not retired)
- Footer note: "In Shop vehicles are removed from the dispatch pool"

### Screen 6 — Fuel & Expense Management
- Top-right: "+ Log Fuel" and "+ Add Expense" buttons (both amber, side by side)
- "FUEL LOGS" table: Vehicle, Date, Liters, Fuel Cost
- "OTHER EXPENSES (TOLL / MISC)" table: Trip, Vehicle, Toll, Other, Maint. (linked), Total, Status badge
- Bottom bar: "TOTAL OPERATIONAL COST (AUTO) = FUEL + MAINT" label with the computed sum in large amber text, right-aligned

### Screen 7 — Analytics (Reports & Analytics)
- 4 KPI cards in a row: Fuel Efficiency (km/l), Fleet Utilization (%), Operational Cost (currency), Vehicle ROI (%)
- Small formula caption directly below the KPI row: "ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost"
- Two-column split below:
  - Left: "MONTHLY REVENUE" bar chart (7 bars/months)
  - Right: "TOP COSTLIEST VEHICLES" — horizontal ranked bar list, 3 vehicles, each a different semantic color (visually ranks highest-cost first)

### Screen 8 — Settings & RBAC
- Left column: "GENERAL" form — Depot Name, Currency (e.g. "INR (₹)"), Distance Unit (e.g. "Kilometers"), "Save changes" button
- Right column: "ROLE-BASED ACCESS (RBAC)" — a static reference table matching the permission matrix below

---

## 6. RBAC Matrix (render exactly this on Screen 8, enforce it everywhere else)

| Role | Fleet | Drivers | Trips | Fuel/Exp. | Analytics |
|---|---|---|---|---|---|
| Fleet Manager | ✓ | ✓ | – | – | ✓ |
| Dispatcher | view | – | ✓ | – | – |
| Safety Officer | – | ✓ | view | – | – |
| Financial Analyst | view | – | – | ✓ | ✓ |

`✓` = full access · `view` = read-only · `–` = no access (hidden nav item + blocked route)

---

## 7. Interaction & Feedback Rules

- Every state-changing action (Dispatch, Complete, Cancel a trip; Save a maintenance record; Log fuel/expense; toggle a driver's status) triggers a toast notification confirming the result.
- Blocking validation is shown **inline, next to the form**, not only as a toast — the person needs to see *why* an action is blocked without hunting for it.
- Dropdowns that are supposed to be filtered (Vehicle/Driver pickers in Trip creation) only ever show eligible options — ineligible ones are not shown greyed-out, they're simply absent from the list, per the wireframe's "(AVAILABLE ONLY)" labels.
- Footer rule-text under tables is a deliberate design choice from the wireframes — always surface the governing business rule directly under the data it affects, in a small muted/amber caption, not buried in a tooltip or hidden.

---

## 8. Responsive Notes

- Sidebar collapses to an icon-only rail or a hamburger-triggered drawer on mobile widths.
- KPI card rows wrap to 2-column or 1-column grid on narrow viewports rather than horizontal-scrolling.
- Tables scroll horizontally within their container on mobile rather than breaking the page layout.
- Two-column screens (Trip Dispatcher, Maintenance, Analytics) stack vertically on mobile — form/left content first, then the table/board/chart content.

---

*This file documents the design intent from the wireframes; pair it with CLAUDE.md Sections 4–6 for the underlying data/business-rule logic each screen enforces.*
