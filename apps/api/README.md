# MyVision Equipment Tracker — API

NestJS 10 backend with 14 modules and 64 REST endpoints. PostgreSQL 16 via Prisma 5.

## Running

```bash
pnpm --filter api dev          # Watch mode on port 3001
pnpm --filter api build        # Production build
pnpm --filter api type-check   # TypeScript check
pnpm --filter api test         # 39 unit tests
pnpm --filter api prisma studio  # Visual database browser
```

## Modules

| Module | Endpoints | Purpose |
|--------|:---------:|---------|
| auth | 6 | JWT login, refresh, logout, profile (GET/PATCH /me), change password |
| users | 7 | Admin-only user CRUD, deactivate, reactivate, reset password |
| equipment | 12 | CRUD, decommission, archive, reclassify, flag for sale, audit log, CSV import |
| clients | 5 | Search typeahead, CRUD, anonymise (Admin) |
| reservations | 5 | Create, cancel, convert to loan, list, detail |
| loans | 6 | Create, return, convert to allocation, list, detail, receipt stub |
| allocations | 3 | Create, list, detail |
| demo-visits | 4 | Start, return, list, detail |
| notifications | 4 | List, unread count, mark read, mark all read |
| donations | 5 | CRUD, acknowledgement toggle |
| reports | 6 | Inventory, active loans, overdue, demo visits, allocations, utilisation (JSON + CSV) |
| dashboard | 1 | Aggregated widget data |
| audit | — | Global service (AuditService.log), used by other modules |
| prisma | — | Global database service |

## Key Patterns

- **Auth:** Cookie-based JWT (`httpOnly`, `sameSite: strict`). Refresh tokens hashed with SHA-256, rotated on each use.
- **Transactions:** Every equipment status change wrapped in `prisma.$transaction()` with the domain record, status update, and audit entry all atomic.
- **Error handling:** `HttpExceptionFilter` transforms errors to `{ error, message, detail? }`. `AllExceptionsFilter` catches unhandled errors, prevents stack trace leaks.
- **Guards:** `JwtAuthGuard` + `RolesGuard` on all controllers. `@Roles(Role.ADMIN)` on admin-only endpoints.
- **Cron:** Daily notification check at 06:00 UTC (configurable via `CRON_SCHEDULE`). Auto-resolves stale notifications, creates new ones for overdue items.

## Environment Variables

See [.env.example](../../.env.example) for all required variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — min 32 chars, used for JWT signing
- `REFRESH_TOKEN_SECRET` — separate from JWT_SECRET
- `CRON_SCHEDULE` — notification cron (default: `0 6 * * *`)
