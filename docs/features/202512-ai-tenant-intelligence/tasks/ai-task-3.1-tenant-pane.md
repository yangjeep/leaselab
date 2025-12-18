# Task 3.1: Tenant Detail AI Evaluation Pane

**Estimated Time**: 2-3 hours  
**Dependencies**: Tasks 2.1 – 2.4 (backend APIs complete)  
**Files to Modify**: `apps/ops/app/routes/admin.tenants.$id.tsx`, `apps/ops/app/styles/tailwind.css`, new component `apps/ops/app/components/ai/AiEvaluationPane.tsx`

---

## Objective

Add a slide-in "AI Evaluation" pane to the tenant detail page. The pane centralizes everything a property manager needs to run, monitor, and review evaluations without leaving the record.

---

## UX Requirements

- **Entry Point**: Add a primary button labeled `AI Evaluation` in the tenant header actions of `admin.tenants.$id.tsx`.
- **Pop-in Pattern**: Implement as a right-side slide-over (fixed, max-width 480px) with overlay dimming the background.
- **Sections inside the pane**:
  1. **Header**: Tenant avatar, name, status badge, close button.
  2. **Action Row**: Primary `Run Evaluation` button, secondary `Force Re-Eval` (hidden unless `currentUser.role === 'super_admin'`).
  3. **Status Timeline**: Show `Not Evaluated`, `Queued`, `Completed`, `Duplicate Skipped`, or `Failed` with icons and timestamps. (No dedicated `processing` state—queued covers everything until completion.)
  4. **Evaluation Result**: Score gauge (0-100), label pill (A/B/C), summary text, risk flags pills, fraud signal warnings.
  5. **Activity Log**: Chronological list of previous runs (timestamp, user, label, action).
- **Keyboard + Screen Reader**: Pane should trap focus, close on `Esc`, announce status updates via `aria-live="polite"` region.

---

## Data & Interactions

1. **Initial Load**: When the pane mounts, fetch the latest evaluation and activity using existing `GET /api/ops/leads/:leadId/ai-evaluation` and `GET /api/ops/leads/:leadId/ai-evaluation/activity` (implement fetcher if not already available).
2. **Create Job**: Clicking `Run Evaluation` submits a `fetcher.submit` to `POST /api/ops/leads/:leadId/ai-evaluation`.
   - Disable the button + show spinner while pending.
   - If API returns `DuplicateDocuments`, show inline warning with `last_evaluated_at` and expose `Force Re-Eval` button for super admins.
3. **Polling**: After job creation, start polling `GET /api/ops/ai-evaluation-jobs/:jobId` every 2 seconds until `completed` or `failed`. Treat everything between creation and completion as `Queued` in the UI since processing happens asynchronously behind the scenes.
   - Use `useInterval` (add helper) or `setInterval` inside `useEffect` and clear on unmount/completion.
   - Push toast notifications on completion/failure.
4. **Timeline Updates**: Map job statuses to timeline entries:
   - Pending → "Documents queued"
   - Completed → "AI score available"
   - DuplicateDocuments → "Documents unchanged — evaluation skipped"
5. **Force Re-Eval**: Super admin button sends `POST /api/ops/leads/:leadId/ai-evaluation` with `{ force_re_evaluation: true }` plus `reason` captured via modal input.

---

## Component Structure

```
components/ai/
├── AiEvaluationPane.tsx        # Slide-over shell + layout
├── AiEvaluationStatus.tsx      # Timeline subcomponent
├── AiEvaluationResult.tsx      # Score gauge + summary
└── AiEvaluationActivity.tsx    # Past evaluations list
```

Implementation guidance:

```tsx
// Example entry point inside admin.tenants.$id.tsx
const [isPaneOpen, setPaneOpen] = useState(false);
const evaluationFetcher = useFetcher<typeof action>();

<Button onClick={() => setPaneOpen(true)}>AI Evaluation</Button>
<AiEvaluationPane
  open={isPaneOpen}
  onClose={() => setPaneOpen(false)}
  tenant={data.tenant}
  currentEvaluation={evaluationFetcher.data?.evaluation ?? data.latestEvaluation}
  onRunEvaluation={(force, reason) => {
    const formData = new FormData();
    formData.set('force_re_evaluation', String(force));
    if (reason) formData.set('reason', reason);
    evaluationFetcher.submit(formData, {
      method: 'post',
      action: `/api/ops/leads/${data.leadId}/ai-evaluation`
    });
  }}
/>
```

- Use Tailwind for spacing/typography.
- For the score gauge, leverage `radial-gradient` or a simple SVG arc; keep it accessible by showing the numeric score and label text.

---

## Edge Cases

- **No documents**: Display CTA linking to document upload (existing route `admin.leads.$id.files`).
- **Quota exceeded**: Show message returned from API plus a link to upgrade (point to billing page or `mailto:sales@leaselab.app`).
- **Network errors**: Inline alert with retry button.
- **Duplicate guard triggered**: Replace action row with message + "Force Re-Eval" button (if allowed) or "Upload New Docs" CTA (if not).

---

## Verification

1. Load `http://localhost:3000/admin/tenants/{tenantId}` and open the pane.
2. Trigger a new evaluation and observe:
   - Pane stays open, timeline updates.
   - Status transitions animate smoothly.
3. Force duplicate condition by re-running immediately; verify warning message.
4. As non-super-admin account, ensure `Force Re-Eval` button is hidden and duplicate warning instructs to contact super admin.
5. Confirm focus trap + `Esc` closing works and overlay removal re-enables page scroll.

---

## Deliverables

- Slide-over pane that matches UX requirements and wires up job creation + polling.
- Accessible, responsive UI validated on 1280px+ desktop (pane width 360-480px).
- Storybook entry optional but recommended if existing UI library uses it.
