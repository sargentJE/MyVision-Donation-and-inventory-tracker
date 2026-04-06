# Implementation Plan
## MyVision Equipment Tracker -- Build Phases

_Created: 3 April 2026_
_Last updated: 6 April 2026 (All phases complete. Deployed to equipment.sightkick.co.uk. 55 items imported.)_

---

## Phase 1: Scaffold + Database [COMPLETE]

- [x] Initialise Turborepo monorepo with pnpm workspaces
- [x] Scaffold `apps/api` (NestJS 10, TypeScript)
- [x] Scaffold `apps/web` (Next.js 14, App Router, Tailwind CSS)
- [x] Scaffold `packages/types` (shared enums + zod schemas)
- [x] Copy Prisma schema from docs into `apps/api/prisma/schema.prisma`
- [x] Configure Prisma 5 (pinned to ^5.22.0)
- [x] Create idempotent seed script (admin bootstrap from env vars)
- [x] Create all 17 route placeholder pages matching frontend architecture doc
- [x] Implement `lib/api.ts` (fetch wrapper with credentials: include)
- [x] Implement `lib/query-keys.ts` (TanStack Query key factories)
- [x] Implement `lib/query-client.ts` (QueryClient config + provider)
- [x] Configure `turbo.json`, root `package.json`, `pnpm-workspace.yaml`
- [x] Create `.env.example` matching PRD section 12
- [x] Create `docker-compose.yml` (Postgres 16 for local dev)
- [x] Create `.gitignore`
- [x] Run `prisma generate` -- verified schema compiles

### Phase 1 Audit Fixes [COMPLETE]

- [x] C1: Remove Prisma migrations from `.gitignore`
- [x] C2/C3: Install `@nestjs/config`, wire up `ConfigModule.forRoot({ isGlobal: true })`
- [x] C2/C3: Refactor ThrottlerModule to use ConfigService via `forRootAsync`
- [x] M3: Create `PrismaModule` (global) and `PrismaService` (extends PrismaClient)
- [x] M4: Add `@myvision/types` workspace dependency to API
- [x] M2: Install `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`
- [x] m9: Add CJS build step to `packages/types` with conditional exports
- [x] m1: Switch API tsconfig to `"strict": true`
- [x] m5: Create shadcn toast components + add `<Toaster />` to root layout
- [x] Verification: pnpm install, types build, prisma generate, type-check all pass

---

## Phase 2: Auth + User Management

### 2A: Backend -- Auth + Users (code session) [COMPLETE]

- [x] Start Postgres: `docker compose up db -d`
- [x] Run first migration: `pnpm --filter api prisma migrate dev --name init`
- [x] Run seed: `pnpm --filter api prisma db seed`
- [x] Verify admin account exists via Prisma Studio
- [x] Create `src/audit/audit.module.ts` and `audit.service.ts` (global module)
  - [x] `AuditService.log()` -- Prisma create on AuditEntry table
  - [x] `AuditService.findByEquipment()` -- paginated query (interface only, used in Phase 3)
- [x] Create `src/auth/strategies/jwt.strategy.ts`
  - [x] Custom cookie extractor: `(req) => req?.cookies?.jwt`
  - [x] Validate payload, attach user to request
- [x] Create `src/auth/guards/jwt-auth.guard.ts`
- [x] Create `src/auth/guards/roles.guard.ts`
- [x] Create `src/auth/decorators/roles.decorator.ts` (`@Roles('ADMIN')`)
- [x] Create `src/auth/decorators/current-user.decorator.ts` (`@CurrentUser()`)
- [x] Create `src/auth/dto/login.dto.ts` (email + password, class-validator)
- [x] Create `src/auth/auth.service.ts`
  - [x] `login(email, password)` -- bcrypt compare, generate JWT + refresh token, hash refresh token, store in DB
  - [x] `refresh(refreshTokenFromCookie)` -- validate, rotate (revoke old, issue new), return new JWT
  - [x] `logout(userId, refreshToken)` -- revoke token, clear cookies
  - [x] `revokeAllUserTokens(userId)` -- used by deactivate + password reset
  - [x] Cookie config from ConfigService (secure flag from NODE_ENV)
