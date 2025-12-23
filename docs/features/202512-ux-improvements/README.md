# UX Improvements (Ops)

**Status**: Draft → In Progress  
**Last Updated**: 2025-12-20

## Goals

- Reduce friction for daily ops review (applications, work orders, tenants, vacancies).
- Make AI evaluation actions clearer and more trustworthy (what gets submitted, quota visibility).
- Simplify property application review (less chrome, more “table-like” scanning).

## User Stories

### 1) Level-1 “General Inquiries” panel

- As an ops user, I can open **General Inquiries** from the main left nav, so I can process non-property-specific inquiries without digging through Applications.
- As an ops user, I can see “pending vs resolved” counts, so I can prioritize follow-ups.

**Acceptance**
- A dedicated nav item exists for `General Inquiries`.
- The page loads inquiries (propertyId = `general`) and supports basic dismissal/resolution workflow.

---

### 2) Dashboard cards are clickable

- As an ops user, I can click each dashboard stat card to navigate to the relevant panel (Applications, Properties, Work Orders, Tenants), so I can drill in with one click.

**Acceptance**
- Each dashboard stat card behaves like a link and has hover/focus styling.

---

### 3) AI settings live under Settings (tab), not the AI slide-over

- As an ops admin, I can find **AI** settings under **Settings → AI**, so I don’t need to open an application to configure site-level AI behavior.

**Acceptance**
- Settings has an `AI` tab under `/admin/settings/ai`.
- The AI slide-over does not contain a Settings tab.

---

### 4) AI Evaluation and Quota are combined (no secondary tab)

- As an ops user, I can see quota/usage context directly within the AI Evaluation panel, so I understand availability while running an evaluation.

**Acceptance**
- The AI slide-over does not require switching to a “Quota” tab to see usage.

---

### 5) “Run AI evaluation” is visually obvious

- As an ops user, the primary action to run AI evaluation stands out, so it’s clear what to do next.

**Acceptance**
- “Run AI Evaluation” is styled as the primary CTA (distinct color, full-width, clear disabled state).

---

### 6) AI Evaluation shows the materials that will be submitted

- As an ops user, before I run AI evaluation, I can see which documents/materials will be used, so I can confirm completeness and avoid wasted runs.

**Acceptance**
- The AI panel lists documents/materials intended for submission (filename/type/date if available).
- If no documents are present, the UI communicates what the AI will evaluate with.

---

### 7) Property → Applications: remove filter sidebar; add “table-ish” filters and a Shortlist view

- As an ops user, I can filter/sort applications inline (without a side panel), so I can scan a list in a compact, table-like layout.
- As an ops user, I can switch to a **Shortlist** view, so I can focus on the best candidates quickly.

**Acceptance**
- Property application list uses a top toolbar for filters/sort (no left sidebar).
- A `Shortlist` tab exists that reduces the list to high-priority candidates (definition to be tuned).

---

### 8) Dashboard highlights “outstanding” priority work (not only applications)

- As an ops user, I can see an “Outstanding” section that highlights urgent work orders, upcoming move-ins/outs, and vacancies, so I start my day with prioritized work.

**Acceptance**
- Dashboard shows at least: urgent work orders, upcoming move-ins/outs (or “moving_in/moving_out” tenants), and vacancy counts/links.
- Each item links to the appropriate detail or list view.

## Open Questions / Follow-ups

- What qualifies as **Shortlist** (score threshold, labels, stages, document completeness)?
- Should “General Inquiries” support assignment/notes, or just dismiss/resolve for now?
- Should “Outstanding” be configurable per team (e.g., SLA windows, thresholds)?

