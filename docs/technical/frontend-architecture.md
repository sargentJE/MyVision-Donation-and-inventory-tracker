# Frontend Architecture
## MyVision Equipment Tracker — v1.0

> Defines the component tree, library patterns, and implementation approach for the Next.js frontend. Read alongside [PRD v1.0 §8](../PRD.md) for UI/UX requirements and [API Reference](api-reference.md) for endpoint contracts.

---

## 1. Library Decisions

| Concern | Library | Rationale |
|---|---|---|
| Component primitives | shadcn/ui (Radix + Tailwind) | Accessible by default, composable, no vendor lock-in — components are copied into the project |
| Data fetching | TanStack Query (React Query) v5 | Cache management, polling, optimistic updates, mutation invalidation |
| Forms | react-hook-form + zod | Performant (uncontrolled), schema-driven validation, aligns with NestJS DTO validation |
| Icons | Lucide React | Default for shadcn/ui; consistent icon set |
| Date handling | date-fns | Lightweight, tree-shakeable — no need for Moment/Day.js |
| Package manager | pnpm | Turborepo default; workspace protocol for monorepo packages |

---

## 2. Route Tree

```
apps/web/app/
├── layout.tsx                          # RootLayout: QueryClientProvider, Toaster
├── (public)/
│   ├── layout.tsx                      # PublicLayout: minimal, no navigation
│   └── login/
│       └── page.tsx                    # LoginPage
├── (authenticated)/
│   ├── layout.tsx                      # AuthLayout: Sidebar + Header + NotificationBell + auth guard
│   ├── page.tsx                        # DashboardPage (default route)
│   ├── equipment/
│   │   ├── page.tsx                    # InventoryPage (All Stock + For Sale tabs)
│   │   ├── new/
│   │   │   └── page.tsx               # EquipmentIntakeForm (guided multi-step)
│   │   └── [id]/
│   │       ├── page.tsx               # ItemDetailPage
│   │       └── label/
│   │           └── page.tsx           # QRLabelPrintPage (@media print optimised)
│   ├── loans/
│   │   ├── page.tsx                   # LoanListPage (active + overdue tabs)
│   │   └── [id]/
│   │       └── page.tsx               # LoanDetailPage
│   ├── clients/
│   │   ├── page.tsx                   # ClientListPage
│   │   └── [id]/
│   │       └── page.tsx               # ClientDetailPage
│   ├── donations/
│   │   ├── page.tsx                   # DonationListPage
│   │   └── [id]/
│   │       └── page.tsx               # DonationDetailPage
│   ├── reports/
│   │   └── page.tsx                   # ReportsPage (export triggers)
│   ├── settings/
│   │   └── page.tsx                   # SettingsPage (profile edit + password change)
│   └── admin/
│       └── users/
│           └── page.tsx               # UserManagementPage (Admin only)
```

---

## 3. Layout Hierarchy

```
RootLayout
├── QueryClientProvider
├── Toaster (shadcn Toast)
│
├── PublicLayout
│   └── LoginPage
│
└── AuthLayout
    ├── Sidebar (desktop) / BottomNav (mobile)
    │   └── NavItem[] (Dashboard, Inventory, Loans, Clients, Donations, Reports, Admin)
    ├── Header
    │   ├── PageTitle (from route metadata)
    │   ├── NotificationBell → NotificationDrawer
    │   └── UserMenu (name + logout)
    └── PageContent (children)
```

### Auth guard

`AuthLayout` wraps all authenticated routes. On mount, it checks for a valid JWT cookie by calling `GET /auth/refresh` (TanStack Query). On 401, it redirects to `/login?redirect=[current path]`.

The auth state is held in a TanStack Query cache entry (`['auth', 'user']`) — not in React context or Zustand. This keeps auth consistent with the data fetching layer and avoids a separate state management dependency.

---

## 4. Shared Component Inventory

### 4.1 Display Components

