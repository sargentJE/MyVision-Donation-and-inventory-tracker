# API Request / Response Reference
## MyVision Equipment Tracker — v1.0

This document defines the request body shapes, response envelopes, and error
contracts for every endpoint. Use it to build NestJS DTOs and frontend API clients.

---

## Overview

**Base URL (production):** `https://equipment.myvision.org.uk/api`
**Base URL (local dev):** `http://localhost:3001`

### Authentication

Authentication uses **httpOnly cookies** — not Authorization headers. The JWT
and refresh token are set automatically by the server on login and never
accessible to JavaScript.

All frontend fetch calls must include:
```ts
fetch(url, { credentials: 'include' })
```

Routes marked `🔐` require a valid JWT cookie.
Routes marked `🔐 Admin` additionally require `role: ADMIN`.

### Response Envelope

**Single resource:**
```ts
{ data: T }
```

**List (paginated):**
```ts
{
  data: T[]
  meta: {
    total:      number  // total matching records
    page:       number  // current page (1-based)
    pageSize:   number  // records per page
    totalPages: number
  }
}
```

**Error:**
```ts
{
  error:   string   // machine-readable code e.g. "VALIDATION_ERROR"
  message: string   // human-readable description
  detail?: Record<string, string[]>  // field-level errors for 400 responses
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error (see `detail` field) |
| 401 | Unauthenticated — redirect to login |
| 403 | Insufficient role |
| 404 | Record not found |
| 409 | Conflict — duplicate unique field (serial number, CharityLog ID) |
| 422 | Invalid status transition |

**422 body shape:**
```ts
{
  error:           "INVALID_TRANSITION"
  message:         string
  currentStatus:   OperationalStatus
  attemptedAction: string
}
```

### Pagination Query Params (all list endpoints)

```
?page=1&pageSize=25
```

Defaults: `page=1`, `pageSize=25`. Maximum `pageSize`: 100.

---

## Shared Types

Enums are imported from `@prisma/client` — do not redefine them.

```ts
// ─── Slim types — used in list responses and embedded references ─────────

type UserSummary = {
  id:        string
  name:      string
  email:     string
  role:      Role
  active:    boolean
  createdAt: string // ISO 8601
}

type ClientSummary = {
  id:           string
  charitylogId: string
  displayName:  string
  isAnonymised: boolean
}

type EquipmentSummary = {
  id:              string
  name:            string
  make:            string | null
  model:           string | null
  serialNumber:    string | null
  deviceCategory:  DeviceCategory
  acquisitionType: AcquisitionType
  status:          OperationalStatus
  condition:       Condition
  isForSale:       boolean
  isArchived:      boolean
  acquiredAt:      string // ISO date
  createdAt:       string // ISO 8601
}

type DonationSummary = {
  id:                  string
  donorName:           string
  donorOrg:            string | null
  donatedAt:           string // ISO date
  acknowledgementSent: boolean
}

type ReservationSummary = {
  id:           string
  equipmentId:  string
  clientId:     string
  client:       ClientSummary
  reservedAt:   string
  expiresAt:    string | null
  closedAt:     string | null
  closedReason: ReservationCloseReason | null
}

type LoanSummary = {
  id:              string
  equipmentId:     string
  clientId:        string
  client:          ClientSummary
  loanedAt:        string
  expectedReturn:  string | null
  returnedAt:      string | null
  conditionAtLoan: Condition | null
  closedReason:    LoanCloseReason | null
}

type AllocationSummary = {
  id:                string
  equipmentId:       string
  clientId:          string
  client:            ClientSummary
  allocatedAt:       string
  originatingLoanId: string | null
}

type DemoVisitSummary = {
  id:             string
  equipmentId:    string
  startedAt:      string
  destination:    string | null
  expectedReturn: string | null
  returnedAt:     string | null
  closedReason:   DemoVisitCloseReason | null
}

type AuditEntryItem = {
  id:         string
  event:      AuditEvent
  field:      string | null
  oldValue:   string | null
  newValue:   string | null
  changedBy:  UserSummary
  targetUser: UserSummary | null
  changedAt:  string
  note:       string | null
}