- [x] Create `src/auth/auth.controller.ts`
  - [x] `POST /auth/login` -- returns `{ data: { user: UserSummary } }`, sets cookies
  - [x] `POST /auth/refresh` -- returns `{ data: { user: UserSummary } }`, rotates cookies
  - [x] `POST /auth/logout` -- clears cookies
- [x] Create `src/auth/auth.module.ts`
  - [x] Imports: JwtModule (async config from ConfigService), PassportModule, UsersModule
  - [x] Provides: JwtStrategy, AuthService
  - [x] Exports: AuthService
- [x] Create `src/users/dto/create-user.dto.ts` (name, email, password, role)
- [x] Create `src/users/dto/update-user.dto.ts` (name?, email?, role?)
- [x] Create `src/users/dto/reset-password.dto.ts` (newPassword)
- [x] Create `src/users/users.service.ts`
  - [x] `findAll(filters, pagination)` -- paginated, filterable by active/role
  - [x] `findById(id)` -- single user
  - [x] `findByEmail(email)` -- for auth credential lookup
  - [x] `create(dto, actorId)` -- hash password, create user, log USER_CREATED audit event
  - [x] `update(id, dto)` -- partial update
  - [x] `deactivate(id, actorId)` -- set active=false, revoke all refresh tokens, log USER_DEACTIVATED
  - [x] `reactivate(id)` -- set active=true
  - [x] `resetPassword(id, newPassword)` -- hash, update, revoke all refresh tokens
- [x] Create `src/users/users.controller.ts`
  - [x] `GET /users` -- Admin only, paginated
  - [x] `GET /users/:id` -- Admin only
  - [x] `POST /users` -- Admin only, 409 on duplicate email
  - [x] `PATCH /users/:id` -- Admin only
  - [x] `POST /users/:id/deactivate` -- Admin only, 403 if deactivating self
  - [x] `POST /users/:id/reactivate` -- Admin only
  - [x] `POST /users/:id/reset-password` -- Admin only
- [x] Create `src/users/users.module.ts`
  - [x] Exports: UsersService (so AuthModule can import it)
- [x] Wire up AuthModule and UsersModule in AppModule
- [x] Backend verification
  - [x] Test login via curl -- verify JWT and refreshToken cookies set
  - [x] Test auth guard rejects unauthenticated requests
  - [x] Test Admin guard blocks Staff
  - [x] Test user CRUD endpoints
  - [x] Type-check passes

### 2B: Frontend -- Auth + Layout (code session) [COMPLETE]

- [x] Add Next.js API proxy rewrites to `next.config.js`
  - [x] `/api/:path*` rewrites to `http://localhost:3001/api/:path*`
- [x] Create `hooks/use-auth.ts`
  - [x] `useAuth()` -- TanStack Query backed, calls refresh on mount
  - [x] Returns `{ user, isLoading, isAuthenticated, logout }`
  - [x] `logout()` calls `POST /auth/logout` then redirects to `/login`
- [x] Implement login page (`app/(public)/login/page.tsx`)
  - [x] Email + password form with zod validation
  - [x] `POST /auth/login` on submit
  - [x] Redirect to `redirect` query param or `/` on success
  - [x] Show "Invalid credentials" on 401
  - [x] Mobile-first layout
- [x] Implement `app/(authenticated)/layout.tsx` (AuthLayout)
  - [x] Uses `useAuth()` to check auth state
  - [x] Loading spinner while checking
  - [x] Redirects to `/login?redirect=[current path]` if unauthenticated
  - [x] Renders Sidebar + Header + children
- [x] Create `components/layout/sidebar.tsx` (desktop, lg+)
  - [x] Nav items: Dashboard, Inventory, Loans, Clients, Donations, Reports, Admin
  - [x] Admin item hidden for Staff role
- [x] Create `components/layout/bottom-nav.tsx` (mobile, below lg)
  - [x] 5-item max: Dashboard, Inventory, Loans, More (overflow)
- [x] Create `components/layout/header.tsx`
  - [x] PageTitle, NotificationBell placeholder, UserMenu
