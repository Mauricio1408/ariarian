# AriArian — Asset Lifecycle Management

Interactive, high-fidelity prototype of **AriArian**, asset lifecycle management for DOST and
partner agencies: registry, custodianship, maintenance triage, and COA-compliant property forms.

Built from the **Version 2** page of the Figma file
[`rvlu1upwT2GPqYT3ZKlP3k`](https://www.figma.com/design/rvlu1upwT2GPqYT3ZKlP3k/AriArian---Asset-Lifecycle-Management-System?node-id=4592-2)
— every desktop screen, state and document on that page, wired as working software rather than linked frames.

Next.js 16 (App Router) · React 19 · Tailwind v4 · Motion · deployed on Vercel.

**Live:** https://ariarian.vercel.app — sign in with any password as `m.bergancia@dost.gov.ph` (admin) or `juandelacruz@dost.gov.ph` (custodian).

---

## What works

| Area | Figma | In the prototype |
|---|---|---|
| Dashboard | `4592:10649` | Live KPIs, four analytic cards; each card **morphs into its drill-down** (shared-layout animation) |
| Drill-downs | `4677:5946` `4677:6299` `4677:6648` `4677:7197` | Agency split, health donut, attention monitor, warranty chart + filterable breakdown table |
| Asset Registry | `4592:11427` | Search, sort, filter chips, paging, loading skeleton, empty and no-results states, bulk selection |
| Asset Details | `4667:5675` | Drawer with Overview / Service / Value / Documents tabs, generated QR + barcode label |
| Transfer Asset | `4667:6703` | Custodian swap animation, searchable staff picker, writes audit + notification |
| Employees | `4666:2315` + tabs | Active / On Leave / Clearance / All, KPI cards, bulk bar, employee drawer |
| Maintenance | `4652:1080` `4666:3641` | List ↔ Board toggle, **drag cards between stages**, new / edit / cancel work orders with undo |
| Resolve Issue | `4656:1483` `4657:1899` | Move to Storage / Return to Service; the first Canon iR 2630 confirm hits the **save-conflict** state |
| Audit Log | `4666:3563` | Every action you take in the demo lands here, highlighted as *Just now* |
| Financial Reports | `4666:3602` | Category / department / date filters recompute every figure; animated line chart |
| Notifications, Settings | `4666:33123` `4666:33787…` | Filterable panel, mark-as-read; settings tabs with save states |
| Sign in | `4571:30959` `4571:30785` | Log In, Request Access, Forgot Password / Reset Link Sent / Request Sent modals |
| Asset modals | Asset Modal Overlays, `4229:14732` | Figma Add / Edit / View Asset, Delete → Successfully Deleted |
| Popups | `1601:5423` `1601:5422` `1601:5761` `1964:9875` `1903:13802` | Sort, filter, export (Excel/CSV/PDF), department, calendar |
| Permission denied | `4593:966` | Switch to the custodian role — Financial Reports and Export are restricted |
| PAR / ICS | `4594:1024` `4596:1014` | Generated from live custody data; ₱50,000 threshold splits PAR and ICS; printable |

**Prototype controls** live behind the profile card (bottom-left): switch role, preview the empty
registry, reset demo data. State persists in `localStorage`.

## Numbers are computed, not typed

The seed (`lib/seed.ts`) writes the rows visible in Figma by hand and generates the rest of the
72 assets and 48 staff under the constraints the design's headline figures imply. Every KPI is
then derived in `lib/selectors.ts`, so the first paint reproduces the design — ₱14,948,500 portfolio,
22 open work orders, 36 critical, 62/10 warranty split, Juan Dela Cruz accountable for ₱489,045,
₱742,300 repair spend YTD — and every action moves those numbers consistently across screens.

## Motion

One curve for everything — `cubic-bezier(0.32, 0.72, 0, 1)` — with the vault's durations:
120ms hover · 200ms state · 240ms page · 260ms overlay. Every overlay closes on `Escape`.
`prefers-reduced-motion` is respected.

## Run

```bash
npm install
npm run dev
```

`supabase/` holds the v1 reference schema; the prototype runs entirely client-side.