type NotificationItem = {
  id:                   string
  type:                 NotificationType
  message:              string
  relatedEquipmentId:   string | null
  relatedLoanId:        string | null
  relatedReservationId: string | null
  relatedDemoVisitId:   string | null
  resolvedAt:           string | null
  createdAt:            string
  read:                 boolean  // merged from NotificationRead for current user
}

// ─── Detail types — full records with embedded relations ──────────────────

type CurrentActivity =
  | { type: 'reservation'; data: ReservationSummary }
  | { type: 'loan';        data: LoanSummary }
  | { type: 'allocation';  data: AllocationSummary }
  | { type: 'demoVisit';   data: DemoVisitSummary }
  | null

type EquipmentDetail = EquipmentSummary & {
  conditionNotes:     string | null
  notes:              string | null
  purchasePrice:      string | null  // Decimal serialised as string
  supplier:           string | null
  warrantyExpiry:     string | null
  decommissionedAt:   string | null
  decommissionReason: string | null
  archivedAt:         string | null
  archiveReason:      string | null
  donation:           DonationSummary | null
  currentActivity:    CurrentActivity
  // Audit log NOT embedded — fetch via GET /equipment/:id/audit-log
}

type LoanDetail = LoanSummary & {
  equipment:              EquipmentSummary
  closedBy:               UserSummary | null
  conditionAtLoanNotes:   string | null
  conditionAtReturn:      Condition | null
  conditionAtReturnNotes: string | null
  notes:                  string | null
  receiptGeneratedAt:     string | null
  originatingReservation: ReservationSummary | null
  allocation:             AllocationSummary | null
}

type AllocationDetail = AllocationSummary & {
  equipment:       EquipmentSummary
  allocatedBy:     UserSummary
  originatingLoan: LoanSummary | null
  notes:           string | null
}

type DemoVisitDetail = DemoVisitSummary & {
  equipment:              EquipmentSummary
  startedBy:              UserSummary
  returnedBy:             UserSummary | null
  conditionOnReturn:      Condition | null
  conditionOnReturnNotes: string | null
  notes:                  string | null
}

type DonationDetail = DonationSummary & {
  notes: string | null
  items: EquipmentSummary[]
}