| Component | shadcn/ui Base | Props | Notes |
|---|---|---|---|
| `StatusBadge` | Badge | `status: OperationalStatus` | Colour variants: green (available), amber (reserved/on demo), blue (on loan), purple (allocated), red (decommissioned). Text label always visible alongside colour (WCAG 1.4.1). |
| `ConditionBadge` | Badge | `condition: Condition` | GOOD (green), FAIR (amber), POOR (red). |
| `AcquisitionBadge` | Badge | `type: AcquisitionType` | Neutral styling — informational only. |
| `EmptyState` | — (custom) | `message: string, action?: { label, href }` | Centred layout with optional CTA button. Messages per view from PRD §8.9. |
| `PageHeader` | — (custom) | `title, breadcrumbs?, primaryAction?` | Title + optional breadcrumb trail + top-right action button. |

### 4.2 Data Components

| Component | shadcn/ui Base | Props | Notes |
|---|---|---|---|
| `DataTable` | Table | `columns, data, pagination, onSort` | Reusable across inventory, loans, clients, donations, audit log. Pagination controls with descriptive labels (WCAG 2.4.6). |
| `PaginationControls` | Pagination | `page, totalPages, onPageChange` | "Go to next page" / "Go to previous page" labels — not icon-only. |
| `SearchBar` | Input | `value, onChange, placeholder` | Debounced (300ms). Updates URL search params via `useSearchParams`. |
| `FilterBar` | Select (multi) | `filters: FilterConfig[]` | Renders multi-select dropdowns for status, acquisition type, device category. Updates URL search params. |
| `RecentActivityFeed` | — (custom) | `entries: AuditEntryItem[]` | Renders last N audit entries with event icon, item name (linked), timestamp. |

### 4.3 Interaction Components

| Component | shadcn/ui Base | Props | Notes |
|---|---|---|---|
| `ActionButton` | Button | `action, onClick, variant` | Contextual action buttons. Variant: primary (main CTA), secondary, destructive. |
| `PrimaryActions` | — (custom) | `status, role, equipment` | Data-driven from action matrix (§8.5). Renders correct `ActionButton` set per status per role. Restricted actions hidden, not disabled. |
| `ConfirmDialog` | AlertDialog | `title, description, onConfirm, irreversible?, reasonRequired?` | Shows "This cannot be undone" for irreversible actions. Optional textarea for reason notes. |
| `ClientTypeahead` | Command (Combobox) | `onSelect, allowCreate?` | Searches via `GET /clients/search?q=`. "Create new client" option at bottom when `allowCreate`. |
| `NotificationBell` | Button | — | Badge count from `useNotificationCount()`. Opens `NotificationDrawer`. Badge must not rely on colour alone. |
| `NotificationDrawer` | Sheet | — | Slide-out (desktop) / full-screen (mobile). Paginated list, mark-as-read, navigate to related record. |

### 4.4 Form Components

| Component | shadcn/ui Base | Props | Notes |
|---|---|---|---|
| `FormField` | FormField (shadcn) | Wraps react-hook-form `Controller` | Inline error below field on blur. Error linked via `aria-describedby`. |
| `ConditionSelect` | Select | `name, control` | Dropdown for GOOD / FAIR / POOR. |
| `StatusSelect` | Select (multi) | `name, control` | Multi-select for filter bar — not for status changes (those use dedicated actions). |
| `DatePicker` | Calendar + Popover | `name, control` | ISO date string output. |

---

## 5. Page Decompositions

### 5.1 DashboardPage

```
DashboardPage
├── PageHeader (title: "Dashboard")
├── WidgetGrid (responsive: 2-col desktop, 1-col mobile)
│   ├── StockSummaryCard
│   │   └── StatusBadge[] (pill badges per status with count)
│   ├── ActiveLoansCard (count + link to /loans)
│   ├── OverdueCard (count + severity colour + link to /reports)
│   ├── DemoVisitCard (count + link)
│   ├── ForSaleCard (count + link)
│   └── NotificationSummaryCard (unread count + link)
├── RecentActivityFeed (last 5 audit entries)
└── EmptyState (shown on first deploy: "Get started" prompt)
```

Query: `useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard') })`

### 5.2 InventoryPage

