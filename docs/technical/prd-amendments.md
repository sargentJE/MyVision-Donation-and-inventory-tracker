# PRD Amendments — Proposed Resolutions
## MyVision Equipment Tracker

_Date: 2 April 2026_
_Status: **Applied** — all amendments patched into PRD v1.1 and API Reference on 2 April 2026_

> These are recommended resolutions for ambiguities and gaps identified during the documentation review. Once confirmed, each amendment should be patched into the relevant section of [PRD v1.0](../PRD.md) and [API Reference](./api-reference.md).

---

## Amendment 1: Reclassification Status Consequence

**Current state:** PRD §5.1 says reclassify "triggers a status review prompt." API returns 422 "if reclassification creates an inconsistent state." Neither defines what constitutes inconsistency or what happens to the status.

**Proposed resolution:**

When an Admin reclassifies an item's acquisition type, the system checks whether the current operational status is valid for the new type. Three cases:

| Current Status | New Type | Result |
|---|---|---|
| Compatible (e.g. AVAILABLE_FOR_DEMO → PURCHASED) | Any | Status unchanged. Reclassification proceeds. |
| Incompatible, item idle (e.g. AVAILABLE_FOR_DEMO → DONATED_GIVEABLE) | DONATED_GIVEABLE | Status auto-transitions to AVAILABLE_FOR_LOAN. Confirmation dialog shows: "This will also change the item's status to Available for Loan." |
| Incompatible, item active (e.g. ON_DEMO_VISIT → DONATED_GIVEABLE) | Any | Reclassification blocked with 422: "Cannot reclassify while item is on a demo visit. Return the item first." |

**Compatibility matrix:**

| Status | PURCHASED | DONATED_DEMO | DONATED_GIVEABLE |
|---|---|---|---|
| AVAILABLE_FOR_LOAN | ✗ | ✗ | ✓ |
| RESERVED | ✗ | ✗ | ✓ |
| ON_LOAN | ✗ | ✗ | ✓ |
| ALLOCATED_OUT | ✗ | ✗ | ✓ |
| AVAILABLE_FOR_DEMO | ✓ | ✓ | ✗ |
| ON_DEMO_VISIT | ✓ | ✓ | ✗ |
| DECOMMISSIONED | ✓ | ✓ | ✓ |

**Patches needed:**
- PRD §5.1 — replace "triggers a status review prompt" with explicit rules above
- API Reference POST /equipment/:id/reclassify — add 422 body for active-item case, add 200 response note about auto-transition
- State machine diagram — add note on reclassification-triggered transitions

---

## Amendment 2: receiptGeneratedAt Semantics

**Current state:** Schema has `Loan.receiptGeneratedAt`. PRD says receipts can be generated at any time. Unclear whether this tracks first or last generation.

**Proposed resolution:**

`receiptGeneratedAt` is set on first generation and updated on every subsequent generation. It answers the question "has a receipt been generated, and when was the most recent one?"

The GET /loans/:id/receipt endpoint sets `receiptGeneratedAt = now()` as a side effect every time it is called. This is a read endpoint with a write side effect — acceptable because the side effect is lightweight and the alternative (a separate POST endpoint) adds complexity for no operational benefit.

**Patches needed:**
- API Reference GET /loans/:id/receipt — add note: "Sets receiptGeneratedAt on the Loan record on every call."
- Schema decisions — add entry explaining the semantics

---

## Amendment 3: Search Algorithm

**Current state:** PRD §8.3 says free-text search across name, make, model, serial number. API has `?q=`. No implementation spec.

**Proposed resolution:**

Use Prisma `contains` with `mode: 'insensitive'` (maps to PostgreSQL `ILIKE`) across all four fields, combined with OR logic:

```typescript
where: {
  OR: [
    { name:         { contains: q, mode: 'insensitive' } },
    { make:         { contains: q, mode: 'insensitive' } },
    { model:        { contains: q, mode: 'insensitive' } },
    { serialNumber: { contains: q, mode: 'insensitive' } },
  ],
}
```

This is adequate for expected data volumes (sub-1000 items). PostgreSQL full-text search (`tsvector`) is a v2 optimisation if performance degrades — add to open questions table.

**Patches needed:**
- PRD §8.3 — add implementation note
- API Reference GET /equipment — add `q` parameter implementation note

---

## Amendment 4: Notification Cron Operational Detail

**Current state:** PRD §5.10 says "nightly cron" with deduplication. No time, no failure handling, no configurability.

**Proposed resolution:**

- **Schedule:** 06:00 UTC daily. Configurable via `CRON_SCHEDULE` environment variable (cron expression format, default `0 6 * * *`).
- **Failure handling:** on error, log the full error with stack trace. Do not retry until the next scheduled run. The next successful run will pick up any items that became overdue since the last run — no catch-up mechanism needed because the check is stateless (it looks at current state, not deltas).
- **Execution scope:** the cron checks all three notification types in a single run: LOAN_OVERDUE, RESERVATION_EXPIRED, DEMO_VISIT_OVERDUE.
- **Resolution:** before creating new notifications, the cron resolves any existing notifications whose triggering condition no longer applies (e.g. a loan was returned between the expectedReturn date and the cron run).

**Patches needed:**
- PRD §5.10 — add operational detail subsection
- PRD §12 (env vars) — add `CRON_SCHEDULE`

---

## Amendment 5: closedBy on LoanDetail API Response

**Current state:** `Loan.closedByUserId` exists in schema and is populated when a loan is returned, converted, or decommissioned. The `LoanDetail` API response type does not include it.

**Proposed resolution:**

Add `closedBy: UserSummary | null` to the `LoanDetail` type in the API reference. This provides audit transparency on the frontend — users can see who processed a return or conversion without opening the full audit log.

```typescript
type LoanDetail = LoanSummary & {
  equipment:              EquipmentSummary
  closedBy:               UserSummary | null    // ← ADD
  conditionAtLoanNotes:   string | null
  conditionAtReturn:      Condition | null
  conditionAtReturnNotes: string | null
  notes:                  string | null
  receiptGeneratedAt:     string | null
  originatingReservation: ReservationSummary | null
  allocation:             AllocationSummary | null
}
```

**Patches needed:**
- API Reference: LoanDetail type definition

---

## Amendment 6: Direct Allocation User Flow

**Current state:** The action matrix (§8.5) shows "Allocate Directly" as a Staff action on AVAILABLE_FOR_LOAN. The API endpoint exists. But §8.6 (Key User Flows) doesn't include this flow.

**Proposed resolution:**

Add to PRD §8.6:

**Direct allocation:** AVAILABLE_FOR_LOAN item → "Allocate Directly" → client typeahead (CharityLog ID / display name) → optional notes → irreversible confirmation ("This item will be permanently allocated. This cannot be undone.") → success toast.

**Patches needed:**
- PRD §8.6 — add direct allocation flow

---

## Review Checklist

- [x] Amendment 1 confirmed — reclassification rules
- [x] Amendment 2 confirmed — receiptGeneratedAt semantics
- [x] Amendment 3 confirmed — search algorithm
- [x] Amendment 4 confirmed — cron operational detail
- [x] Amendment 5 confirmed — closedBy on LoanDetail
- [x] Amendment 6 confirmed — direct allocation flow
- [x] All patches applied to PRD v1.1 and API Reference
