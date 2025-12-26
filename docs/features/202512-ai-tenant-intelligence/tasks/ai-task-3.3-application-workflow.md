# Task 3.3: Application Workflow Restructure

**Estimated Time**: 4-5 hours (can be split per subtask)  
**Dependencies**: Task 3.1 (AI pane), Task 3.2 (Quota & Settings), backend Tasks 2.1-2.4  
**Files to Modify / Add**:
- `apps/ops/app/routes/admin.applications._index.tsx` (new landing panel)  
- `apps/ops/app/routes/admin.properties.$propertyId.applications._index.tsx` (property-specific list)  
- `apps/ops/app/routes/admin.properties.$propertyId.applications.$applicationId.tsx` (application detail page referenced by Task 3.1)  
- Shared UI: `apps/ops/app/components/ai/ApplicationCards.tsx`, `apps/ops/app/components/ai/ApplicationScoreBadge.tsx`

---

## Objective

Reframe the entire screening flow around properties and their active vacancies:

1. **Application Panel**: Start with open-to-rent units/properties.  
2. **Property-Application Page**: Dedicated view per property, showing all applications ranked by AI score.  
3. **Application Detail**: Inline detail page where docs, history, and the AI slide-in pane live.

---

## Step 1 – Application Panel (Global)

Create `admin/applications` route that works like a mission control board:

- **Data**: Query properties with `status='listed'` or units marked `available = true`. Include counts of pending applications.
- **UI**: Grid of cards (property name, unit count, location, `pending_applications` badge, `next_showing` date).  Clicking a card navigates to `/admin/properties/{id}/applications`.
- **Filters**: Search by property name/city, toggle between `All / High Volume (10+ apps) / Needs Review (applications missing AI score)`.  Store filter in URL params.
- **Row-level actions**: `New Application` button (link to guest intake) and `Go to Property` link.

Implementation hints:

```tsx
export async function loader({ context, request }: LoaderFunctionArgs) {
  const properties = await context.api.getOpenProperties();
  return json({ properties });
}

return (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {properties.map((property) => (
      <ApplicationBoardCard key={property.id} property={property} />
    ))}
  </div>
);
```

---

## Step 2 – Property Application Page

Route: `/admin/properties/:propertyId/applications`

- **Layout**: Two columns – left sidebar lists units + filters, right column lists applications.
- **Applications List**:
  - Fetch `applications` (lead records) joined with latest `ai_score` + `ai_label` (if present).
  - Default sort: `ai_score DESC NULLS LAST` then `created_at ASC`.
  - Show chips for `status` (new, docs received, ai evaluated), `ai_label`, and `monthly_income` summary.
  - Add `Run AI` badge for ones lacking AI results; clicking opens detail page anchored to slide-in panel.
- **Filters**: Stage (New/Docs Received/AI Evaluated), Minimum AI Score slider, Document completeness.
- **Pagination**: Infinite scroll or `Load More` button for >25 apps.
- **Actions**: Each row has `View Details` (navigates to detail page), `Run AI` (calls Task 3.1 flow), and `Mark as Contacted`.

Wire route loader to fetch property metadata + list of applications:

```tsx
export async function loader({ params, context }: LoaderArgs) {
  const property = await context.api.getProperty(params.propertyId);
  const applications = await context.api.getPropertyApplications(params.propertyId, request.url);
  return json({ property, applications });
}
```

---

## Step 3 – Application Detail Page

Route: `/admin/properties/:propertyId/applications/:applicationId`

- **Header**: Applicant info, contact buttons, current stage, AI label (if exists).
- **Tabs**: `Overview`, `Documents`, `Activity`, `AI Notes`.
- **Slide-in Pane**: Triggered by `AI Evaluation` button as defined in Task 3.1 (same component reused here).
- **File Viewer**: Inline gallery referencing R2 docs; include `Open in new tab` and `Mark Verified` actions.
- **Actions**: Approve, Reject, Request Docs, Send Email – positioned in sticky action bar.

Ensure route shares data with property list so the app detail has context (property name, rent, meta). Use Remix nested routes so returning to property list preserves sort/filter state.

---

## Navigation Flow Summary

1. User opens **Applications** panel → sees cards for open properties.  
2. Select a property → lands on property-specific list with ranked applications.  
3. Click an application → detail view with AI pane + doc viewer.  
4. Run AI, review notes, take action without leaving the page.

---

## Edge Cases

- Properties with 0 applications: Show empty state + CTA to share application link.
- Properties with AI disabled: Display warning banner + link to Settings tab (Task 3.2) before allowing evaluation.
- Application without documents: detail page should highlight missing uploads with quick links.
- Mobile: degrade grid and lists to single-column, keep slide-in pane full-screen modal.

---

## Verification

1. Visit `/admin/applications` – confirm cards show only currently rentable properties and counts are accurate.
2. Click a property → verify applications list sorted by score (highest first) and filters functional.
3. Open an application → ensure detail view shows docs/rich info and AI pane works (per Task 3.1).
4. Use browser back button to ensure navigation returns to the previous filtered/sorted list.
5. Validate role permissions: standard admins can view/operate; viewer roles receive read-only notices.

---

## Deliverables

- Application board route with open-to-rent properties.
- Property-specific application list with score-based ranking + filters.
- Application detail route integrated with AI pane + actions.
- Updated navigation (side menu links to Applications board) and breadcrumbs reflecting new flow.
