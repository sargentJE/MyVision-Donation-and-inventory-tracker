# Brand Guide
## MyVision Equipment Tracker

_Extracted from myvision.org.uk on 2 April 2026_

---

## Colour Palette

### Primary

| Name | Hex | Usage |
|---|---|---|
| MyVision Yellow | `#fdea18` | Primary brand colour. Headers, highlights, CTAs on dark backgrounds. |
| Navy Blue | `#001172` | Navigation, headings, primary text on light backgrounds. |
| Medium Blue | `#2e4e9d` | Links, secondary headings, interactive elements. |

### Secondary

| Name | Hex | Usage |
|---|---|---|
| Dark Blue-Grey | `#282f5f` | Footer, sidebar, secondary panels. |
| Pink / Magenta | `#f00069` | Accent, CTA buttons, active states. |
| Dark Background | `#0f0e17` | Full-bleed dark sections. |

### Neutrals

| Name | Hex | Usage |
|---|---|---|
| White | `#ffffff` | Page background, card backgrounds, button text on dark. |
| Dark Grey | `#333333` | Body text. |
| Mid Grey | `#5a5a5a` | Secondary text, muted labels. |
| Light Grey | `#dedfe0` | Borders, dividers, disabled states. |

### Tailwind CSS Configuration

```typescript
// tailwind.config.ts — extend theme.colors
colors: {
  myvision: {
    yellow:      '#fdea18',
    navy:        '#001172',
    blue:        '#2e4e9d',
    'dark-blue': '#282f5f',
    pink:        '#f00069',
    dark:        '#0f0e17',
  },
}
```

---

## Typography

The website uses system fonts. For the Equipment Tracker, continue with the Tailwind default font stack (Inter via `font-sans`) unless MyVision specifies a brand typeface.

---

## Logo

| File | Format | Usage |
|---|---|---|
| `assets/SVG/myvision-logo.svg` | SVG | Header, loan receipt PDF (preferred — scalable) |
| `assets/PNG/myvision-logo.png` | PNG | Fallback where SVG not supported |
| `assets/SVG/myvisionIcon-128.svg` | SVG | QR label, compact contexts |
| `assets/PNG/myvisionIcon-128.png` | PNG | Fallback icon |

---

## Favicon

| File | Size | Usage |
|---|---|---|
| `assets/SVG/favicon-32x32.svg` | 32×32 | Browser tab icon |
| `assets/SVG/favicon-192x192.svg` | 192×192 | Android home screen, PWA icon |
| `assets/SVG/favicon-180x180.svg` | 180×180 | Apple touch icon |

PNG versions available in `assets/PNG/` as fallbacks.

### Next.js App Metadata

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Equipment Tracker — MyVision Oxfordshire',
  icons: {
    icon: '/favicon-32x32.svg',
    apple: '/favicon-180x180.svg',
  },
};
```

---

## Status Badge Colours

Map to the colour palette for WCAG 2.2 AA contrast compliance:

| Status | Background | Text | Notes |
|---|---|---|---|
| Available (loan/demo) | `#dcfce7` (green-100) | `#166534` (green-800) | Tailwind green — meets AA on white |
| Reserved / On Demo Visit | `#fef9c3` (yellow-100) | `#854d0e` (yellow-800) | Tailwind yellow — meets AA |
| On Loan | `#dbeafe` (blue-100) | `#1e40af` (blue-800) | Tailwind blue — meets AA |
| Allocated Out | `#f3e8ff` (purple-100) | `#6b21a8` (purple-800) | Tailwind purple — meets AA |
| Decommissioned | `#fee2e2` (red-100) | `#991b1b` (red-800) | Tailwind red — meets AA |

All badges must include a text label alongside colour (WCAG 1.4.1 — Use of Colour).

---

## Loan Receipt PDF Branding

- Header: MyVision logo (`myvision-logo.svg`) left-aligned, "MyVision Oxfordshire" in Navy Blue
- Footer: Charity number, contact details
- Body: system font, Navy Blue headings, Dark Grey body text
