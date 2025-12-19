# Task 3.2: Quota & Settings Section (AI Pane)

**Estimated Time**: 2 hours  
**Dependencies**: Task 3.1 (AI pane shell), Task 2.5 (Quota API) / Task 2.1-2.2 for usage endpoints  
**Files to Modify**: `apps/ops/app/components/ai/AiEvaluationPane.tsx`, new hook `apps/ops/app/lib/useAiUsage.ts`, API route `apps/ops/app/routes/api.ai-settings.tsx`

---

## Objective

Augment the AI Evaluation pane with two auxiliary tabs:

1. **Quota** – Surface per-site usage, limits, and reset schedule.  
2. **Settings** – Allow admins/super admins to manage AI-related flags (enablement, auto-run, notification preferences).

Both live inside the same pop-in (tabs or accordions) so property managers never leave the tenant screen.

---

## Quota Panel Requirements

- **Data Source**: Call existing `GET /api/ops/sites/:siteId/ai-usage` (month defaults to current).
- **Display**:
  - Circular or horizontal progress bar showing `% usage`.
  - Text summary: `12 / 20 evaluations used (Dec 2025)`.
  - `Reset on` date (1st of next month, convert to site timezone).
  - Table of latest evaluations (lead name, score, timestamp).
- **Warnings**:
  - At ≥80% usage, show orange `Upgrade to Pro` alert linking to billing page.
  - When `remaining === 0`, disable Run button (Task 3.1) and show red alert.
- **Refresh**: Poll usage endpoint every 30 seconds while pane open OR use `useFetcher`'s revalidation after new evaluation completes.

Implementation snippet:

```tsx
const { usage, refresh } = useAiUsage({ siteId: data.siteId });

<QuotaCard>
  <Progress value={usage.percentage} />
  <p>{usage.evaluation_count} / {usage.quota_limit} evaluations</p>
  <button onClick={refresh} className="text-sm text-primary">Refresh</button>
</QuotaCard>
```

Create `useAiUsage` hook to encapsulate fetching + derived values.

---

## Settings Panel Requirements

- **Audience**:
  - Standard admins: View-only except for personal notification toggle.
  - Super admins: Full control (enable/disable, auto-run, Force Re-Eval default reason, SLA notifications).
- **Fields** (persisted per-site):
  1. `ai_enabled` (boolean) – stored on `sites` table.
  2. `auto_run_on_documents` (boolean) – new column or JSON config.
  3. `notify_on_completion` (boolean) – user preference, store under `user_settings.ai_notifications`.
  4. `default_force_re_eval_reason` (string, optional) – used to pre-fill Task 3.1 modal.
- **API Endpoints**:
  - `GET /api/ops/ai-settings` (site scoped) – returns combined site + user settings.
  - `POST /api/ops/ai-settings` – accepts JSON body `{ ai_enabled, auto_run_on_documents, notify_on_completion, default_force_re_eval_reason }`.
  - Implement Remix route file `apps/ops/app/routes/api.ai-settings.tsx` that reads/writes to D1 via worker API (call through existing `/api/ops/...` backend to avoid duplicating logic).
- **Form Behavior**:
  - Use `useFetcher` to submit form without closing the pane.
  - Disable toggles when pending; show inline success/error states.
  - When `ai_enabled` toggled off, show confirmation modal describing impact (no jobs can be created).

---

## UI Structure

- Tabs layout (`Evaluation | Quota | Settings`). On mobile, degrade to accordion.
- Quota content uses cards + progress bars.
- Settings uses grouped toggles + text field for default reason.
- Add inline description text referencing documentation (link to README section or PRD).

Example markup:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Trigger value="evaluation">Evaluation</Tabs.Trigger>
    <Tabs.Trigger value="quota">Quota</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="quota">
    <QuotaSummary usage={usage} />
  </Tabs.Content>
  <Tabs.Content value="settings">
    <SettingsForm
      settings={settingsFetcher.data}
      canEdit={currentUser.role === 'super_admin'}
    />
  </Tabs.Content>
</Tabs>
```

---

## Edge Cases

- Site not enrolled in AI → hide Evaluation tab entirely and replace with CTA.
- API failure fetching quota/settings → show retry state with `Retry` button.
- When `auto_run_on_documents` enabled, show info banner in Evaluation tab explaining that jobs will auto-queue.
- `notify_on_completion` affects toasts? For now, only store preference; actual notification wiring handled later.

---

## Verification

1. Load tenant page, open pane, confirm Quota tab shows data returned by API (mock with seed data if necessary).
2. Exhaust quota from DB and ensure UI disables Run button automatically.
3. Toggle settings as super admin; verify data persists by refreshing page.
4. Log in as standard admin and confirm fields become read-only except personal notification toggle.
5. Confirm network activity: settings POST uses JSON payload and returns updated object.

---

## Deliverables

- Quota tab with live usage + upgrade CTA and warning states.
- Settings tab with functional form + authorization checks.
- Shared hooks/utilities for fetching usage/settings that can be unit tested.
