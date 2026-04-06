# MyVision Equipment Tracker — Web

Next.js 14 App Router frontend with 15 pages, 13 hooks, and 39 components. Tailwind CSS + shadcn/ui.

## Running

```bash
pnpm --filter web dev          # Dev server on port 3000
pnpm --filter web build        # Production build
pnpm --filter web type-check   # TypeScript check
pnpm --filter web lint         # ESLint
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Key metrics, stock distribution chart, utilisation gauge, category breakdown |
| `/equipment` | Inventory | Searchable/filterable equipment list with status badges |
| `/equipment/new` | Add Equipment | Multi-section form with conditional fields by acquisition type |
| `/equipment/[id]` | Item Detail | Full equipment record, activity timeline, action dialogs |
| `/equipment/[id]/label` | Label Print | Avery L7160 sticker sheet with position picker and QR code |
| `/loans` | Loans | Active and closed loans with filtering |
| `/loans/[id]` | Loan Detail | Loan record with return and convert-to-allocation actions |
| `/clients` | Clients | Client list with typeahead search |
| `/clients/[id]` | Client Detail | Client record with linked loans, allocations, and demos |
| `/donations` | Donations | Donation list with acknowledgement tracking |
| `/donations/[id]` | Donation Detail | Donation record with linked equipment |
| `/reports` | Reports | Six report types with JSON tables and CSV export |
| `/admin/users` | User Management | Admin-only user CRUD, deactivate/reactivate, password reset |
| `/settings` | Account Settings | Self-service profile edit and password change |
| `/login` | Login | Email + password with redirect preservation |

## Hooks

All hooks use TanStack Query with a factory pattern (`lib/query-keys.ts`).

| Hook | Purpose |
|------|---------|
| `use-auth` | Authentication state, login, logout, session refresh |
| `use-account` | Profile update and password change mutations |
| `use-equipment` | Equipment CRUD, search, filtering, status actions |
| `use-loans` | Loan create, return, convert to allocation |
| `use-reservations` | Create, cancel, convert reservation to loan |
| `use-allocations` | Allocations list and create |
| `use-demo-visits` | Start and return demo visits |
| `use-clients` | Client CRUD and typeahead search |
| `use-donations` | Donation CRUD and acknowledgement toggle |
| `use-notifications` | Notification list, unread count, mark read |
| `use-dashboard` | Aggregated dashboard data (metrics, charts, activity) |
| `use-users` | Admin user management mutations |
| `use-toast` | Toast notification state and dispatch |

## Components

| Directory | Count | Contents |
|-----------|:-----:|---------|
| `ui/` | 20 | shadcn/ui primitives — button, dialog, form, input, select, table, etc. |
| `layout/` | 6 | Header, sidebar, bottom-nav, user-menu, notification-bell/drawer |
| `equipment/` | 8 | Status/condition/acquisition badges, activity cards, dialogs |
| `dashboard/` | 3 | CSS-only charts — stock distribution, utilisation gauge, category breakdown |
| `clients/` | 1 | Client typeahead combobox |
| `providers/` | 1 | TanStack Query provider |

## Key Patterns

- **Data fetching:** TanStack Query with `queryKeys` factory for cache key consistency. Mutations invalidate related queries on success.
- **Forms:** React Hook Form + Zod validation. Dialogs reset form state on close.
- **Layout:** Authenticated layout wraps all pages except `/login`. Sidebar on desktop, bottom nav on mobile with sheet for overflow.
- **Dashboard charts:** CSS-only visualisations (stacked bar, progress arc, horizontal bars) — no chart library.
- **Label printing:** `@media print` CSS with mm-unit positioning for Avery L7160 sheets.
- **Error handling:** API errors surfaced via toast notifications. 401 responses trigger redirect to login.
- **Accessibility:** Skip-to-content link, ARIA landmarks, `aria-current` on navigation, keyboard-accessible dialogs. See `docs/ACCESSIBILITY.md`.