```
InventoryPage
├── PageHeader (title: "Inventory", primaryAction: "Add Equipment" → /equipment/new)
├── Tabs (shadcn Tabs)
│   ├── Tab: "All Stock"
│   │   ├── SearchBar
│   │   ├── FilterBar (status, acquisitionType, deviceCategory) + ArchivedToggle
│   │   ├── DataTable
│   │   │   ├── Columns: Name, Make/Model, Category, AcquisitionBadge, StatusBadge, ConditionBadge, Date Added, QuickAction
│   │   │   └── QuickAction: single most-relevant contextual action per row
│   │   └── PaginationControls
│   └── Tab: "For Sale"
│       ├── DataTable (auto-filtered: PURCHASED + isForSale + not archived)
│       └── EmptyState ("No items flagged for sale...")
```

Query: `useQuery({ queryKey: ['equipment', 'list', filters], queryFn: ... })`
Filters synced to URL search params via `useSearchParams`.

### 5.3 ItemDetailPage

The most-used screen. Must function fully on mobile.

```
ItemDetailPage
├── PageHeader
│   ├── ItemName
│   ├── StatusBadge
│   └── AcquisitionBadge
├── PrimaryActions (above the fold on mobile)
│   └── ActionButton[] (data-driven from action matrix + current status + user role)
├── ItemMetadataGrid
│   ├── Make / Model / Serial Number
│   ├── Device Category
│   ├── ConditionBadge + condition notes
│   ├── Acquired date / Supplier or Donor info
│   └── Warranty expiry (if PURCHASED)
├── CurrentActivityPanel (conditional rendering)
│   ├── ReservationCard (if RESERVED) — client, reserved date, expires, cancel/convert actions
│   ├── LoanCard (if ON_LOAN) — client, loaned date, expected return, return/convert actions
│   ├── AllocationCard (if ALLOCATED_OUT) — client, allocated date, originating loan link
│   └── DemoVisitCard (if ON_DEMO_VISIT) — destination, started, expected return, return action
├── HistoryTimeline
│   └── TimelineEntry[] (past loans, reservations, allocations, demo visits — reverse chronological)
├── AuditLog (Collapsible)
│   ├── DataTable (paginated at 20/page)
│   └── Columns: Event, Field, Old Value, New Value, Changed By, Timestamp, Note
└── AdminActionsPanel (Admin only — visually separated)
    ├── Decommission → ConfirmDialog (irreversible, reason required)
    ├── Archive → ConfirmDialog (reason optional)
    ├── Reclassify → ReclassifyDialog (select new type + reason)
    └── Flag for Sale (if PURCHASED)
```

Queries:
- `useQuery({ queryKey: ['equipment', id], queryFn: ... })` — item detail
- `useQuery({ queryKey: ['equipment', id, 'audit-log', page], queryFn: ... })` — audit log (lazy-loaded on expand)

### 5.4 EquipmentIntakeForm

Multi-step guided form.

```
EquipmentIntakeForm
├── Step 1: BasicInfoStep
│   ├── FormField: name (required)
│   ├── FormField: deviceCategory (select, required)
│   ├── FormField: acquisitionType (select, required — drives conditional fields)
│   ├── FormField: condition (ConditionSelect, required)
│   └── FormField: acquiredAt (DatePicker, required)
├── Step 2: DetailsStep
│   ├── FormField: make
│   ├── FormField: model
│   ├── FormField: serialNumber (blur-validated for uniqueness against API)
│   ├── FormField: conditionNotes
│   └── FormField: notes
├── Step 3: AcquisitionDetailsStep (conditional)
│   ├── If PURCHASED: purchasePrice, supplier, warrantyExpiry
│   └── If DONATED_*: donorName (required), donorOrg, donatedAt — OR link existing Donation
├── Step 4: ReviewStep
│   └── Summary of all fields + derived initial status display
└── StepIndicator (progress bar / step numbers)
```

Form: `useForm<CreateEquipmentInput>({ resolver: zodResolver(createEquipmentSchema), mode: 'onBlur' })`

### 5.5 LoanCreationFlow

Triggered from ItemDetailPage "Issue Loan" action. Opens as a full-page flow (not a modal — too many fields for a modal on mobile).

```
LoanCreationFlow
├── Step 1: SelectClient
│   ├── ClientTypeahead (search existing)
│   └── InlineClientCreate (create new: charitylogId + displayName)
├── Step 2: LoanDetails
│   ├── FormField: expectedReturn (DatePicker, optional)
│   ├── FormField: conditionAtLoan (ConditionSelect)
│   ├── FormField: conditionAtLoanNotes
│   └── FormField: notes
├── Step 3: Review
│   ├── Equipment summary (name, serial, current condition)
│   ├── Client summary
│   └── Loan details summary
└── Step 4: Confirmation
    ├── Success message
    └── ReceiptDownloadButton (window.open to /api/loans/:id/receipt)
```