type ClientDetail = ClientSummary & {
  createdAt:   string
  loans:       LoanSummary[]
  allocations: AllocationSummary[]
}
```

---

## Auth

### POST /auth/login

No auth required.

**Request:**
```ts
{ email: string; password: string }
```

**Response 200:** `{ data: { user: UserSummary } }`

Sets `jwt` and `refreshToken` as httpOnly cookies. No tokens in the response body.

**Errors:** 401 invalid credentials (do not distinguish wrong email from wrong password).

---

### POST /auth/refresh

No auth required (uses refresh token cookie).

**Request:** no body.

**Response 200:** `{ data: { user: UserSummary } }`

Issues a new JWT cookie. Refresh token rotates (old token revoked, new issued).

**Errors:** 401 if refresh token missing, expired, or revoked.

---

### GET /auth/me 🔐

**Response 200:** `{ data: UserSummary }`

Returns the authenticated user's profile (id, name, email, role, active, createdAt).

---

### PATCH /auth/me 🔐

**Request:**
```ts
{ name?: string; email?: string }
```

**Response 200:** `{ data: UserSummary }`

Updates the authenticated user's name and/or email.

**Errors:** 409 if the email is already in use by another account.

---

### POST /auth/change-password 🔐

**Request:**
```ts
{ currentPassword: string; newPassword: string }
```

**Response 200:** `{ data: { message: "Password changed" } }`

Verifies the current password, hashes the new password, revokes all refresh tokens for the user, and clears auth cookies. The client must re-authenticate after a successful password change.

**Errors:** 401 if the current password is incorrect.

---

### POST /auth/logout 🔐

**Request:** no body.

**Response 200:** `{ data: { message: "Logged out" } }`

Revokes refresh token and clears both cookies.

---

## Users

### GET /users 🔐 Admin

**Query params:** `?page&pageSize&active=true|false&role=ADMIN|STAFF`

**Response 200:** `{ data: UserSummary[], meta }`

---

### GET /users/:id 🔐 Admin

**Response 200:** `{ data: UserSummary }`

---

### POST /users 🔐 Admin

**Request:**
```ts
{ name: string; email: string; password: string; role: Role }
```

**Response 201:** `{ data: UserSummary }`

**Errors:** 409 if email already exists.

---

### PATCH /users/:id 🔐 Admin

**Request:** `{ name?: string; email?: string; role?: Role }`

**Response 200:** `{ data: UserSummary }`

---

### POST /users/:id/deactivate 🔐 Admin

**Response 200:** `{ data: UserSummary }` (with `active: false`)

Immediately revokes all refresh tokens for the target user. Cannot deactivate own account.

**Errors:** 403 if deactivating own account.

---

### POST /users/:id/reactivate 🔐 Admin

**Response 200:** `{ data: UserSummary }` (with `active: true`)

---

### POST /users/:id/reset-password 🔐 Admin

**Request:** `{ newPassword: string }`

**Response 200:** `{ data: { message: "Password reset" } }`

Revokes all existing refresh tokens for the target user.

---

## Equipment

### GET /equipment 🔐

**Query params:**
```
?page&pageSize
&q=                 // free-text: name, make, model, serialNumber
&status=            // OperationalStatus (multi: ?status=ON_LOAN&status=RESERVED)
&acquisitionType=   // AcquisitionType (multi)
&deviceCategory=    // DeviceCategory (multi)
&isArchived=        // boolean, default false
&isForSale=         // boolean — for the For Sale tab
```

**Response 200:** `{ data: EquipmentSummary[], meta }`

---

### GET /equipment/:id 🔐

**Response 200:** `{ data: EquipmentDetail }`

Audit log not included — fetch via `/equipment/:id/audit-log`.

---

### POST /equipment 🔐

**Request:**
```ts
{
  name:            string          // required
  deviceCategory:  DeviceCategory  // required
  acquisitionType: AcquisitionType // required — determines initial status server-side
  condition:       Condition       // required
  acquiredAt:      string          // required, ISO date e.g. "2024-03-15"
  make?:           string
  model?:          string
  serialNumber?:   string          // must be unique if provided
  conditionNotes?: string
  notes?:          string
  // Purchased fields
  purchasePrice?:  string          // decimal as string e.g. "249.99"
  supplier?:       string
  warrantyExpiry?: string          // ISO date
  // Donated fields
  donationId?:     string          // link to existing Donation record
  donorName?:      string          // OR create donation inline
  donorOrg?:       string
  donatedAt?:      string          // ISO date
}
```

`status` is not accepted — set server-side from `acquisitionType`.

**Response 201:** `{ data: EquipmentDetail }`

**Errors:** 409 if `serialNumber` already exists.

---

### PATCH /equipment/:id 🔐

Edits metadata only. Status and acquisition type cannot be changed here.

**Request:**
```ts
{
  name?:           string
  make?:           string
  model?:          string
  condition?:      Condition
  conditionNotes?: string
  notes?:          string
  // Admin only:
  serialNumber?:   string
  purchasePrice?:  string
  supplier?:       string
  warrantyExpiry?: string
}
```

**Response 200:** `{ data: EquipmentDetail }`

**Errors:** 403 if Staff attempts to edit `serialNumber`. 409 if new `serialNumber` already exists.

---

### POST /equipment/:id/decommission 🔐 Admin

**Request:**
```ts
{
  reason:      string   // required
  forceClose?: boolean  // default false
  // If false and active reservation/demo visit exists, returns 409 with conflict details.
  // Frontend shows confirmation dialog, then resends with forceClose: true.
}
```

**Response 200:** `{ data: EquipmentDetail }`

**409 when forceClose: false and conflicts exist:**
```ts
{
  error: "ACTIVE_DEPENDENTS"
  message: string
  conflicts: {
    activeReservation?: ReservationSummary
    activeDemoVisit?:   DemoVisitSummary
  }
}
```

---

### POST /equipment/:id/archive 🔐 Admin

**Request:** `{ reason?: string }`

**Response 200:** `{ data: EquipmentDetail }`

---

### POST /equipment/:id/restore 🔐 Admin

**Request:** `{ reason?: string }`

**Response 200:** `{ data: EquipmentDetail }`

---

### POST /equipment/:id/flag-for-sale 🔐 Admin

No request body.

**Response 200:** `{ data: EquipmentDetail }`

**Errors:** 422 if `acquisitionType != PURCHASED` or `status == DECOMMISSIONED`.

---

### POST /equipment/:id/unflag-for-sale 🔐 Admin

No request body.

**Response 200:** `{ data: EquipmentDetail }`

---

### POST /equipment/:id/reclassify 🔐 Admin

**Request:** `{ acquisitionType: AcquisitionType; reason: string }`

**Response 200:** `{ data: EquipmentDetail }`

**Errors:** 422 if reclassification creates an inconsistent state.

---

### GET /equipment/:id/audit-log 🔐

**Query params:** `?page&pageSize=20`

**Response 200:** `{ data: AuditEntryItem[], meta }`

---

### GET /equipment/:id/label 🔐

Returns an HTML page (not JSON) formatted for Avery L7160 label printing.
Access directly in browser — do not use fetch.

---

## Reservations

### GET /reservations 🔐

**Query params:** `?page&pageSize&equipmentId=&clientId=&active=true`

**Response 200:** `{ data: ReservationSummary[], meta }`

---

### GET /reservations/:id 🔐

**Response 200:**
```ts
{
  data: ReservationSummary & {
    reservedBy: UserSummary
    equipment:  EquipmentSummary
    loan:       LoanSummary | null
    notes:      string | null
  }
}
```

---

### POST /reservations 🔐

**Request:**
```ts
{ equipmentId: string; clientId: string; expiresAt?: string; notes?: string }
```

**Response 201:** `{ data: ReservationSummary }`

**Errors:** 422 if status is not `AVAILABLE_FOR_LOAN` or `acquisitionType != DONATED_GIVEABLE`.

---

### DELETE /reservations/:id 🔐

Cancels an open reservation.

**Response 200:** `{ data: ReservationSummary }` (with `closedAt` and `closedReason: "CANCELLED"`)

**Errors:** 422 if reservation already closed.

---

### POST /reservations/:id/convert 🔐

Converts reservation to loan.

**Request:**
```ts
{
  expectedReturn?:       string
  conditionAtLoan?:      Condition
  conditionAtLoanNotes?: string
  notes?:                string
}
```

**Response 201:** `{ data: LoanDetail }`

**Errors:** 422 if reservation already closed.


---

## Loans

### GET /loans 🔐

**Query params:**
```
?page&pageSize&equipmentId=&clientId=&active=true&overdue=true
```

**Response 200:** `{ data: LoanSummary[], meta }`

---

### GET /loans/:id 🔐

**Response 200:** `{ data: LoanDetail }`

---

### POST /loans 🔐

Creates a loan directly (without a prior reservation).

**Request:**
```ts
{
  equipmentId:           string
  clientId:              string
  expectedReturn?:       string    // ISO date
  conditionAtLoan?:      Condition
  conditionAtLoanNotes?: string
  notes?:                string
}
```

**Response 201:** `{ data: LoanDetail }`

**Errors:** 422 if status is not `AVAILABLE_FOR_LOAN` or `acquisitionType != DONATED_GIVEABLE`.

---

### POST /loans/:id/return 🔐

**Request:**
```ts
{
  conditionAtReturn?:      Condition
  conditionAtReturnNotes?: string
  notes?:                  string
}
```

**Response 200:** `{ data: LoanDetail }` (with `returnedAt` set)

**Errors:** 422 if loan already has a `returnedAt`.

---

### POST /loans/:id/convert-to-allocation 🔐

**Request:** `{ notes?: string }`

**Response 201:** `{ data: AllocationDetail }`

**Errors:** 422 if loan is not active (already returned or closed).

---

### GET /loans/:id/receipt 🔐

Returns a PDF file. Sets `Content-Type: application/pdf`.

Sets `receiptGeneratedAt = now()` on the Loan record on every call (tracks most recent generation).

Open in new tab — do not use fetch:
```ts
window.open(`/api/loans/${loanId}/receipt`, '_blank')
```

---

## Allocations

### GET /allocations 🔐

**Query params:** `?page&pageSize&clientId=&equipmentId=`

**Response 200:** `{ data: AllocationSummary[], meta }`

---

### GET /allocations/:id 🔐

**Response 200:** `{ data: AllocationDetail }`

---

### POST /allocations 🔐

Direct allocation — no prior loan.

**Request:**
```ts
{ equipmentId: string; clientId: string; notes?: string }
```

**Response 201:** `{ data: AllocationDetail }`

**Errors:** 422 if status is not `AVAILABLE_FOR_LOAN`. 409 if item already has an allocation record.

---

## Demo Visits

### GET /demo-visits 🔐

**Query params:** `?page&pageSize&equipmentId=&active=true`

**Response 200:** `{ data: DemoVisitSummary[], meta }`

---

### GET /demo-visits/:id 🔐

**Response 200:** `{ data: DemoVisitDetail }`

---

### POST /demo-visits 🔐

**Request:**
```ts
{
  equipmentId:     string
  destination?:    string   // e.g. "Home visit — Oxford"
  expectedReturn?: string   // ISO date
  notes?:          string
}
```

**Response 201:** `{ data: DemoVisitDetail }`

**Errors:** 422 if status is not `AVAILABLE_FOR_DEMO`.

---

### POST /demo-visits/:id/return 🔐

**Request:**
```ts
{
  conditionOnReturn?:      Condition
  conditionOnReturnNotes?: string
  notes?:                  string
}
```

**Response 200:** `{ data: DemoVisitDetail }` (with `returnedAt` set)

**Errors:** 422 if demo visit already has a `returnedAt`.

---

## Clients

### GET /clients/search 🔐

Typeahead endpoint for loan and allocation creation flows.

**Query params:** `?q=` (searches `charitylogId` and `displayName`)

**Response 200:** `{ data: ClientSummary[] }` (max 10 results, no pagination)

---

### GET /clients 🔐

**Query params:** `?page&pageSize&isAnonymised=false`

**Response 200:** `{ data: ClientSummary[], meta }`

---

### GET /clients/:id 🔐

**Response 200:** `{ data: ClientDetail }`

---

### POST /clients 🔐

**Request:**
```ts
{ charitylogId: string; displayName: string }
```

**Response 201:** `{ data: ClientSummary }`

**Errors:**
```ts
// 409 body
{
  error:            "DUPLICATE_CHARITYLOG_ID"
  message:          string
  existingClientId: string
}
```

---

### POST /clients/:id/anonymise 🔐 Admin

Irreversible. Sets `displayName = "Anonymised"`, `isAnonymised = true`. CharityLog ID retained.

**Request:** no body.

**Response 200:** `{ data: ClientSummary }`

**Errors:** 422 if client already anonymised.

---

## Donations

### GET /donations 🔐

**Query params:** `?page&pageSize&acknowledgementSent=false`

**Response 200:** `{ data: DonationSummary[], meta }`

---

### GET /donations/:id 🔐

**Response 200:** `{ data: DonationDetail }`

---

### POST /donations 🔐

**Request:**
```ts
{ donorName: string; donorOrg?: string; donatedAt: string; notes?: string }
```

**Response 201:** `{ data: DonationDetail }`

---

### PATCH /donations/:id 🔐

**Request:** `{ donorName?: string; donorOrg?: string; donatedAt?: string; notes?: string }`

**Response 200:** `{ data: DonationDetail }`

---

### POST /donations/:id/acknowledge 🔐

Toggles `acknowledgementSent`. Calling again resets to false (allows correction).

**Response 200:** `{ data: DonationSummary }`

---

## Notifications

### GET /notifications 🔐

**Query params:** `?page&pageSize=20&resolved=false&read=false`

**Response 200:** `{ data: NotificationItem[], meta }`

---

### GET /notifications/unread-count 🔐

Polled every 60 seconds by the frontend.

**Response 200:** `{ data: { count: number } }`

---

### POST /notifications/:id/read 🔐

**Response 200:** `{ data: NotificationItem }` (with `read: true`)

---

### POST /notifications/read-all 🔐

**Response 200:** `{ data: { markedRead: number } }`

---

## Reports

All reports return CSV when `Accept: text/csv` is sent, or JSON summary by default.

**Frontend CSV download pattern:**
```ts
const a = document.createElement('a')
a.href = `/api/reports/inventory?${params}`
a.download = 'inventory.csv'
a.click()
// API must set Content-Disposition: attachment; filename="inventory.csv"
```

---

### GET /reports/inventory 🔐

**Query params:** `?status=&acquisitionType=&deviceCategory=&isArchived=`

**JSON response:**
```ts
{
  data: {
    generatedAt: string
    totalItems:  number
    byStatus:    Record<OperationalStatus, number>
    byCategory:  Record<DeviceCategory, number>
    items:       EquipmentSummary[]
  }
}
```

---

### GET /reports/active-loans 🔐

**JSON response:**
```ts
{
  data: {
    generatedAt: string
    total:       number
    loans:       Array<LoanSummary & { daysOnLoan: number }>
  }
}
```

---

### GET /reports/overdue 🔐

**JSON response:**
```ts
{
  data: {
    generatedAt: string
    total:       number
    loans:       Array<LoanSummary & { daysOverdue: number }>
  }
}
```

---

### GET /reports/demo-visits 🔐

Active demo visits only.

**JSON response:**
```ts
{ data: { generatedAt: string; total: number; visits: DemoVisitSummary[] } }
```

---

### GET /reports/allocations 🔐

**JSON response:**
```ts
{ data: { generatedAt: string; total: number; allocations: AllocationSummary[] } }
```

---

### GET /reports/utilisation 🔐

Donated-giveable stock utilisation.

**JSON response:**
```ts
{
  data: {
    generatedAt:      string
    totalGiveable:    number
    availableForLoan: number
    reserved:         number
    onLoan:           number
    allocatedOut:     number
    decommissioned:   number
    utilisation:      number  // percentage: (onLoan + allocatedOut) / totalGiveable
  }
}
```

---

## Import

### POST /equipment/import 🔐 Admin

`Content-Type: multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | CSV matching the import column spec (PRD section 5.11) |
| `dryRun` | boolean | Default `true` — validates without inserting |

