# Sprint 1: Brand Foundation
## B1 + B2 + P1

**Date:** 2026-04-04

---

## Scope

Remap CSS custom properties to MyVision brand palette and brand the login page with logo + card styling.

## Intended Outcome

Every page in the app immediately looks like a MyVision product. Buttons, inputs, focus rings, dropdown highlights, and link colours all use the MyVision palette. The login page — every user's first impression — shows the charity logo and has a polished, branded card layout.

## Files Modified

| File | Change |
|------|--------|
| `apps/web/styles/globals.css` | Remap `:root` CSS variables to MyVision brand HSL values |
| `apps/web/app/(public)/login/page.tsx` | Add logo, wrap form in branded card |
| `apps/web/app/(public)/layout.tsx` | Add muted background to lift card |

## CSS Variable Mapping

| Variable | Before (generic) | After (MyVision) | Colour |
|----------|------------------|-------------------|--------|
| `--primary` | `222.2 47.4% 11.2%` | `228.9 100% 22.4%` | Navy #001172 |
| `--primary-foreground` | `210 40% 98%` | `0 0% 100%` | White |
| `--accent` | `210 40% 96.1%` | `55.1 98.7% 54.3%` | Yellow #fdea18 |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `228.9 100% 22.4%` | Navy |
| `--ring` | `222.2 84% 4.9%` | `222.7 54.7% 39.8%` | Blue #2e4e9d |

## Acceptance Criteria

- [x] All shadcn buttons render in MyVision Navy
- [x] Focus rings are MyVision Blue
- [x] Login page displays MyVision logo (myvision-logo.svg)
- [x] Login form has branded card styling with navy accent
- [x] No colour contrast regressions on any page
- [x] Yellow accent visible on dropdown hover states

## Browser Verification Plan

1. `/login` — desktop + mobile screenshot
2. `/` (dashboard) — verify button/card colours
3. `/equipment` — verify "Add Equipment" button
4. `/settings` — verify focus rings on input fields
5. Dropdown menu — verify yellow hover highlight
6. Spot-check remaining pages

## Verification Results

**Date:** 2026-04-05  
**Status:** PASS — all criteria met

1. `/login` — Logo displayed, branded card with navy top border, muted background. "Sign in" button is MyVision Navy.
2. `/` (dashboard) — Metric cards, chart bars, and links all navy. Activity feed links navy.
3. `/equipment` — "Add Equipment" button is navy with white text. Equipment name links navy.
4. `/settings` — "Save Changes" button navy. Focus ring on inputs is MyVision Blue.
5. User menu dropdown — Yellow (#fdea18) hover highlight on "Settings" item with navy text. Distinctive and branded.
6. `/reports` — Report card layout clean, "Download CSV" outline buttons correct. No regressions.
7. Contrast verified: Navy (#001172) on white = 15.4:1 (exceeds AAA).
