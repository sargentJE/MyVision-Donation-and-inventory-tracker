# Sprint 2: Sidebar & Navigation Identity
## B3 + B4 + C3

**Date:** 2026-04-05

---

## Scope

Dark sidebar using MyVision Dark Blue-Grey (#282f5f), yellow accent on active navigation, matching mobile bottom nav.

## Intended Outcome

The sidebar transforms from a generic white panel to a distinctive dark MyVision-branded navigation. Active links use a yellow left-border accent. The bottom nav on mobile matches the sidebar identity. The app now has an unmistakable visual identity that aligns with myvision.org.uk.

## Files Modified

| File | Change |
|------|--------|
| `apps/web/components/layout/sidebar.tsx` | Dark background, white text, yellow active indicator |
| `apps/web/components/layout/bottom-nav.tsx` | Dark background, yellow active state |

## Acceptance Criteria

- [x] Sidebar background is MyVision Dark Blue-Grey (#282f5f)
- [x] Nav text is white/semi-transparent, readable
- [x] Active link has yellow left-border + lighter background
- [x] Logo legible on dark background (using brightness-0 invert CSS filter)
- [x] Bottom nav matches sidebar identity on mobile
- [x] Focus indicators visible on dark backgrounds (ring-white/50)
- [x] Yellow accent on active nav items

## Verification Results

**Date:** 2026-04-05
**Status:** PASS — all criteria met

1. Desktop sidebar — Dark blue-grey background, white inverted logo legible, yellow border on active link clearly visible
2. Active state changes correctly between Dashboard, Inventory, Loans etc.
3. Mobile (375px) bottom nav — dark background matches sidebar, active "Dashboard" in yellow, inactive items in white/70
4. Contrast: white on #282f5f = 10.3:1 (exceeds AAA)
