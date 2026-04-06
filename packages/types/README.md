# @myvision/types

Shared TypeScript enums and Zod schemas used by both `apps/api` and `apps/web`.

## Build

```bash
pnpm --filter @myvision/types build        # Compile to dist/
pnpm --filter @myvision/types type-check   # TypeScript check
```

## Exports

### Enums (10)

| Enum | Values |
|------|--------|
| `Role` | ADMIN, STAFF |
| `DeviceCategory` | DIGITAL_MAGNIFIER, CCTV_MAGNIFIER, TEXT_TO_SPEECH, SMARTPHONE, TABLET, MONITOR, OTHER |
| `AcquisitionType` | PURCHASED, DONATED_DEMO, DONATED_GIVEABLE |
| `OperationalStatus` | AVAILABLE_FOR_LOAN, RESERVED, ON_LOAN, ALLOCATED_OUT, AVAILABLE_FOR_DEMO, ON_DEMO_VISIT, DECOMMISSIONED |
| `Condition` | GOOD, FAIR, POOR |
| `AuditEvent` | 20 lifecycle events (ITEM_CREATED through USER_DEACTIVATED) |
| `NotificationType` | LOAN_OVERDUE, RESERVATION_EXPIRED, DEMO_VISIT_OVERDUE |
| `ReservationCloseReason` | CONVERTED_TO_LOAN, CANCELLED, DECOMMISSIONED |
| `LoanCloseReason` | RETURNED, CONVERTED_TO_ALLOCATION, DECOMMISSIONED |
| `DemoVisitCloseReason` | RETURNED, DECOMMISSIONED |

All enums mirror the Prisma schema enums to keep API and frontend in sync without importing Prisma client.

### Schemas

| Export | Description |
|--------|-------------|
| `createEquipmentSchema` | Zod schema for equipment creation with conditional validation (purchase fields for PURCHASED, donor fields for DONATED types) |
| `CreateEquipmentInput` | TypeScript type inferred from the schema via `z.infer` |
