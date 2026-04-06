# Schema Design Decisions
## MyVision Equipment Tracker — Prisma Schema v1.0

This document explains non-obvious schema decisions. Read alongside [schema.prisma](schema.md).

---

## IDs

All models use `@default(uuid())`. `cuid()` is functionally equivalent but carries a deprecation warning in Prisma 5+. UUIDs are standard, natively supported, and fine for a low-traffic internal tool.

---

## Date vs DateTime

Prisma uses `DateTime` for all temporal types. For fields that are conceptually date-only (no time component), `@db.Date` is applied. This maps to PostgreSQL's native `DATE` column type and prevents false precision.

Fields using `@db.Date`:
- `Equipment.acquiredAt`, `Equipment.warrantyExpiry`
- `Loan.expectedReturn`
- `Reservation.expiresAt`
- `DemoVisit.expectedReturn`
- `Donation.donatedAt`

---

## Table Naming

All models carry `@@map("snake_case")` to produce conventional PostgreSQL table names. Without this, Prisma would use PascalCase table names (`AuditEntry` instead of `audit_entries`), which is not standard PostgreSQL convention.

---

## Named Relations

The `User` model appears as a foreign key in many other models with different semantic meanings (decommissionedBy, archivedBy, reservedBy, etc.). Prisma requires named relations when multiple paths exist between the same two models. All such relations use `@relation("DescriptiveName")` to keep queries unambiguous.

The 12 back-relations on `User` are intentional and correct. `User` is a central actor model — it records who performed every meaningful action in the system.

---

## Typed Close Reasons

Rather than free-text `closedReason String?` fields, the schema uses three separate enums:

- `ReservationCloseReason` — CONVERTED_TO_LOAN | CANCELLED | DECOMMISSIONED
- `LoanCloseReason` — RETURNED | CONVERTED_TO_ALLOCATION | DECOMMISSIONED
- `DemoVisitCloseReason` — RETURNED | DECOMMISSIONED

This gives compile-time safety, prevents typos, and makes intent explicit. The `DECOMMISSIONED` value on each covers the edge case where an Admin decommissions an item with an active dependent record — the dependent record is auto-closed.

---

## Unique Constraints for One-to-One Enforcement

**`Loan.originatingReservationId @unique`**
A reservation can only produce one loan. `@unique` prevents a second loan from being created against the same reservation. This changes the Prisma relation type from `Reservation → Loan[]` (one-to-many) to `Reservation → Loan?` (one-to-one-optional), which is semantically correct.

**`Allocation.originatingLoanId @unique`**
A loan can only produce one allocation. Same reasoning.

**`Allocation.equipmentId @unique`**
An item can have at most one active allocation. DB-level enforcement of the `ALLOCATED_OUT` business rule.

---

## onDelete Behaviours

| Pattern | Used when |
|---|---|
| `Restrict` | Parent deletion must be blocked if children exist — protects audit trail |
| `SetNull` | Child record remains valid without its parent — e.g. actor who decommissioned an item |
| `Cascade` | Child has no meaning without parent — RefreshToken, NotificationRead |

In practice, Equipment and Client records are never hard-deleted — they are decommissioned/archived and anonymised respectively. `Restrict` is a safety net rather than a blocking concern in normal operation.

---

## AuditEntry.targetUserId

Added beyond the PRD spec. For `USER_CREATED` and `USER_DEACTIVATED` events, `equipmentId` is null — the subject is a User. `targetUserId` records who was acted upon, enabling queries like "all audit events involving user X" from either direction. Useful for compliance and offboarding scenarios.

---

## Notification Deduplication Indexes

The nightly cron checks: "does an unresolved notification of this type for this entity already exist?" Query pattern:

```sql
WHERE type = $1 AND relatedLoanId = $2 AND resolvedAt IS NULL
```

Three composite indexes cover the three notification types:

```
@@index([type, relatedLoanId, resolvedAt])
@@index([type, relatedReservationId, resolvedAt])
@@index([type, relatedDemoVisitId, resolvedAt])
```

Prisma does not support partial indexes natively. These composite indexes are a practical alternative — sufficient for expected data volumes. If performance becomes an issue, add a raw SQL migration for partial indexes.

---

## Equipment.status Field Name

The PRD uses `operationalStatus` throughout. In the schema this is shortened to `status` — unambiguous in context and reduces query verbosity in NestJS service code. The `OperationalStatus` enum type retains the full name.

---

## package.json Seed Config

Add to `apps/api/package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Required dev dependencies: `ts-node`, `bcrypt`, `@types/bcrypt`.

---

## First Migration Commands

```bash
# From apps/api/
npx prisma migrate dev --name init    # Local first migration
npx prisma migrate deploy             # Production — runs pending migrations
npx prisma db seed                    # Create initial admin user
npx prisma studio                     # Visual DB browser (dev only)
```

---

## What the Schema Does Not Enforce at DB Level

The following rules live in application code (NestJS service layer):

1. **acquisitionType → initial status** — enforced in `EquipmentService.create()`
2. **Status transition validity** — enforced in `TransitionService.validate()`
3. **isForSale only on PURCHASED items** — application rejects attempts on other types
4. **Loan eligibility** — enforced in `LoanService.create()`
5. **One active loan per item** — handled by status check; no schema unique constraint possible for `returnedAt IS NULL` conditions in standard Prisma

For rule 5, add DB-level enforcement via raw SQL after initial migration:

```sql
CREATE UNIQUE INDEX loans_active_unique
  ON loans ("equipmentId")
  WHERE "returnedAt" IS NULL;
```

Recommended before production go-live.

---

## Notification onDelete Behaviours

The four FK relations on Notification use different `onDelete` behaviours deliberately:

| Relation | onDelete | Rationale |
|---|---|---|
| `relatedEquipmentId` | `SetNull` | Equipment is never hard-deleted (only decommissioned/archived). If somehow deleted, the notification should remain visible with a null equipment reference rather than disappearing. |
| `relatedLoanId` | `Cascade` | A notification about a loan has no meaning if the loan record is gone. |
| `relatedReservationId` | `Cascade` | Same reasoning as loans. |
| `relatedDemoVisitId` | `Cascade` | Same reasoning as loans. |

In practice, none of these parent records are ever hard-deleted in normal operation — `Restrict` on Equipment, Client, and most other models prevents accidental deletion. These behaviours are safety nets for the unlikely case of manual database intervention.

---

## RefreshToken.token Storage

The `token` field on `RefreshToken` stores the **bcrypt hash** of the plaintext token sent to the client. The plaintext token is never stored in the database.

**Flow:**
1. On login, generate a cryptographically random token (e.g. `crypto.randomBytes(32).toString('hex')`)
2. Hash it: `bcrypt.hash(plaintextToken, 12)`
3. Store the hash in `RefreshToken.token`
4. Return the plaintext token to the client as an httpOnly cookie

**Validation:**
1. Client sends plaintext token in cookie
2. Server looks up `RefreshToken` by hashing the incoming value and querying for a match — or more efficiently, stores a secondary lookup key
3. Use `bcrypt.compare(incomingPlaintext, storedHash)` to validate

> **Common mistake:** storing the token directly (unhashed) means a database leak exposes all active sessions. The hash means a leak is useless without the plaintext tokens — which only exist in the clients' httpOnly cookies.

This is the same security model used for the admin password in `seed.ts`.
