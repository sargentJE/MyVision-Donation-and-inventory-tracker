# Product Requirements Document
## MyVision Oxfordshire — Resource Centre Equipment Tracker

**Version:** 1.1
**Author:** Jamie Sargent, Technology & Equipment Officer
**Date:** 2 April 2026
**Status:** Final (amendments applied)

---

## 1. Purpose

MyVision Oxfordshire's resource centre holds a growing inventory of assistive technology — digital magnifiers, CCTVs, text-to-speech devices, tablets, smartphones, and monitors. This equipment spans three ownership categories with different operational rules around loan eligibility, demonstration use, and sale.

Currently there is no centralised system for tracking what is held, its condition, who has it on loan, or its history. This creates operational risk: items may be lost or unaccounted for, loan agreements are informal, and there is no audit trail for donated goods or donor acknowledgements.

This document defines requirements for a self-hosted internal web application to manage the full lifecycle of resource centre equipment.

---

## 2. Goals

- Provide a single source of truth for all equipment held in the resource centre.
- Enforce business rules around loan eligibility based on acquisition type.
- Enable staff to check items in and out quickly, including via QR code scanning.
- Generate a simple loan receipt PDF for client-facing handovers.
- Track donor acknowledgement records for donated equipment.
- Surface operational alerts via an in-app notification centre.
- Provide a dedicated view of purchased items available for sale to clients.
- Maintain a full, append-only audit trail of all lifecycle events.
- Support bulk CSV import for initial migration from existing records.

### Out of Scope (v1)

- CharityLog API integration (a cross-reference ID field is included; no API calls are made).
- Photo or condition image attachments.
- Email notifications of any kind.
- Sale transaction workflow — recording buyer, price, and date against a sale. A view-only sale stock tab is in scope for v1.
- Client portal or client-facing access.

---

## 3. Users, Roles, and Authentication

### 3.1 Roles

| Role | Description |
|---|---|
| **Admin** | Full access. Can create and edit all records, decommission and archive items, manage users and roles, reclassify acquisition types, and flag items for sale. |
| **Staff** | Can view all inventory and history. Can create equipment records and log loans, returns, reservations, and demo visits. Cannot decommission, archive, reclassify, flag for sale, or manage users. |

### 3.2 Permission Summary

| Action | Admin | Staff |
|---|---|---|
| View item, history, and audit log | Yes | Yes |
| Create equipment item | Yes | Yes |
| Edit equipment metadata | Yes | Yes (excludes serial number and acquisition type) |
| Reserve item | Yes | Yes |
| Issue loan | Yes | Yes |
| Return loan | Yes | Yes |
| Convert loan to allocation | Yes | Yes |
| Allocate item directly | Yes | Yes |
| Start / return demo visit | Yes | Yes |
| Reclassify acquisition type | Yes | No |
| Decommission item | Yes | No |
| Archive / restore record | Yes | No |
| Flag / unflag item for sale | Yes | No |
| Anonymise client record | Yes | No |
| Manage users and roles | Yes | No |
| Edit own profile / Change own password | Yes | Yes |

**Edit scope:** Staff can edit name, make, model, condition, condition notes, and general notes on any non-decommissioned item. Serial number and acquisition type editing are Admin-only regardless of status.

### 3.3 Authentication and Session Management

- Authentication uses JWT stored as an httpOnly cookie. JWT expiry: 60 minutes.
- A refresh token (httpOnly cookie, 7-day expiry) silently reissues the JWT without requiring re-login.
- On user deactivation (`active = false`), all refresh tokens for that user are invalidated immediately via a blocklist keyed on `userId`.
- Password reset is Admin-managed. Admins can reset passwords on behalf of staff via the admin panel. No SMTP configuration required.
- Self-service password change: authenticated users can change their own password via `/settings`. This requires verification of the current password. On success, all refresh tokens for the user are revoked and the user is redirected to the login page.
- Self-service profile edit: authenticated users can update their own name and email via `/settings`.
- Rate limiting: `@nestjs/throttler` applied globally at 300 requests per minute per IP.
- Any unauthenticated request — including QR code scans from an unrecognised browser — redirects to `/login?redirect=[original URL]` and forwards back after authentication.

### 3.4 First Admin Bootstrap

