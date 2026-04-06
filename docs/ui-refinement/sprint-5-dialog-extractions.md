# Sprint 5: Dialog Extractions
## D1 + D2 + A9

**Date:** 2026-04-05

---

## Scope

Extract password change form and client creation form into dialogs. Convert client anonymise to AlertDialog.

## Acceptance Criteria

- [x] Settings page shows single profile card + "Change Password" button
- [x] ChangePasswordDialog validates with zod, displays field-level errors
- [x] Dialog resets on close (form.reset() in handleClose)
- [x] Client typeahead "Create new client" opens CreateClientDialog (inline form removed)
- [x] New client auto-selected after creation (onCreated callback)
- [x] Client anonymise uses AlertDialog (role="alertdialog")
- [x] TypeScript check passes

## Verification Results

**Date:** 2026-04-05
**Status:** PASS — all criteria met

1. Settings page: Single profile card with "Change Password" (outline) and "Save Changes" (primary) buttons — clean, focused layout
2. ChangePasswordDialog: 3 fields with `*` indicators, zod validation showing "Current password is required", "Password must be at least 8 characters", "Please confirm your new password" — all inline via FormMessage
3. Client typeahead: Inline form replaced with CreateClientDialog trigger
4. AlertDialog installed via shadcn CLI, anonymise dialog converted
5. TypeScript type check clean — zero errors