- [x] Create `components/layout/user-menu.tsx`
  - [x] Shows user name, role, logout action
- [x] Implement user management page (`app/(authenticated)/admin/users/page.tsx`)
  - [x] DataTable showing users (name, email, role, active status)
  - [x] Create user dialog (name, email, password, role select)
  - [x] Edit user dialog
  - [x] Deactivate / reactivate actions
  - [x] Reset password dialog
  - [x] All behind Admin role check -- redirect if Staff
- [x] Install required shadcn components (Dialog, Table, DropdownMenu, Badge, etc.)
- [x] End-to-end verification
  - [x] Full flow: login -> dashboard -> admin -> user management
  - [x] Create user, deactivate user, reset password
  - [x] Staff login -- Admin nav hidden, /admin/users redirects
  - [x] Session expiry -> redirect to login with correct return URL
  - [x] Type-check all packages

---

## Phase 3: Equipment CRUD + State Machine

### 3A: Backend -- Equipment (code session) [COMPLETE]

- [x] Create `src/equipment/equipment.module.ts`
- [x] Create `src/equipment/equipment.service.ts`
  - [x] CRUD: create, findAll (paginated, filtered, searchable), findById, update
  - [x] Decommission (Admin only, with forceClose for active dependents)
  - [x] Archive / restore (Admin only)
  - [x] Reclassify acquisition type (Admin only, with compatibility checks)
  - [x] Flag / unflag for sale (Admin only, PURCHASED only)
- [x] Create `src/equipment/transition.service.ts`
  - [x] `validateReclassification()` -- enforces all transition rules
  - [x] `getAvailableActions(status, acquisitionType, role)` -- drives frontend action matrix
- [x] Create `src/equipment/equipment.controller.ts` (all 11 endpoints from API reference)
- [x] Create DTOs for all equipment endpoints (7 DTOs)
- [x] Audit logging for all equipment lifecycle events
- [x] Unit tests: TransitionService (39 tests covering every cell in validation matrix)

### 3B: Frontend -- Equipment (code session) [COMPLETE]

- [x] Frontend: inventory page (All Stock + For Sale tabs)
  - [x] SearchBar (debounced via useDeferredValue)
  - [x] FilterBar (status, device category select dropdowns)
  - [x] DataTable with responsive column hiding, pagination
  - [x] Archived toggle checkbox
  - [x] Clickable item names linking to detail page
- [x] Frontend: item detail page
  - [x] Header with StatusBadge + AcquisitionBadge + For Sale / Archived tags
  - [x] Edit dialog (name, make, model, condition, notes)
  - [x] ItemMetadataGrid (3-column responsive)
  - [x] CurrentActivityPanel (conditional — renders when active, placeholder for Phase 4 data)
  - [x] AuditLog (collapsible, paginated at 20/page)
  - [x] AdminActionsPanel (Admin only — decommission, archive/restore, reclassify, flag for sale dialogs)
- [x] Frontend: equipment intake form (multi-step guided)
  - [x] Step 1: basic info (name, category, acquisition type, condition, date)
  - [x] Step 2: details (make, model, serial number, notes)
  - [x] Step 3: acquisition details (conditional: purchased vs donated fields)
  - [x] Step 4: review + submit with initial status display
  - [x] Step indicator, back navigation, unsaved changes warning (beforeunload)
- [x] Shared components: StatusBadge, ConditionBadge, AcquisitionBadge
- [x] Equipment hooks: useEquipmentList, useEquipment, useEquipmentAuditLog, 8 mutation hooks
- [ ] API integration tests: every equipment endpoint (success + error cases)

---

## Phase 4: Loan Lifecycle [COMPLETE]

### 4A: Backend -- Loan Lifecycle [COMPLETE]

- [x] Create `src/clients/` module, service, controller, DTOs (5 endpoints)
  - [x] Search typeahead, CRUD, inline creation, anonymise (Admin only)
  - [x] CharityLog ID deduplication (409 DUPLICATE_CHARITYLOG_ID with existingClientId)