On a fresh deployment the database is empty. The initial Admin account is created via an idempotent Prisma seed script that runs automatically in the API container entrypoint, after migrations complete. If a user with `SEED_ADMIN_EMAIL` already exists, the script skips creation safely.

Seed credentials are set via environment variables: `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. The seed password must be changed via the admin panel immediately after first login.

---

## 4. State Model

### 4.1 Principle

The system separates three independent concerns on every equipment record:

- **Acquisition type** — how the item entered stock. Determines which operational pathways are available. Set at creation and changeable only by Admins.
- **Operational status** — what the item is currently doing. Transitions throughout the item's life according to defined rules.
- **Archive flag** — whether the record appears in day-to-day operational views. Independent of status.

An item may be both decommissioned and archived simultaneously. Decommissioned means the item is no longer operationally usable. Archived means the record is removed from active views but remains fully accessible for history, audit, and reporting.

### 4.2 Acquisition Types and Initial Statuses

| Acquisition Type | Description | Initial Status |
|---|---|---|
| `PURCHASED` | Bought by MyVision with organisational funds | `AVAILABLE_FOR_DEMO` |
| `DONATED_DEMO` | Donated; retained for demonstration purposes | `AVAILABLE_FOR_DEMO` |
| `DONATED_GIVEABLE` | Donated; available for loan or permanent allocation to clients | `AVAILABLE_FOR_LOAN` |

Initial status is set server-side from acquisition type at creation. The intake form reflects this, but the API enforces it regardless of what the client sends.

### 4.3 Operational Statuses

| Status | Applies To | Description |
|---|---|---|
| `AVAILABLE_FOR_LOAN` | DONATED_GIVEABLE | Held by MyVision; can be reserved or issued |
| `RESERVED` | DONATED_GIVEABLE | Held for a named client pending formal issue |
| `ON_LOAN` | DONATED_GIVEABLE | Issued to a client; expected to be returned |
| `ALLOCATED_OUT` | DONATED_GIVEABLE | Given to a client on an indefinite basis; no planned return |
| `AVAILABLE_FOR_DEMO` | PURCHASED, DONATED_DEMO | Held for demonstration, training, or trial use |
| `ON_DEMO_VISIT` | PURCHASED, DONATED_DEMO | Temporarily taken out for an appointment, home visit, or workshop |
| `DECOMMISSIONED` | Any | Removed from operational use — broken, obsolete, lost, or unsafe |

### 4.4 Archive Flag

| Field | Type |
|---|---|
| `isArchived` | boolean, default false |
| `archivedAt` | timestamp, nullable |
| `archivedByUserId` | FK → User, nullable |
| `archiveReason` | string, nullable |

Records commonly archived: DECOMMISSIONED items, ALLOCATED_OUT items once historical, discontinued demo stock. Records that should remain unarchived: any item in an active operational status.

### 4.5 Transition Rules

All transitions are enforced server-side. The frontend reflects valid options contextually; the API rejects invalid transitions with HTTP 422.

**DONATED_GIVEABLE (loanable) pathway:**

```
AVAILABLE_FOR_LOAN  →  RESERVED               (reservation created)
AVAILABLE_FOR_LOAN  →  ON_LOAN                (loan issued directly)
RESERVED            →  ON_LOAN                (reservation converted to loan)
RESERVED            →  AVAILABLE_FOR_LOAN     (reservation cancelled)
ON_LOAN             →  AVAILABLE_FOR_LOAN     (loan returned)
ON_LOAN             →  ALLOCATED_OUT          (converted to indefinite allocation)
ON_LOAN             →  DECOMMISSIONED         (lost or damaged — Admin only)
ALLOCATED_OUT       →  DECOMMISSIONED         (Admin only — exceptional)
```

**PURCHASED / DONATED_DEMO (demo) pathway:**

```
AVAILABLE_FOR_DEMO  →  ON_DEMO_VISIT          (demo visit started)
ON_DEMO_VISIT       →  AVAILABLE_FOR_DEMO     (demo visit returned)
AVAILABLE_FOR_DEMO  →  DECOMMISSIONED         (Admin only)
```

**Decommissioning with active dependent records:**
If an Admin decommissions an item that has an active reservation (`RESERVED`) or is on a demo visit (`ON_DEMO_VISIT`), the system warns and asks for confirmation. On confirmation, the dependent record (Reservation or DemoVisit) is automatically closed with the `DECOMMISSIONED` enum value on its `closedReason` field before the status transition completes.

**DECOMMISSIONED:** no transition back to any active status in v1.

---

## 5. Functional Requirements

### 5.1 Equipment Management

- Create equipment via the guided intake form.
- Edit metadata fields on any existing record (role restrictions per section 3.2).
- Reclassify acquisition type (Admin only) with a mandatory reason note. On reclassification, the system checks status compatibility:
  - **Compatible status** (e.g. AVAILABLE_FOR_DEMO on a PURCHASED item reclassified to DONATED_DEMO): status unchanged.
  - **Incompatible status, item idle** (e.g. AVAILABLE_FOR_DEMO reclassified to DONATED_GIVEABLE): status auto-transitions to AVAILABLE_FOR_LOAN. Confirmation dialog shows the consequence.
  - **Incompatible status, item active** (e.g. ON_DEMO_VISIT reclassified to DONATED_GIVEABLE): reclassification blocked with 422 — "Cannot reclassify while item is on a demo visit. Return the item first."
  - **DECOMMISSIONED**: always compatible — reclassification proceeds without status change.
- Decommission (Admin only): requires a reason note; sets `decommissionedAt`, `decommissionedByUserId`, `decommissionReason`.
- Archive (Admin only): sets `isArchived`, `archivedAt`, `archivedByUserId`, `archiveReason`.
- Restore archived record (Admin only) with a reason note.
- Generate and print a QR code label per item.

### 5.2 QR Codes

Each equipment record has a unique stable URL: `/equipment/[id]`. A QR code encodes this URL and can be printed from the item detail page.

**Label content:** Item name, make and model, serial number, system ID, and MyVision Oxfordshire name/logo. Format: Avery L7160 (63.5mm × 38.1mm). The label must include enough plain text that the item is identifiable if the QR code is damaged.

**Scan behaviour:**
- Authenticated: opens item detail page with contextually available actions.
- Unauthenticated: redirects to login, then forwards to item page.

### 5.3 Reservations

Reservations are stored as first-class records with full metadata.

- Creating a reservation: sets status → `RESERVED`; creates Reservation record.
- Converting to loan: closes Reservation with `closedReason = ReservationCloseReason.CONVERTED_TO_LOAN`; creates Loan; status → `ON_LOAN`.
- Cancelling: closes Reservation with `closedReason = ReservationCloseReason.CANCELLED`; status → `AVAILABLE_FOR_LOAN`.
- Auto-cancellation on decommission: `closedReason = ReservationCloseReason.DECOMMISSIONED`.

### 5.4 Loans

Loan eligibility: only `DONATED_GIVEABLE` items with status `AVAILABLE_FOR_LOAN` or `RESERVED`. Enforced server-side.

- **Issue loan:** creates Loan record; records `conditionAtLoan`; status → `ON_LOAN`.
- **Return:** sets `returnedAt`; optionally records `conditionAtReturn`; `closedReason = LoanCloseReason.RETURNED`; status → `AVAILABLE_FOR_LOAN`.
- **Convert to allocation:** `closedReason = LoanCloseReason.CONVERTED_TO_ALLOCATION`, `returnedAt = now()`; creates Allocation record with `originatingLoanId`; status → `ALLOCATED_OUT`.
- **Decommission on loan** (Admin only): `closedReason = LoanCloseReason.DECOMMISSIONED`; status → `DECOMMISSIONED`.

A loan receipt PDF may be generated at any point after loan issuance (see section 5.7).

### 5.5 Allocations

An item may be allocated directly (no prior loan) or via conversion from an active loan. Both paths create an Allocation record.

- **Direct allocation:** creates Allocation with `originatingLoanId = null`; status → `ALLOCATED_OUT`.
- **Via loan conversion:** see section 5.4.

The Allocation table enforces a unique constraint on `equipmentId` — one active allocation per item.

### 5.6 Demo Visits

Applies to `PURCHASED` and `DONATED_DEMO` items.

- **Start:** records destination/context (free text), who is taking the item, and optional expected return date; status → `ON_DEMO_VISIT`.
- **Return:** records actual return; optionally updates condition (Condition enum); `closedReason = DemoVisitCloseReason.RETURNED`; status → `AVAILABLE_FOR_DEMO`.
- **Auto-close on decommission:** `closedReason = DemoVisitCloseReason.DECOMMISSIONED` before status transitions.

### 5.7 Loan Receipt PDF

Generated server-side via `@react-pdf/renderer`. Available to download from the loan confirmation screen and from the loan detail page at any time.

Content: MyVision Oxfordshire header and logo, item name/make/model/serial number, client display name and CharityLog ID, loan date, expected return date (if set), condition at loan, staff name, printed signature line, single-line terms statement.

The v1 PDF is not a tagged document and is not screen-reader accessible as a file. The on-screen loan record is the accessible equivalent.

### 5.8 Donation Acknowledgements

For all donated equipment:
- Donor name, organisation (optional), and donation date stored against a Donation record.
- Multiple items may be linked to one Donation record.
- Acknowledgement sent flag (boolean, manually toggled by staff).
- Donations view shows all donors, their items, and acknowledgement status.

### 5.9 Sale Stock View

A dedicated **For Sale** tab on the inventory page shows purchased items currently available for sale.

- **Flag for sale** (Admin only): sets `isForSale = true` on any `PURCHASED` item that is not `DECOMMISSIONED`.
- **Unflag** (Admin only): sets `isForSale = false`.
- The For Sale tab shows: item name, make/model, condition, date added. No transaction fields in v1.
- Sale transaction workflow (buyer, price, date, SOLD status) is deferred to v2.

### 5.10 In-App Notification Centre

A notification centre, accessible via a bell icon in the header, surfaces time-sensitive operational alerts.

**Triggers and resolution:**

| Trigger | Condition | Resolved when |
|---|---|---|
| `LOAN_OVERDUE` | Active loan past `expectedReturn` | Loan returned or closed |
| `RESERVATION_EXPIRED` | Reservation past `expiresAt` | Reservation converted or cancelled |
| `DEMO_VISIT_OVERDUE` | DemoVisit past `expectedReturn` | Demo visit returned or closed |

**Deduplication:** the nightly cron only creates a notification if no unresolved notification of the same type for the same entity already exists (`type + relatedEntityId + resolvedAt IS NULL`). This prevents duplicate alerts for the same overdue item on successive nights.

**Behaviour:**
- All active users (Admin and Staff) see all notifications.
- Each notification has a per-user read state (NotificationRead join table).
- Bell icon shows unread count badge; badge must not convey information by colour alone (WCAG 1.4.1).
- Clicking a notification navigates to the relevant record and marks it read.
- Resolved notifications remain visible but visually distinguished.
- Notification list is paginated (20 per page).

**Cron schedule:** 06:00 UTC daily. Configurable via `CRON_SCHEDULE` environment variable (cron expression format, default `0 6 * * *`). On error, logs the full error with stack trace; does not retry until the next scheduled run. No catch-up mechanism needed — the check is stateless (examines current state, not deltas). Before creating new notifications, the cron resolves any existing notifications whose triggering condition no longer applies (e.g. a loan returned between the expectedReturn date and the cron run).

**Delivery:** frontend polls `/notifications/unread-count` every 60 seconds for badge updates. No WebSocket or SSE infrastructure required.

### 5.11 Bulk CSV Import (Pre-Go-Live)

A one-time import script to migrate existing records before go-live. Required deliverable before staff onboarding.

**Expected CSV columns:**

| Column | Required | Notes |
|---|---|---|
| `name` | Yes | |
| `acquisitionType` | Yes | PURCHASED, DONATED_DEMO, or DONATED_GIVEABLE |
| `deviceCategory` | Yes | Must match DeviceCategory enum values |
| `make` | No | |
| `model` | No | |
| `serialNumber` | No | Must be unique if provided |
| `condition` | No | GOOD, FAIR, or POOR |
| `acquiredAt` | No | ISO date format |
| `donorName` | Conditional | Required if DONATED_DEMO or DONATED_GIVEABLE |
| `donorOrg` | No | |
| `purchasePrice` | No | If PURCHASED |
| `supplier` | No | If PURCHASED |

Initial `operationalStatus` is derived server-side from `acquisitionType` — it is not read from the CSV.

The import runs as a NestJS CLI command: `npm run import:equipment -- --file=path/to/file.csv`. A `--dry-run` flag validates all rows without inserting. Dry-run must pass cleanly before a live import is attempted.

The import is a CLI-only operation in v1 — it is run by the developer or system administrator via SSH or Coolify's terminal, not by staff through the web UI. It is a one-time pre-go-live task.

### 5.12 Reporting and Export

All exports are CSV. Filters apply to all reports where relevant.

- **Full inventory:** all items; filterable by status, category, acquisition type, archived state.
- **Active loans:** items currently on loan; shows client display name, CharityLog ID, days elapsed.
- **Overdue loans:** active loans past expected return date.
- **Active demo visits:** items currently out on a demo visit.
- **Allocations:** all permanently allocated items; client and allocation date.
- **Donated-giveable utilisation:** available vs on loan vs allocated (count summary).

### 5.13 Client Records

Minimal record. CharityLog is the authoritative source for full personal data.

Fields:
- `charitylogId` — required, unique. Primary deduplication key.
- `displayName` — first name and last initial only (e.g. "Jamie S.").

No phone, email, address, or notes are stored. CharityLog ID is the cross-reference for staff to look up full details in the CRM.

**Deduplication:** if a CharityLog ID already exists in the system, submission is blocked and the existing record is shown.

**Inline creation:** client records can be created inline during loan or allocation creation without leaving the flow.

**Anonymisation** (Admin only, irreversible): sets `displayName = "Anonymised"`, sets `isAnonymised = true`. The CharityLog ID is retained for audit trail integrity.

### 5.14 User Management

- Admin can create, edit, deactivate, and reactivate user accounts.
- Admin can reset any user's password.
- Role assignment (Admin / Staff) is set at creation and editable by Admin.
- Deactivating a user immediately invalidates all their refresh tokens.
- Deactivated users cannot log in but their records remain in the audit log.

---

## 6. Audit Event Taxonomy

Every meaningful lifecycle event writes an AuditEntry. The audit log is append-only — no entry may be edited or deleted.

| Event | Trigger |
|---|---|
| `ITEM_CREATED` | New equipment record added |
| `ITEM_EDITED` | Any metadata field changed (logs field, old value, new value) |
| `ACQUISITION_RECLASSIFIED` | Acquisition type changed |
| `RESERVED` | Reservation created |
| `RESERVATION_CANCELLED` | Reservation closed without conversion |
| `LOAN_ISSUED` | Loan record created |
| `LOAN_RETURNED` | Loan `returnedAt` set |
| `LOAN_CONVERTED_TO_ALLOCATION` | Loan closed; Allocation created |
| `ALLOCATED_DIRECTLY` | Allocation created without prior loan |
| `DEMO_VISIT_STARTED` | DemoVisit record created; status → ON_DEMO_VISIT |
| `DEMO_VISIT_RETURNED` | DemoVisit `returnedAt` set; status → AVAILABLE_FOR_DEMO |
| `DECOMMISSIONED` | Status → DECOMMISSIONED |
| `ARCHIVED` | `isArchived` set to true |
| `ARCHIVE_RESTORED` | `isArchived` set to false |
| `SALE_FLAGGED` | `isForSale` set to true |
| `SALE_FLAG_REMOVED` | `isForSale` set to false |
| `USER_CREATED` | New user account added |
| `USER_DEACTIVATED` | User `active` set to false |

---

## 7. Data Model

See [schema.prisma](./technical/schema.md) for the authoritative Prisma implementation. The schema is the build reference.

**Model summary:**

```
Equipment         — central model; all lifecycle activity references it
Client            — minimal PII only (CharityLog ID + display name)
Donation          — donor records; one-to-many with Equipment
Reservation       — first-class record; closedReason: ReservationCloseReason enum
Loan              — temporary assignment; closedReason: LoanCloseReason enum
Allocation        — permanent assignment; separate from Loan for clean reporting
DemoVisit         — demo/home visit lifecycle; closedReason: DemoVisitCloseReason enum
AuditEntry        — append-only; targetUserId for user-level events
Notification      — operational alerts with per-type deduplication indexes
NotificationRead  — per-user read state (join table)
User              — staff accounts; 12 named back-relations covering all actor roles
RefreshToken      — hashed JWT refresh tokens; blocklist via revokedAt
```

> **closedReason fields use typed enums** — not free strings. See [Schema Design Decisions](./technical/schema-decisions.md) for detail.

---

## 8. UI/UX Specification

### 8.1 Navigation

**Desktop:** persistent left sidebar — Dashboard, Inventory, Loans, Clients, Donations, Reports, Admin (Admin role only).

**Mobile:** bottom navigation bar (five items max) — Dashboard, Inventory, Loans, More (overflow: Clients, Donations, Reports, Admin).

**Header:** notification bell icon with unread count badge on all pages. User menu (name + role badge) with links to Settings and Sign out.

**Settings:** accessible from the user menu. Profile card (edit name and email) and password change card (current + new + confirm). Password change forces re-authentication.

### 8.2 Dashboard

Landing page after login. Provides operational at-a-glance awareness.

| Widget | Content |
|---|---|
| Stock summary | Total item count; breakdown by status as labelled pill badges |
| Currently on loan | Count of active loans; links to active loans view |
| Overdue | Count of items past expected return; amber if > 0, red if > 3; links to overdue report |
| On demo visit | Count of items currently out |
| For sale | Count of PURCHASED items with `isForSale = true` |
| Notification summary | Unread notification count; links to notification centre |
| Recent activity | Last 5 audit entries across all items — item name, event, timestamp |

**Empty state:** on first deploy, a "Get started" prompt directing staff to add the first item or run the CSV import.

### 8.3 Inventory Page

**All Stock tab:**

- Full-width free-text search bar (searches name, make, model, serial number simultaneously). Implementation: Prisma `contains` with `mode: 'insensitive'` (maps to PostgreSQL ILIKE) across all four fields, combined with OR logic. Adequate for expected data volumes (sub-1000 items).
- Filter bar: Status (multi-select), Acquisition Type (multi-select), Device Category (multi-select).
- Archived toggle: off by default; archived items shown with muted row styling when enabled.
- Results table columns: Name, Make/Model, Category, Acquisition Type, Status, Condition, Date Added, Quick Action.
- Quick Action column: single most-relevant contextual action. Full actions on item detail page.
- Pagination: 25 per page with page controls and results count.
- Default sort: Date Added (newest first). Sortable columns: Name, Category, Status, Condition, Date Added. Sort indicator (arrow icon + sr-only text) on active column. Sort state persisted in URL search params.
- "Add Equipment" button — top right.

**For Sale tab:**

- Auto-filtered: `PURCHASED` items where `isForSale = true` and not archived.
- Empty state: "No items currently flagged for sale. Flag a purchased item for sale from its detail page."

### 8.4 Item Detail Page

The most-used screen in the system. Must function fully on mobile.

**Layout (top to bottom):**

1. Header — item name, status badge (colour-coded), acquisition type badge.
2. Primary action area — contextual action buttons per section 8.5. Above the fold on mobile.
3. Item details — make, model, serial number, category, condition, acquisition date, supplier/donor info.
4. Current activity panel — shown when ON_LOAN, RESERVED, or ALLOCATED_OUT.
5. History timeline — past records in reverse chronological order.
6. Audit log — collapsible; paginated at 20 per page.
7. Admin actions panel — Decommission, Archive, Reclassify. Admin only. Visually separated.

**Status badge colours:** Green (available), Amber (reserved/on demo visit), Blue (on loan), Purple (allocated out), Red (decommissioned). All must meet WCAG 1.4.3. Text label required alongside colour.

### 8.5 Action Matrix

Restricted actions are hidden, not disabled.

| Status | Staff actions | Additional Admin-only actions |
|---|---|---|
| AVAILABLE_FOR_LOAN | Reserve, Issue Loan, Allocate Directly, Edit, Print QR | Decommission, Archive, Reclassify |
| RESERVED | Convert to Loan, Cancel Reservation, Edit, Print QR | Decommission (with warning), Reclassify |
| ON_LOAN | Return, Convert to Allocation, Edit, Print QR | Decommission (with warning) |
| ALLOCATED_OUT | Edit, Print QR | Decommission, Archive |
| AVAILABLE_FOR_DEMO | Start Demo Visit, Edit, Print QR | Decommission, Archive, Reclassify |
| ON_DEMO_VISIT | Return from Demo, Edit, Print QR | Decommission (with warning) |
| DECOMMISSIONED | Print QR | Archive, Edit notes |

**Flag for Sale** (Admin only): available on any `PURCHASED` item that is not `DECOMMISSIONED`, regardless of status. Shown in Admin actions panel.

### 8.6 Key User Flows

**Loan creation:** Issue Loan → client typeahead (CharityLog ID / display name) → loan details (expected return, condition) → review → confirm → receipt download screen.

**Return (from QR scan):** scan → item detail → "Return this item" (primary action) → modal with condition select → confirm → success toast.

**Convert to allocation:** ON_LOAN item → "Convert to Allocation" → irreversible confirmation → Loan closed, Allocation created.

**Demo visit:** AVAILABLE_FOR_DEMO → "Start Demo Visit" → modal (destination, expected return) → ON_DEMO_VISIT. Return via modal with condition select.

**Direct allocation:** AVAILABLE_FOR_LOAN item → "Allocate Directly" → client typeahead (CharityLog ID / display name) → optional notes → irreversible confirmation ("This item will be permanently allocated. This cannot be undone.") → success toast.

**Unauthenticated QR scan:** camera opens `/equipment/[id]` → no cookie → redirect to `/login?redirect=…` → mobile-optimised login → forward to item.

**Multi-step form navigation (intake form, loan creation):** Users can navigate back to any previous step without losing entered data. Form state is held in React state (not persisted to server until final submission). The step indicator shows completed, current, and upcoming steps. Navigating away from the form triggers a confirmation dialog if any data has been entered.

### 8.7 Notification Centre Panel

Slide-out drawer (desktop) / full-screen overlay (mobile). Contains: heading + unread count, "Mark all as read", paginated list (20/page). Each entry: type icon, message, item name (linked), timestamp. Unread entries visually distinguished. Resolved entries muted but visible.

### 8.8 Confirmation Dialogs

| Action | Irreversible | Reason required |
|---|---|---|
| Decommission | Yes | Yes |
| Decommission with active reservation/demo visit | Yes | Yes — auto-cancels dependents |
| Archive | No | Optional |
| Convert loan to allocation | Yes | Optional |
| Anonymise client | Yes | No |

All irreversible dialogs show: "This cannot be undone."

### 8.9 Empty States

| View | Message |
|---|---|
| Inventory (All Stock) | "No equipment yet. Add your first item or import from CSV." + Add Equipment button |
| Inventory (For Sale) | "No items flagged for sale. Flag a purchased item from its detail page." |
| Loans (active) | "No active loans." |
| Loans (overdue) | "No overdue loans. All items returned on time." |
| Notification centre | "You're up to date. No alerts at the moment." |
| Clients | "No client records yet. Records are created when issuing the first loan." |
| Audit log (item) | "No activity recorded for this item yet." |
| Donations | "No donation records. Add a donation when processing donated equipment." |

### 8.10 Error States and Validation

**Form validation:** inline error below field on blur — not on submit. Error text associated with input via `aria-describedby` (WCAG 1.3.1). Serial number and CharityLog ID duplicate-checked in real-time on blur.

**Status transition conflict:** if the API returns 422 (another user changed status since page load), show a toast: "This item's status has changed. Refreshing…" and reload the item detail page.

**Network errors:** read failures show inline error with Retry button. Write failures show an error toast with the specific reason from the API. Never silently fail.

**Session expiry:** on 401 response, redirect to `/login?redirect=[current path]` with toast: "Your session has expired. Please log in again."

### 8.11 Pagination

| View | Page size |
|---|---|
| Inventory table | 25 per page |
| Loans list | 25 per page |
| Audit log (item) | 20 per page |
| Notification centre | 20 per page |

Pagination controls must be keyboard accessible with descriptive labels ("Go to next page") — not icon-only (WCAG 2.4.6).

### 8.12 Responsive Design

Item detail page and login are mobile-first (min 375px). All other pages are desktop-primary but functional on tablet. Item detail primary action must be above the fold on mobile.

### 8.13 Branding and Print

Brand assets (logo SVG, hex colours, typography) to be confirmed with MyVision before frontend build. Loan receipt PDF opens in new tab for browser printing. QR label opens `/equipment/[id]/label` — print-optimised `@media print` page, Avery L7160 format.

---

## 9. Technical Architecture

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| PDF | `@react-pdf/renderer` |
| QR | `qrcode` npm |
| Scheduling | `@nestjs/schedule` |
| Auth | JWT + refresh token (httpOnly cookies) |
| Rate limiting | `@nestjs/throttler` — global, 300 req/min |
| Monitoring | UptimeRobot free tier |
| Deployment | Coolify on Hetzner VPS |

**Docker Compose (outline):**

```yaml
services:
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./apps/api
    depends_on:
      db:
        condition: service_healthy
    env_file: .env

  web:
    build: ./apps/web
    depends_on: [api]
    env_file: .env

