# Contributing

## Development Setup

See [docs/technical/local-dev-setup.md](./docs/technical/local-dev-setup.md) for full setup instructions.

## Code Conventions

- **TypeScript strict mode** across all packages
- **DTOs:** class-validator decorators with `@MaxLength` on every string field
- **Response envelope:** `{ data: T }` for single resources, `{ data: T[], meta: { total, page, pageSize, totalPages } }` for lists
- **Error codes:** machine-readable uppercase (`VALIDATION_ERROR`, `CONFLICT`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_TRANSITION`)
- **Controllers:** `@UseGuards(JwtAuthGuard, RolesGuard)` at class level, `@Roles(Role.ADMIN)` per method for admin-only endpoints, `ParseUUIDPipe` on all `:id` params
- **Dates:** ISO 8601 strings in API responses, `en-GB` locale for display
- **Imports:** Prisma enums used directly in DTOs (not re-exported from @myvision/types)

## Adding a Backend Module

1. Create `apps/api/src/{name}/` with:
   - `{name}.module.ts` — register controller + providers, export service
   - `{name}.service.ts` — business logic, inject PrismaService
   - `{name}.controller.ts` — endpoints with guards and decorators
   - `dto/` — request validation DTOs
2. Register module in `apps/api/src/app.module.ts`
3. Follow `src/equipment/` as the reference implementation

**Transactions:** Any operation that changes equipment status must use `prisma.$transaction(async (tx) => { ... })` with re-read of equipment inside the transaction for race protection.

**Audit logging:** State changes should create audit entries inside the transaction via `tx.auditEntry.create()`.

## Adding a Frontend Page

1. Create `apps/web/app/(authenticated)/{name}/page.tsx` (use `'use client'` directive)
2. Create `apps/web/hooks/use-{name}.ts` following the `use-equipment.ts` pattern:
   - Response interfaces at the top
   - `buildQuery()` helper for URL params
   - Query hooks using `queryKeys.{name}.list/detail`
   - Mutation hooks invalidating relevant query keys
3. Add nav item to `components/layout/sidebar.tsx` if the page is a top-level section
4. Add page title to `components/layout/header.tsx` `PAGE_TITLES` map
5. Add `aria-label` to any new `<Table>` components

## Adding a Hook

Follow `hooks/use-equipment.ts` as the template:

```typescript
// 1. Response interfaces
interface MySummary { ... }

// 2. Query string builder
function buildQuery(filters: MyFilters): string { ... }

// 3. Query hooks (read)
export function useMyList(filters) { return useQuery({ queryKey, queryFn }); }

// 4. Mutation hooks (write) — invalidate on success
export function useCreateMy() {
  return useMutation({
    mutationFn: (data) => api.post('/my-resource', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_KEY }),
  });
}
```

**Critical:** Mutations that change equipment status must invalidate `queryKeys.equipment.all` so the equipment detail page refetches.

## Accessibility

Follow [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md). Key requirements:

- Every `<Table>` needs `aria-label`
- Every form input needs a `<Label>` (visible or `className="sr-only"`)
- Every loading spinner needs `role="status"` + `aria-label`
- Colour is never the sole indicator of state (text labels always present)
- All animations respect `prefers-reduced-motion`
- Collapsible sections use `aria-expanded`

## Testing

```bash
pnpm type-check          # TypeScript across all packages
pnpm --filter api test   # 39 unit tests (TransitionService)
```

## Git Conventions

- **Commits:** imperative mood, concise ("Add loan return endpoint", not "Added loan return endpoint")
- **Branches:** `feature/{name}`, `fix/{name}`, `docs/{name}`