- [x] Create `src/reservations/` module, service, controller, DTOs (5 endpoints)
  - [x] Create reservation (tx: status→RESERVED), cancel (tx: →AVAILABLE_FOR_LOAN), convert to loan (tx: →ON_LOAN)
- [x] Create `src/loans/` module, service, controller, DTOs (5 endpoints + receipt stub)
  - [x] Issue loan, return, convert to allocation — all with atomic transactions + audit
  - [ ] Loan receipt PDF (`@react-pdf/renderer`) — deferred to Phase 4C (stub returns 501)
- [x] Create `src/allocations/` module, service, controller, DTOs (3 endpoints)
  - [x] Direct allocation, list, detail — with acquisitionType validation
- [x] Status transition integration (reserve → loan → return/allocate) — all 18 endpoints verified with curl
- [x] Audit logging for all loan lifecycle events (RESERVED, RESERVATION_CANCELLED, LOAN_ISSUED, LOAN_RETURNED, LOAN_CONVERTED_TO_ALLOCATION, ALLOCATED_DIRECTLY)

### 4B: Frontend -- Loan Lifecycle [COMPLETE]

- [x] Frontend: loan creation via dialogs on equipment detail page
  - [x] Client typeahead with inline create + 409 handling
  - [x] Issue Loan / Reserve / Allocate Directly dialogs
  - [ ] Receipt download screen — deferred (button shows "Coming soon")
- [x] Frontend: loan list page (active + overdue tabs)
- [x] Frontend: client list + detail pages (with anonymise, loan/allocation history)
- [x] Frontend: CurrentActivityPanel variants (ReservationCard, LoanCard, AllocationCard with action buttons)

---

## Phase 5: Demo Visits [COMPLETE]

- [x] Create `src/demo-visits/` module, service, controller, DTOs (4 endpoints)
  - [x] Start demo visit (tx: status→ON_DEMO_VISIT + audit DEMO_VISIT_STARTED)
  - [x] Return with condition tracking (tx: status→AVAILABLE_FOR_DEMO + audit DEMO_VISIT_RETURNED)
  - [x] List (paginated, active filter) + detail endpoints
- [x] Frontend: "Start Demo Visit" button + dialog on equipment detail page (AVAILABLE_FOR_DEMO status)
- [x] Frontend: DemoVisitCard in CurrentActivityPanel (destination, dates, overdue badge, Return button)
- [x] Audit logging for DEMO_VISIT_STARTED, DEMO_VISIT_RETURNED (inside atomic transactions)
- [x] Expanded DemoVisitSummary type (added equipmentId, returnedAt, closedReason)
- [ ] API integration tests (deferred)

---

## Phase 6: QR Codes + Labels [COMPLETE]

- [x] Install `qrcode.react` npm package (client-side SVG rendering)
- [x] Create `/equipment/[id]/label` print page (Avery L7160 format)
  - [x] Label preview: MyVision logo, item name, make/model, serial number, system ID, QR code
  - [x] Position picker: 21-position grid (7×3) for selecting sticker position on sheet
  - [x] @media print CSS with @page { size: A4; margin: 0 } and mm-precise positioning
  - [x] Printing instructions panel (scale 100%, margins none)
- [x] Unauthenticated QR scan redirect flow (already works via Phase 2B auth guard: → /login?redirect=/equipment/[id])
- [x] "Print Label" button on item detail page (opens label page in new tab, all statuses)

---

## Phase 7: Notifications + Cron [COMPLETE]

- [x] Create `src/notifications/` @Global module, service, controller, DTOs (4 endpoints)
  - [x] List (paginated, filterable by resolved/read with per-user read state via NotificationRead join)
  - [x] Unread count endpoint (unresolved AND unread, polled every 60s by frontend)
  - [x] Mark as read (upsert NotificationRead), mark all as read (bulk createMany)
- [x] Create notification cron service (`@nestjs/schedule`)
  - [x] Run at 06:00 UTC daily (configurable via CRON_SCHEDULE env var)
  - [x] Phase 1: Auto-resolve notifications whose conditions no longer apply
  - [x] Phase 2: Create for LOAN_OVERDUE, RESERVATION_EXPIRED, DEMO_VISIT_OVERDUE
  - [x] Deduplication via Prisma relation filter (none: { type + resolvedAt IS NULL })