volumes:
  pgdata:
```

`prisma migrate deploy` and the seed script run in the API container entrypoint, after the DB healthcheck passes. Coolify handles reverse proxy (Traefik) and TLS (Let's Encrypt) automatically. See [Deployment Runbook](./technical/deployment-runbook.md) for setup.

See [schema.prisma](./technical/schema.md) and [API Reference](./technical/api-reference.md) for implementation detail.

---

## 10. API Design Conventions

Transitions use dedicated POST endpoints — not generic PATCH. Each endpoint has its own service method, validation, and audit logging. 422 is used exclusively for invalid transitions. See [API Reference](./technical/api-reference.md) for full endpoint list and request/response shapes.

---

## 11. Non-Functional Requirements

### Accessibility
WCAG 2.2 Level AA. Key risks: status controls (keyboard + SR), badges (not colour-only), form errors (aria-describedby), pagination (descriptive labels), touch targets (44×44px min on mobile). PDF not tagged in v1.

### Data Integrity
Server-side transition enforcement. Audit log append-only. Serial numbers and CharityLog IDs unique (HTTP 409 on conflict). Notification deduplication in cron.

### UK GDPR
Data minimisation — CharityLog ID + display name only. Lawful basis: legitimate interests (Art. 6(1)(f)). Erasure: anonymise in place (irreversible). Retention policy to be reviewed against MyVision DPP before go-live.

### Backup
Two-layer strategy: Hetzner Automated Backups (server-level snapshots, ~20% of server cost) for full disaster recovery, plus a `pg_dump` nightly cron on a local Docker volume for application-level granularity. 7-day retention on pg_dump files. Test restore before go-live. See [Deployment Runbook](./technical/deployment-runbook.md) for implementation detail.

### Security Headers
Coolify's Traefik proxy adds HSTS headers by default. Additionally configure in the NestJS API:
- `helmet` middleware for X-Content-Type-Options, X-Frame-Options (DENY), and Referrer-Policy.
- Content Security Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'`.
- CORS: not required if API and web are served from the same origin via Coolify. If on different origins, configure `app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true })`.

