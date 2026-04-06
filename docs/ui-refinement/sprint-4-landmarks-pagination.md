# Sprint 4: Landmarks, Navigation & Shared Pagination
## A3-A8, A10, A12, C2

**Date:** 2026-04-05

---

## Scope

Extract shared PaginationControls component. Add WCAG landmarks to dashboard. Fix aria-labels across app.

## Acceptance Criteria

- [x] Shared PaginationControls component created and used on 6 paginated pages
- [x] Pagination buttons have descriptive aria-labels ("Go to previous/next page")
- [x] sr-only "Page X of Y" included
- [x] User menu button has aria-label="User account menu"
- [x] Header shows page title on all breakpoints (removed lg:hidden)
- [x] Dashboard has 3 sr-only section headings (metrics, charts, activity)
- [x] Chart cards use h3 for titles (stock-distribution, utilisation-gauge, category-breakdown)
- [x] Audit log toggle has aria-controls="audit-log-panel"
- [x] Admin loading has role="status" + aria-label + sr-only text
- [x] Donation toggle uses aria-label with donor name context

## Verification Results

**Date:** 2026-04-05
**Status:** PASS — TypeScript check clean, all changes verified at code level

Pages updated with shared PaginationControls:
1. equipment/page.tsx
2. loans/page.tsx
3. clients/page.tsx
4. donations/page.tsx
5. admin/users/page.tsx
6. equipment/[id]/page.tsx (audit log)
