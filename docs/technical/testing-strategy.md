# Testing Strategy
## MyVision Equipment Tracker — v1.0

> Defines the testing approach, framework choices, critical path scenarios, and quality gates for the Equipment Tracker. Read alongside [PRD v1.0](../PRD.md) and [State Machine Diagrams](state-machine.md).

---

## 1. Framework Choices

| Layer | Tool | Purpose |
|---|---|---|
| Unit tests (backend) | Vitest | NestJS service logic, utility functions, enum validation |
| API integration tests | Vitest + Supertest | Full request/response cycle against a test database |
| Unit tests (frontend) | Vitest + React Testing Library | Component rendering, form validation, conditional UI |
| End-to-end tests | Playwright | Multi-page user flows, auth, QR scan redirect |
| Accessibility tests | @axe-core/playwright | Automated WCAG 2.2 AA checks on rendered pages |
| Visual regression | Playwright screenshots | Catch unintended UI changes (optional, v2 candidate) |
| CI pipeline | GitHub Actions | Run all tests on PR and push to main |

### Test database

API integration and e2e tests use a dedicated Postgres instance (Docker, via `docker-compose.test.yml`). Prisma migrations run before the test suite. Each test file or describe block uses a transaction that rolls back after completion — no shared state between tests.

---

## 2. Test Categories

### 2.1 Unit Tests (Backend)

Scope: individual service methods, pure functions, enum mappings, validation logic.

**No database.** Dependencies (PrismaService, other services) are mocked.