---

## 6. TanStack Query Patterns

### 6.1 Query Key Structure

```typescript
export const queryKeys = {
  auth:          { user: ['auth', 'user'] as const },
  dashboard:     ['dashboard'] as const,
  equipment: {
    all:         ['equipment'] as const,
    list:        (filters: EquipmentFilters) => ['equipment', 'list', filters] as const,
    detail:      (id: string) => ['equipment', id] as const,
    auditLog:    (id: string, page: number) => ['equipment', id, 'audit-log', page] as const,
  },
  loans: {
    all:         ['loans'] as const,
    list:        (filters: LoanFilters) => ['loans', 'list', filters] as const,
    detail:      (id: string) => ['loans', id] as const,
  },
  reservations: {
    list:        (filters: ReservationFilters) => ['reservations', 'list', filters] as const,
    detail:      (id: string) => ['reservations', id] as const,
  },
  allocations: {
    list:        (filters: AllocationFilters) => ['allocations', 'list', filters] as const,
    detail:      (id: string) => ['allocations', id] as const,
  },
  demoVisits: {
    list:        (filters: DemoVisitFilters) => ['demo-visits', 'list', filters] as const,
    detail:      (id: string) => ['demo-visits', id] as const,
  },
  clients: {
    search:      (q: string) => ['clients', 'search', q] as const,
    list:        (filters: ClientFilters) => ['clients', 'list', filters] as const,
    detail:      (id: string) => ['clients', id] as const,
  },
  donations: {
    list:        (filters: DonationFilters) => ['donations', 'list', filters] as const,
    detail:      (id: string) => ['donations', id] as const,
  },
  notifications: {
    list:        (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;
```

### 6.2 Mutation + Invalidation Pattern

```typescript
// Example: return a loan
export function useReturnLoan(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReturnLoanInput) =>
      api.post(`/loans/${loanId}/return`, data),
    onSuccess: (updatedLoan) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(loanId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(updatedLoan.data.equipmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}
```

### 6.3 Notification Polling

```typescript
// In AuthLayout or a dedicated NotificationProvider
const { data } = useQuery({
  queryKey: queryKeys.notifications.unreadCount,
  queryFn: () => api.get('/notifications/unread-count'),
  refetchInterval: 60_000,     // 60 seconds — matches PRD spec
  refetchIntervalInBackground: false,  // don't poll when tab is hidden
});
```

### 6.4 Status Transition Conflict Handling

When a mutation returns 422 (another user changed status), the frontend shows a toast and refetches the equipment detail:

```typescript
onError: (error) => {
  if (error.status === 422 && error.body?.error === 'INVALID_TRANSITION') {
    toast({ title: "This item's status has changed. Refreshing...", variant: 'warning' });
    queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(id) });
  }
}
```

---

## 7. Zod Schemas

Derived from the API reference request body types. Shared in `packages/types/` for use by both frontend validation and (optionally) backend DTO validation.

```typescript
// packages/types/src/schemas/equipment.ts
import { z } from 'zod';

export const createEquipmentSchema = z.object({
  name:            z.string().min(1, 'Name is required'),
  deviceCategory:  z.nativeEnum(DeviceCategory),
  acquisitionType: z.nativeEnum(AcquisitionType),
  condition:       z.nativeEnum(Condition),
  acquiredAt:      z.string().date('Invalid date format'),
  make:            z.string().optional(),
  model:           z.string().optional(),
  serialNumber:    z.string().optional(),
  conditionNotes:  z.string().optional(),
  notes:           z.string().optional(),
  // Conditional: PURCHASED
  purchasePrice:   z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price').optional(),
  supplier:        z.string().optional(),
  warrantyExpiry:  z.string().date().optional(),
  // Conditional: DONATED
  donationId:      z.string().uuid().optional(),
  donorName:       z.string().optional(),
  donorOrg:        z.string().optional(),
  donatedAt:       z.string().date().optional(),
}).superRefine((data, ctx) => {
  if ((data.acquisitionType === 'DONATED_DEMO' || data.acquisitionType === 'DONATED_GIVEABLE')
      && !data.donationId && !data.donorName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Donor name is required for donated items',
      path: ['donorName'],
    });
  }
});
```

