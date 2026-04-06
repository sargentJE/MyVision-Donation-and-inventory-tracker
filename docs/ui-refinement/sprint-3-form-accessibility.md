# Sprint 3: Form Accessibility (react-hook-form migration)
## A1 + A2 + A11 + P4

**Date:** 2026-04-05

---

## Scope

Migrate all dialog forms from native FormData to react-hook-form + zod pattern. This gives automatic `aria-describedby`, `aria-invalid`, inline error display via FormMessage, and required field indicators — matching the established convention from login and equipment intake pages.

## Intended Outcome

Every form in the app uses react-hook-form + zod. Screen readers can navigate form errors via programmatic field-to-error associations. Required fields are visually marked. Raw `<select>` elements replaced with shadcn Select. All forms follow the same pattern.

## Files Modified

| File | Change |
|------|--------|
| `components/equipment/dialogs/equipment-dialogs.tsx` | Migrate 8 dialogs to RHF + zod, replace raw selects |
| `components/equipment/loan-card.tsx` | Migrate return/convert dialog forms |
| `components/equipment/demo-visit-card.tsx` | Migrate return dialog form |
| `components/equipment/reservation-card.tsx` | Migrate cancel/convert dialog forms |
| `app/(authenticated)/settings/page.tsx` | Migrate password form to RHF + zod, add aria-describedby |
| `components/clients/client-typeahead.tsx` | Add sr-only Label for search input |
| `app/(authenticated)/admin/users/page.tsx` | Replace raw selects with shadcn Select |

## Acceptance Criteria

- [x] All dialog forms use react-hook-form + zod (equipment-dialogs 8 dialogs, loan-card, demo-visit-card)
- [x] Every form field has automatic aria-describedby (via FormControl)
- [x] Required fields show visual indicator (* in FormLabel)
- [x] Inline error messages via FormMessage (verified: "Name is required" on empty submit)
- [x] All raw selects replaced with shadcn Select (condition, acquisition type, condition-at-loan/return)
- [x] Form state resets on dialog close
- [x] Settings password error linked to inputs via aria-describedby="password-error"
- [x] Client typeahead input has sr-only Label
- [x] API errors still surface via toast

## Verification Results

**Date:** 2026-04-05
**Status:** PASS — all criteria met

1. Edit dialog: Name field shows "Name *" label, "Name is required" error on empty submit, shadcn Select for Condition
2. All 8 equipment dialogs migrated to react-hook-form + zod with FormField/FormControl/FormMessage
3. Loan-card return dialog: shadcn Select for condition, FormMessage ready
4. Demo-visit-card return dialog: shadcn Select for condition, FormMessage ready
5. Settings: password error has id="password-error", inputs have aria-describedby
6. Client typeahead: sr-only Label added with htmlFor="client-search"
7. TypeScript type check passes cleanly
