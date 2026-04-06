# Accessibility Guide
## MyVision Equipment Tracker

_This app is built for a charity serving blind and visually impaired people. Accessibility is mission-critical._

**Standard:** WCAG 2.2 Level AA required, reaching into Level AAA where practical.

---

## 1. Landmarks & Skip Navigation

Every page must have:
- A **skip-to-content link** as the first focusable element (hidden until focused)
- Correct landmark hierarchy: `<header>`, `<nav aria-label="...">`, `<main id="main-content">`, `<aside>` if applicable

```tsx
// First child in layout:
<a href="#main-content" className="sr-only focus:not-sr-only ...">
  Skip to main content
</a>

// Main content area:
<main id="main-content" className="...">
```

**WCAG 2.4.1 (AA)** — Bypass blocks. **Mistake to avoid:** Forgetting `id="main-content"` on `<main>`.

---

## 2. Navigation

- Every `<nav>` must have a unique `aria-label` (e.g. "Main navigation", "Mobile navigation")
- Active navigation links must have `aria-current="page"`
- Icon-only buttons (e.g. "More" overflow) must have `aria-label`

```tsx
<nav aria-label="Main navigation">
  <Link href="/equipment" aria-current={isActive ? "page" : undefined}>
    Inventory
  </Link>
</nav>
```

**WCAG 1.3.1 (AA), 2.4.8 (AAA)** — **Mistake to avoid:** Two `<nav>` elements without distinguishing `aria-label`.

---

## 3. Forms & Validation

- Every input MUST have a `<Label>` — visible or `className="sr-only"`
- Form validation triggers **on blur**, not on submit
- Error messages linked via `aria-describedby`
- Required fields marked with `*` in the label
- `autoComplete` attributes on login/password fields

```tsx
<Label htmlFor="search" className="sr-only">Search equipment</Label>
<Input id="search" type="search" placeholder="Search..." />

// With error:
<Input id="email" aria-describedby="email-error" />
<p id="email-error" className="text-destructive text-sm">Invalid email</p>
```

**WCAG 1.3.1 (AA), 3.3.2 (AA)** — **Mistake to avoid:** Using `placeholder` as the only label.

---

## 4. Data Tables

- Every `<Table>` must have `aria-label` describing its purpose
- Sortable columns need `aria-sort="ascending|descending|none"`
- Pagination needs descriptive labels ("Go to next page"), not icon-only

```tsx
<Table aria-label="Equipment inventory">
  <TableHeader>
    <TableRow>
      <TableHead aria-sort="descending">Date Added</TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

**WCAG 1.3.1 (AA), 2.4.6 (AAA)** — **Mistake to avoid:** Icon-only pagination buttons without `aria-label`.

---

## 5. Charts & Visualisation

- Decorative/informational charts: `role="img"` + `aria-label` with full data as text
- Interactive progress indicators: `role="progressbar"` + `aria-valuenow/min/max`
- Colour must NEVER be the sole indicator — always include text labels

```tsx
// Stacked distribution bar:
<div role="img" aria-label="Stock distribution: 10 Available, 5 On Loan, 2 Decommissioned">

// Progress gauge:
<div role="progressbar" aria-valuenow={42} aria-valuemin={0} aria-valuemax={100}
     aria-label="Loanable stock utilisation: 42%">
```

**WCAG 1.1.1 (AA), 1.4.1 (AA)** — **Mistake to avoid:** Chart with no text alternative.

---

## 6. Dialogs & Collapsible Sections

- Destructive/irreversible actions: use AlertDialog with "This cannot be undone"
- Collapsible sections (audit log): button must have `aria-expanded`
- Radix Dialog handles focus trap automatically

```tsx
<button
  aria-expanded={isOpen}
  onClick={() => setIsOpen(!isOpen)}
>
  Audit Log
</button>
```

**WCAG 4.1.2 (AA)** — **Mistake to avoid:** Collapsible section without `aria-expanded`.

---

## 7. Dynamic Content

- Loading spinners: `role="status"` + `aria-label="Loading"` + `<span className="sr-only">Loading...</span>`
- Content that appears conditionally (e.g. form fields based on acquisition type): wrap in `<div aria-live="polite">`
- Toast notifications: Radix Toast handles `role="status"` internally

```tsx
<div role="status" aria-label="Loading">
  <Spinner />
  <span className="sr-only">Loading...</span>
</div>

<div aria-live="polite">
  {acquisitionType === 'PURCHASED' && <PurchaseFields />}
</div>
```

**WCAG 4.1.3 (AAA)** — **Mistake to avoid:** Dynamic content with no live region announcement.

---

## 8. Colour & Contrast

- **AA minimum:** 4.5:1 for body text, 3:1 for large text (18pt+)
- **AAA target:** 7:1 for body text
- All status badges must include text labels alongside colour
- Notification badge must include numeric count, not colour alone

**MyVision brand colours (from PRD):**
- Yellow: `#fdea18`, Navy: `#001172`, Blue: `#2e4e9d`, Pink: `#f00069`

**Mistake to avoid:** Red text (#ef4444) on white background (3.5:1 — fails AA). Use darker red or larger text.

---

## 9. Motion & Animation

All animations must respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**WCAG 2.3.3 (AAA)** — **Mistake to avoid:** CSS animations without reduced-motion override.

---

## 10. Touch Targets

Minimum 44x44px on mobile for all interactive elements. Use Tailwind: `min-w-[44px] min-h-[44px]`.

**WCAG 2.5.5 (AAA)** — Already applied on bottom navigation links.

---

## 11. Restricted Actions

Per PRD: restricted actions are **hidden, not disabled**. This reduces clutter for screen reader users who would otherwise encounter disabled buttons with no explanation.

---

## 12. Testing Checklist

Before any release:

- [ ] **Keyboard:** Tab through entire app without mouse — all elements reachable, logical order
- [ ] **Skip link:** Press Tab on page load — skip link appears, Enter moves focus to main content
- [ ] **Screen reader:** VoiceOver (Mac) or NVDA (Windows):
  - Page title announced on navigation
  - Form fields have labels
  - Active nav link announced as "current page"
  - Chart data available via aria-label
  - Dialog focus trapped, Escape closes
- [ ] **Contrast:** Run axe DevTools or WebAIM checker — no AA failures
- [ ] **Reduced motion:** Enable in OS preferences — no animations play
- [ ] **Mobile:** Touch targets >= 44px, content readable at 375px width
- [ ] **Zoom:** Content usable at 200% browser zoom without horizontal scrolling