Key targets:
- `TransitionService.validate()` — every cell in the [transition validation matrix](state-machine.md#transition-validation-matrix)
- `TransitionService.getAvailableActions()` — returns correct actions per status per role
- Audit event construction — correct event type, field values, actor attribution
- Notification deduplication logic — should-create vs should-skip
- CSV import row validation — all validation rules from PRD §5.11
- Zod schema validation — all request body schemas reject invalid input

Coverage target: **90%** on `TransitionService`, `LoanService`, `EquipmentService`. **80%** elsewhere.

### 2.2 API Integration Tests

Scope: full HTTP request → NestJS handler → Prisma → Postgres → HTTP response cycle.

**Real database** (test instance). Tests verify: correct status codes, response shapes matching the [API Reference](api-reference.md), database state after mutations, audit log entries created, error contracts.

Key targets:
- Every endpoint in the API reference gets at least one success and one error test
- Status transition endpoints: test every valid transition AND every invalid transition returns 422
- Permission enforcement: every Admin-only endpoint returns 403 for Staff
- Unique constraint enforcement: serial number and CharityLog ID return 409
- Decommission with active dependents: forceClose=false returns 409 with conflicts, forceClose=true succeeds and auto-closes dependents
- Notification cron: run cron, verify notifications created/deduplicated/resolved correctly
- CSV import: valid file inserts, invalid file returns errors, dry-run mode validates without inserting

Coverage target: **95%** endpoint coverage (every route tested). **85%** line coverage.

### 2.3 Unit Tests (Frontend)

Scope: component rendering, conditional visibility, form validation feedback, role-based UI.

Key targets:
- `StatusBadge` renders correct colour and label for each OperationalStatus
- `PrimaryActions` renders correct buttons per status per role (mirror action matrix §8.5)
- `ActionButton` — restricted actions hidden (not disabled) for Staff role
- Form validation: inline errors appear on blur, serial number duplicate check triggers on blur
- `ConfirmDialog` — irreversible actions show "This cannot be undone"
- `EmptyState` — correct message per view (§8.9)
- `NotificationBell` — badge count updates, badge does not rely on colour alone

Coverage target: **80%** component coverage.

### 2.4 End-to-End Tests (Playwright)

Scope: multi-page flows exercising the full stack. Run against the Docker Compose test environment.

**Critical path scenarios:**

| # | Scenario | PRD Reference | Priority |
|---|---|---|---|
| 1 | Login → dashboard loads with correct widgets | §3.3, §8.2 | P0 |
| 2 | Create equipment (DONATED_GIVEABLE) → appears in inventory → item detail page loads | §5.1, §8.3, §8.4 | P0 |
| 3 | Reserve → convert to loan → download receipt → return loan | §5.3, §5.4, §5.7, §8.6 | P0 |
| 4 | Issue loan directly (no reservation) → convert to allocation | §5.4, §5.5, §8.6 | P0 |
| 5 | Start demo visit → return from demo visit | §5.6, §8.6 | P0 |
| 6 | Decommission item with active reservation (forceClose) | §4.5, §5.1 | P0 |
| 7 | QR scan (unauthenticated) → login redirect → item detail page | §5.2, §8.6 | P0 |
| 8 | Staff attempts Admin-only action → action not visible in UI | §3.2, §8.5 | P0 |
| 9 | Bulk CSV import (dry-run then live) | §5.11 | P1 |
| 10 | Client inline creation during loan flow | §5.13, §8.6 | P1 |
| 11 | Notification cron → overdue loan appears in notification centre → click navigates to loan | §5.10, §8.7 | P1 |
| 12 | Session expiry → redirect to login → return to original page | §3.3, §8.10 | P1 |
| 13 | Archive item → toggle archived view → item visible (muted) | §4.4, §8.3 | P1 |
| 14 | Anonymise client → display name shows "Anonymised" | §5.13 | P2 |
| 15 | Flag for sale → For Sale tab shows item | §5.9, §8.3 | P2 |

**Mobile viewport tests:** scenarios 2, 3, 7 re-run at 375px viewport width. Item detail primary action must be above the fold.

### 2.5 Accessibility Tests

**Automated (every e2e test):**

Every Playwright test page navigation runs `@axe-core/playwright` and asserts zero violations at WCAG 2.2 AA level. This catches: missing alt text, colour contrast failures, missing form labels, missing ARIA attributes, broken heading hierarchy, and touch target violations.

```typescript
import AxeBuilder from '@axe-core/playwright';

// Add to every page navigation in e2e tests
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
  .analyze();
expect(results.violations).toEqual([]);
```

**Manual accessibility checklist (pre-release):**

Run once before each release. Cannot be automated.

- [ ] Keyboard-only navigation: complete loan creation flow without mouse
- [ ] Keyboard-only navigation: complete return-from-QR flow without mouse
- [ ] Screen reader (VoiceOver): inventory table announces sort changes
- [ ] Screen reader: status badge reads status name, not just colour
- [ ] Screen reader: notification bell announces unread count
- [ ] Screen reader: confirmation dialog traps focus and announces "This cannot be undone"
- [ ] Screen reader: form errors announced on blur via aria-describedby
- [ ] Screen reader: pagination controls announce "Go to next page", not just arrow icon
- [ ] Focus management: after status transition modal closes, focus returns to trigger button
- [ ] Focus management: after toast notification, focus is not stolen from current element
- [ ] Touch targets: all interactive elements on item detail page are minimum 44x44px at 375px viewport
- [ ] Zoom: all content accessible at 200% zoom without horizontal scrolling (WCAG 1.4.10)

---

## 3. CI Pipeline (GitHub Actions)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: equipment_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/equipment_test
      - run: pnpm --filter api test --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/equipment_test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web test --coverage

  e2e:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: docker compose -f docker-compose.test.yml up -d
      - run: pnpm --filter e2e test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/
```

### Quality gates

PRs cannot merge if:
- Any test fails
- Backend coverage drops below 80% overall or 90% on transition/loan/equipment services
- Frontend coverage drops below 80%
- Lint or type-check fails
- axe-core reports any WCAG 2.2 AA violation

---

## 4. Test Data Patterns

### Factories

Use a test factory pattern to create consistent test data. Each factory produces a valid record with sensible defaults; individual tests override only the fields they care about.

```typescript
// test/factories/equipment.factory.ts
export function buildEquipment(overrides?: Partial<Equipment>): Equipment {
  return {
    id: randomUUID(),
    name: 'Test Magnifier',
    deviceCategory: 'DIGITAL_MAGNIFIER',
    acquisitionType: 'DONATED_GIVEABLE',
    status: 'AVAILABLE_FOR_LOAN',
    condition: 'GOOD',
    acquiredAt: new Date('2024-01-15'),
    isForSale: false,
    isArchived: false,
    ...overrides,
  };
}
```

Factories needed: `buildEquipment`, `buildClient`, `buildLoan`, `buildReservation`, `buildAllocation`, `buildDemoVisit`, `buildUser`, `buildNotification`.

### Seed data for e2e

A dedicated seed script (`prisma/seed-test.ts`) creates a predictable dataset for e2e tests: 2 users (1 Admin, 1 Staff), 10 equipment items (mix of acquisition types and statuses), 3 clients, 2 active loans (1 overdue), 1 active reservation, 1 active demo visit, 1 decommissioned item, 1 archived item.

---

## 5. What Is NOT Tested Automatically

These require human judgement and are covered by the manual accessibility checklist (§2.5) and pre-release review:

- Screen reader experience quality (not just ARIA presence)
- Visual design fidelity against brand assets
- Print layout correctness (QR labels, loan receipt)
- Real mobile device behaviour (touch, viewport, cookie handling)
- PDF content correctness (visual inspection of generated receipts)
- Performance under realistic data volumes (load testing is a v2 candidate)