- [x] Immediate resolution: lifecycle services (loans, reservations, demo-visits, equipment) resolve notifications after transactions
- [x] Frontend: NotificationBell (badge with count, 60s polling, sr-only label)
- [x] Frontend: NotificationDrawer (Sheet slide-out, paginated list, mark read, navigate to equipment)
  - [x] Type icons (Clock, CalendarX, MapPin), relative timestamps, resolved entries muted

---

## Phase 8: Donations + Sale Stock + Reports + Dashboard [COMPLETE]

- [x] Create `src/dashboard/` module, service, controller (1 aggregated endpoint)
  - [x] Stock summary, active loans, overdue, demo visits, for sale, notifications, recent activity
- [x] Frontend: dashboard page with widgets, status breakdown, stat cards, recent activity feed
- [x] Create `src/donations/` module, service, controller, DTOs (5 endpoints)
  - [x] CRUD + acknowledgement toggle
- [x] Frontend: donations list + detail pages with acknowledge workflow
- [x] Sale stock: For Sale tab on inventory page — **already built in Phase 3B**
- [x] Create `src/reports/` module, service, controller (6 endpoints)
  - [x] Full inventory, active loans, overdue loans, demo visits, allocations, utilisation
  - [x] CSV export via `?format=csv` with Content-Disposition headers
- [x] Frontend: reports page with 6 report cards and CSV download buttons

---

## Phase 9: CSV Import [COMPLETE]

- [x] Create POST /equipment/import endpoint (Admin only, multipart file upload)
  - [x] csv-parse for robust CSV parsing (handles quotes, BOM, empty lines)
  - [x] Row-by-row validation against PRD column spec (name, acquisitionType, deviceCategory required; enums validated; MaxLength checked; serial uniqueness within CSV)
  - [x] Dry-run mode (dryRun=true default) — validates without inserting
  - [x] Live import (dryRun=false) — all-or-nothing Prisma transaction with 30s timeout
  - [x] Donation auto-creation for rows with donorName
  - [x] Error response with row numbers + field names + messages
- [x] Tested against `data/import-ready.csv` — dry-run: 55/55 valid, live import: 55 items created
- [x] Verified total equipment count: 59 (4 existing + 55 imported)

---

## Phase 10: Polish + Accessibility + Deploy [IN PROGRESS]

### Accessibility & Brand (COMPLETE)
- [x] Created `docs/ACCESSIBILITY.md` — living guide with 13 sections: landmarks, navigation, forms, tables, charts, dialogs, dynamic content, colour, motion, touch targets, restricted actions, testing checklist
- [x] `prefers-reduced-motion` support in globals.css (WCAG 2.3.3 AAA)
- [x] Skip-to-content links in authenticated + public layouts (WCAG 2.4.1 AA)
- [x] `aria-label` on all navigation landmarks (sidebar + bottom nav) (WCAG 1.3.1 AA)
- [x] `aria-current="page"` on active nav links (sidebar + bottom nav) (WCAG 2.4.8 AAA)
- [x] `aria-label` on icon-only More button (WCAG 1.1.1 AA)
- [x] sr-only labels on search + filter selects (equipment page) (WCAG 1.3.1 AA)
- [x] `aria-expanded` on audit log toggle (WCAG 4.1.2 AA)
- [x] `aria-label` on dashboard MetricCard links (WCAG 2.4.4 AA)
- [x] `aria-live="polite"` on conditional form fields (equipment intake) (WCAG 4.1.3 AAA)
- [x] MyVision brand colours in Tailwind config (myvision.yellow, navy, blue, pink, dark)
- [x] Favicon + apple-touch-icon configured in metadata
- [x] MyVision logo in sidebar header (replacing plain text)

### Account Settings (COMPLETE)
- [x] `GET /auth/me` — return authenticated user's profile
- [x] `PATCH /auth/me` — self-service name and email update (409 on duplicate email)
- [x] `POST /auth/change-password` — verify current password, hash new, revoke all tokens, clear cookies
- [x] Frontend `/settings` page — profile card (name + email) and password change dialog
- [x] Settings link added to user menu (gear icon, between role badge and Sign out)
- [x] Password change forces re-login (query cache cleared, redirect to `/login`)

