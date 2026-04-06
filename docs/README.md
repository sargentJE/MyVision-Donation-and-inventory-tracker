# Resource Centre Equipment Tracker — Documentation

_Project type: Internal build — MyVision Oxfordshire_
_Started: March 2026_
_Status: Built — Phases 1–10 complete, UI refinement complete, deployment pending_

---

## Summary

A self-hosted internal web application to manage the full lifecycle of equipment in the MyVision resource centre. Equipment spans three acquisition types (purchased, donated-demo, donated-giveable) with distinct operational pathways for loans, allocations, demo visits, and sale.

Replaces informal tracking. Provides: a QR-scannable inventory, loan receipt PDFs, donor acknowledgement records, an in-app notification centre for overdue items, and a full append-only audit trail.

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo (pnpm) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Component Library | shadcn/ui (Radix + Tailwind) |
| Data Fetching | TanStack Query v5 |
| Forms | react-hook-form + zod |
| Backend | NestJS, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Testing | Vitest, Supertest, Playwright, @axe-core/playwright |
| Deployment | Coolify on Hetzner VPS |

---

## Key Design Decisions

- **State model:** acquisition type, operational status, and archive flag are independent fields. An item can be decommissioned and archived simultaneously.
- **ALLOCATED_OUT:** permanent allocations are a separate `Allocation` table — not a flag on the Loan record. Keeps reporting clean.
- **Client PII:** minimal pseudonymous data only — CharityLog ID + first name/last initial. CharityLog is the authoritative CRM. UK GDPR data minimisation.
- **Condition field:** typed enum (GOOD / FAIR / POOR) + optional notes field, not free text.
- **closedReason fields:** typed enums per entity (ReservationCloseReason, LoanCloseReason, DemoVisitCloseReason) — not free strings.
- **Notifications:** in-app only (v1). Nightly cron with deduplication. Polling at 60s intervals.
- **Auth:** JWT + refresh token, both as httpOnly cookies. Refresh tokens stored hashed (SHA-256). Self-service password change via `/settings`; admin-managed password reset also available.
- **Frontend:** shadcn/ui for accessible component primitives, TanStack Query for cache/polling/mutations, react-hook-form + zod for schema-driven form validation.

---

## Documents

### Requirements

| Document | Description |
|---|---|
| [PRD v1.1](PRD.md) | Full product requirements document — final, amendments applied |
| [PRD Amendments](technical/prd-amendments.md) | Resolutions for 6 underspecified areas — all applied to PRD v1.1 (2 April 2026) |

### Technical

| Document | Description |
|---|---|
| [schema.prisma](technical/schema.md) | Complete Prisma schema |
| [Schema Design Decisions](technical/schema-decisions.md) | Prisma schema decision rationale |
| [API Reference](technical/api-reference.md) | Full request/response shapes for all endpoints |
| [seed.ts](technical/seed.md) | Admin bootstrap seed script |
| [State Machine Diagrams](technical/state-machine.md) | Mermaid statecharts for all status transitions + validation matrix |
| [Frontend Architecture](technical/frontend-architecture.md) | Component tree, library patterns, TanStack Query setup, zod schemas |
| [Testing Strategy](technical/testing-strategy.md) | Framework choices, critical path scenarios, CI pipeline, accessibility testing |
| [Local Dev Setup](technical/local-dev-setup.md) | Prerequisites, database, migrations, dev servers, useful commands |
| [Data Migration Plan](technical/data-migration.md) | Source data analysis, cleaning, category mapping, import-ready CSV |
| [Deployment Runbook](technical/deployment-runbook.md) | Coolify on Hetzner: setup, env vars, backup, rollback |
| [Accessibility Guide](ACCESSIBILITY.md) | WCAG 2.2 AA/AAA compliance guide — landmarks, forms, charts, motion, testing |
| [Brand Guide](brand-guide.md) | Colour palette, favicons, logo, badge colours, Tailwind config |
| [UI Refinement Sprints](ui-refinement/) | 6 sprint docs covering brand, accessibility, and polish work |

---

## v1 Scope Summary

**In scope:** equipment CRUD, QR labels, loan lifecycle, reservations, allocations, demo visits, loan receipt PDF, donor acknowledgements, sale stock view (view-only), in-app notifications, bulk CSV import, role-based access (Admin / Staff), audit trail, account settings (self-service profile edit + password change).

**Out of scope (v2):** sale transaction workflow, email notifications, CharityLog integration, condition photos, tagged PDFs.

---

## v2 Roadmap

See Section 13 of the [PRD](PRD.md) for the full v2 roadmap.
---

## Next Steps

- [x] ~~UI refinement pass (6 sprints — brand, accessibility, polish)~~
- [x] ~~Git repository initialised and pushed to GitHub~~
- [ ] Create production docker-compose.yml
- [ ] Coolify setup per deployment runbook
- [ ] Domain DNS configuration
- [ ] First production deploy
- [ ] Transfer CSV data and run import on production
- [ ] Post-deploy checklist (login, change seed password, verify dashboard, UptimeRobot)
- [ ] Review data retention against MyVision DPP

---

## Open Questions → v2

See Section 13 of the PRD for the full v2 roadmap.