### Monitoring
UptimeRobot free tier, 5-minute ping. Logs via Docker stdout.

### Documentation
`README.md`, `.env.example`, and a runbook are required codebase deliverables — not retrospective additions.

---

## 12. Environment Variables

```bash
DATABASE_URL=postgresql://user:password@db:5432/equipment_tracker
JWT_SECRET=                     # min 32 chars
JWT_EXPIRY=60m
REFRESH_TOKEN_SECRET=           # different from JWT_SECRET
REFRESH_TOKEN_EXPIRY=7d
SEED_ADMIN_NAME=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=            # change immediately after first login
NODE_ENV=production
API_PORT=3001
WEB_PORT=3000
WEB_ORIGIN=https://equipment.myvision.org.uk
THROTTLE_TTL=60000
THROTTLE_LIMIT=300
CRON_SCHEDULE=0 6 * * *           # notification cron — configurable
```

---

## 13. v2 Roadmap

| # | Feature |
|---|---|
| 1 | Full sale transaction workflow (buyer, price, date, SOLD status) |
| 2 | Email notifications for overdue items |
| 3 | Self-service password reset via email |
| 4 | CharityLog read integration (client lookup) |
| 5 | Condition photo attachments (Cloudflare R2) |
| 6 | Donation acknowledgement letter/email templates |
| 7 | Tagged (accessible) PDF receipts |
| 8 | Automated data retention review |
| 9 | PWA support |
| 10 | Staging environment |

---

*Version 1.1 — Final (amendments applied 2 April 2026)*