### UI Refinement Pass (COMPLETE — 6 sprints)
_Detailed sprint docs in `docs/ui-refinement/`_

- [x] **Sprint 1 — Brand Foundation:** CSS variables remapped to MyVision palette (navy #001172, yellow #fdea18, blue #2e4e9d). Login page branded with logo + card styling.
- [x] **Sprint 2 — Sidebar & Navigation:** Dark sidebar (#282f5f) with white logo, yellow active-link border, matching mobile bottom nav. Contrast-audited (text-white/80, ring-white/70).
- [x] **Sprint 3 — Form Accessibility:** Migrated 10+ dialog forms from native FormData to react-hook-form + zod. Automatic `aria-describedby`, inline FormMessage errors, required field `*` indicators. All raw `<select>` replaced with shadcn Select. Client typeahead sr-only label. Settings password error linked via aria-describedby.
- [x] **Sprint 4 — Landmarks & Pagination:** Shared `PaginationControls` component (6 pages). Dashboard section landmarks with sr-only headings. Chart card h2→h3 heading hierarchy. User menu `aria-label`. Header visible on desktop. Audit log `aria-controls`. Admin loading `role="status"`. Donation toggle `aria-label`.
- [x] **Sprint 5 — Dialog Extractions:** `ChangePasswordDialog` (settings page now single profile card). `CreateClientDialog` (typeahead opens dialog, not inline form). Client anonymise → `AlertDialog` (role="alertdialog").
- [x] **Sprint 6 — Polish & Consistency:** Shared `TableEmptyState` component with icons + CTAs (5 list pages). Activity card icons use brand tokens. Equipment filter `<fieldset>` wrapping. Label position picker `<fieldset>`.

### Source Control (COMPLETE)
- [x] Git repository initialised
- [x] `.gitignore` configured (dist, data, logs, .env, .claude, node_modules, build caches)
- [x] Pushed to GitHub: `sargentJE/MyVision-Donation-and-inventory-tracker` (public)
- [x] 253 files, 31,463 lines of code

### Deployment (COMPLETE)
- [x] Production `docker-compose.prod.yml` — API + web + Postgres + backup sidecar, Coolify-aligned (Traefik labels, `${VAR:?}` env var discovery, network isolation, non-root containers)
- [x] Dockerfiles — multi-stage builds for API (NestJS + Prisma + bcrypt rebuild for Alpine) and web (Next.js standalone output)
- [x] `.dockerignore` — excludes .git, node_modules, .env, data, logs, build caches
- [x] `next.config.js` — `output: 'standalone'`, configurable `API_INTERNAL_URL` for Docker networking, security headers
- [x] `/api/health` endpoint — unauthenticated, used by Docker health check and monitoring
- [x] Coolify setup on Hetzner VPS — public GitHub repo, Docker Compose build pack, environment variables via Coolify UI
- [x] Domain: `equipment.sightkick.co.uk` — Cloudflare DNS (wildcard subdomain), SSL via Coolify/Traefik
- [x] First production deploy — all 4 containers healthy (db, api, web, db-backup)
- [x] Admin account created via seed (jamie.sargent@myvision.org.uk)
- [x] CSV import — 55 equipment items imported via `POST /api/equipment/import` (dry-run validated, then live import via docker exec + curl against localhost:3001)
- [x] Dashboard verified with full data (55 items, charts, metrics)

### Post-Deployment QA
- [ ] Complete manual QA checklist: `docs/technical/post-deployment-qa.md` (18 sections, 150+ test items)
  - Authentication & sessions, navigation, dashboard, inventory, equipment CRUD, loan lifecycle, demo visits, clients, donations, reports, admin, notifications, QR labels, accessibility, security, performance, mobile

### Remaining
- [ ] Set up UptimeRobot monitoring (`https://equipment.sightkick.co.uk/api/health`, 5-min interval)
- [ ] Review data retention against MyVision Data Protection Policy