**Response 200:**
```ts
{
  data: {
    dryRun:          boolean
    totalRows:       number
    validRows:       number
    errorRows:       number
    errors: Array<{ row: number; field: string; message: string }>
    importedCount?:  number  // only present when dryRun: false and errorRows === 0
  }
}
```

**Behaviour:** if `dryRun: false` and `errorRows > 0`, returns errors and inserts nothing (all-or-nothing).

---

## Dashboard

### GET /dashboard 🔐

Single aggregated endpoint — avoids multiple round trips on page load.

**Response 200:**
```ts
{
  data: {
    stockSummary: {
      total:    number
      byStatus: Record<OperationalStatus, number>
    }
    activeLoans:         number
    overdueLoans:        number
    activeDemoVisits:    number
    forSaleCount:        number
    unreadNotifications: number
    recentActivity:      AuditEntryItem[]  // last 5 entries across all items
  }
}
```

---

## NestJS Implementation Notes

### Cookie Configuration

```ts
// main.ts
app.use(cookieParser())
app.setGlobalPrefix('api')

// AuthService.login()
response.cookie('jwt', token, {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   60 * 60 * 1000,       // 60 minutes
})
response.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
})
```

### DTO Validation

```ts
@IsDateString()   acquiredAt: string         // parse to Date in service layer
@IsNumberString() purchasePrice?: string      // parse with Prisma Decimal
@IsEnum(Condition) condition: Condition
@IsOptional() @IsString() notes?: string
```

### Decimal Serialisation

Prisma returns `Decimal` objects. Serialise to string to avoid floating-point loss:

```ts
purchasePrice: equipment.purchasePrice?.toString() ?? null
```

### CORS Note

If the web app and API are served from the same domain via Nginx (`/` and `/api`), CORS is not needed. If on different origins:

```ts
app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true })
```