---

## 8. Folder Structure (apps/web)

```
apps/web/
├── app/                          # Next.js App Router (see §2 Route Tree)
├── components/
│   ├── ui/                       # shadcn/ui primitives (copied in via CLI)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── header.tsx
│   │   ├── user-menu.tsx
│   │   └── page-header.tsx
│   ├── equipment/
│   │   ├── status-badge.tsx
│   │   ├── condition-badge.tsx
│   │   ├── acquisition-badge.tsx
│   │   ├── primary-actions.tsx
│   │   ├── item-metadata-grid.tsx
│   │   ├── current-activity-panel.tsx
│   │   ├── history-timeline.tsx
│   │   ├── admin-actions-panel.tsx
│   │   ├── intake-form/
│   │   │   ├── basic-info-step.tsx
│   │   │   ├── details-step.tsx
│   │   │   ├── acquisition-details-step.tsx
│   │   │   ├── review-step.tsx
│   │   │   └── step-indicator.tsx
│   │   └── qr-label.tsx
│   ├── loans/
│   │   ├── loan-card.tsx
│   │   ├── loan-creation-flow/
│   │   │   ├── select-client-step.tsx
│   │   │   ├── loan-details-step.tsx
│   │   │   ├── review-step.tsx
│   │   │   └── confirmation-step.tsx
│   │   └── receipt-download-button.tsx
│   ├── clients/
│   │   ├── client-typeahead.tsx
│   │   └── inline-client-create.tsx
│   ├── notifications/
│   │   ├── notification-bell.tsx
│   │   └── notification-drawer.tsx
│   ├── shared/
│   │   ├── data-table.tsx
│   │   ├── pagination-controls.tsx
│   │   ├── search-bar.tsx
│   │   ├── filter-bar.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   └── form-field.tsx
│   └── dashboard/
│       ├── stock-summary-card.tsx
│       ├── stat-card.tsx          # Reused for loans, overdue, demo visits, for sale
│       └── recent-activity-feed.tsx
├── hooks/
│   ├── use-auth.ts               # Auth state from TanStack Query cache
│   ├── use-equipment.ts          # useEquipment, useEquipmentList, useCreateEquipment, etc.
│   ├── use-loans.ts
│   ├── use-reservations.ts
│   ├── use-allocations.ts
│   ├── use-demo-visits.ts
│   ├── use-clients.ts
│   ├── use-donations.ts
│   ├── use-notifications.ts
│   ├── use-dashboard.ts
│   ├── use-account.ts             # useUpdateProfile, useChangePassword
│   └── use-users.ts               # Admin user management (CRUD, deactivate)
├── lib/
│   ├── api.ts                    # Fetch wrapper with credentials: 'include'
│   ├── query-client.ts           # QueryClient config
│   └── query-keys.ts             # Query key factory (see §6.1)
├── styles/
│   └── globals.css               # Tailwind imports + CSS variables for brand colours
└── types/
    └── index.ts                  # Re-exports from packages/types
```

---

## 9. API Client

All API calls go through a shared fetch wrapper that handles credentials, JSON parsing, and error normalisation:

```typescript
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Attempt refresh, then redirect to login if that also fails
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    throw new Error('Unauthenticated');
  }

  const body = await res.json();

  if (!res.ok) {
    const error = new Error(body.message ?? 'Request failed') as any;
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch:  <T>(path: string, data?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

---

## 10. Responsive Strategy

- **Mobile-first:** Login page and ItemDetailPage designed for 375px upward. PrimaryActions must be above the fold.
- **Desktop-primary:** all other pages. Functional on tablet but optimised for desktop use.
- **Breakpoints:** Tailwind defaults (`sm: 640px`, `md: 768px`, `lg: 1024px`).
- **Navigation switch:** Sidebar (lg+) → BottomNav (below lg). Use `useMediaQuery` or Tailwind `hidden`/`block` classes.
- **NotificationDrawer:** Sheet (slide-out, lg+) → full-screen overlay (below lg).
