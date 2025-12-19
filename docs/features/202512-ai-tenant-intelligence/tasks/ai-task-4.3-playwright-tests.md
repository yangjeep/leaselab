# Task 4.3: Playwright E2E Tests (MCP Plugin)

**Estimated Time**: 2-3 hours  
**Dependencies**: UI flows from Tasks 3.1–3.3, backend APIs ready, Task 4.1 manual testing complete  
**Goal**: Automate the happy-path and guard-rail flows using Playwright and the Playwright MCP plugin so we can re-run regression tests locally and in CI.

---

## Overview

We need scripted coverage for:
1. **Applications Board → Property List → Application Detail** navigation.  
2. **AI Pane** submission with stubbed responses (fast path).  
3. **Quota Exceeded + Duplicate Guard** states.  
4. Smoke test for real AI run (flagged to skip in CI, triggered manually).

Use the Playwright MCP plugin (already configured in the repo) to record interactions, run tests locally, and hook into CI.

---

## Setup

1. **Install/Verify Playwright**
   ```bash
   cd apps/ops
   npx playwright install --with-deps
   ```
2. **Enable MCP Plugin**
   - Ensure `.config/playwright/mcp.json` includes the `playwright` provider.  
   - Start MCP server: `npm run mcp:playwright` (see repo docs if command differs).
3. **Env Flags**
   - Set `AI_EVAL_STUB=1` so E2E runs quickly.  
   - Seed DB with:
     - At least one open property + application lacking AI score.  
     - Another application already evaluated (for ranking assertions).  
     - Quota near limit (e.g., 19/20) for quota test.

---

## File Structure

Create `apps/ops/tests/ai-eval.spec.ts` with the following sections:

```ts
import { test, expect } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Helpers from MCP plugin (assumes exported commands)
import { enableStubMode, seedQuota, createDuplicateDocs } from '../test-utils/ai';
```

### Test Cases

1. **`applications-board-navigation`**
   - Visit `/admin/applications`.  
   - Assert cards render with `data-testid="application-board-card"`.  
   - Click first card → expect URL `/admin/properties/{id}/applications` + list sorted by `data-testid="application-row"` in score order.

2. **`ai-pane-stubbed-run`**
   - Navigate to application detail route.  
   - Open AI pane (`data-testid="ai-pane-open"`).  
   - Click `Run Evaluation`.  
   - Wait 2 seconds; ensure status chip reads `Queued`.  
   - Close + reopen pane → verify stubbed score + label appear.

3. **`quota-exceeded-warning`**
   - Call helper `seedQuota({ remaining: 0 })`.  
   - Attempt to run evaluation.  
   - Expect inline alert text `Quota exceeded — TODO(stripe) add payment link` plus disabled button.

4. **`duplicate-guard-message`**
   - Use helper to create identical document fingerprint (Task 2.1 logic).  
   - Run evaluation → expect warning `Documents unchanged — evaluation skipped` and `Force Re-Eval` hidden for non-super-admin user.

5. **`real-ai-smoke`** (tag `@real-ai`, skip in CI)
   - Disable stub flag via helper `enableStubMode(false)`.  
   - Upload sample docs fixture.  
   - Trigger evaluation and wait for cron (call manual endpoint or `sleep`).  
   - Assert pane eventually shows score (this test may just confirm job enters `Queued` and requires manual verification; log instructions).

### Example Skeleton

```ts
test.describe('AI Tenant Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    await enableStubMode(true);
    await page.goto(`${baseUrl}/admin/login`);
    await page.fill('input[name=email]', 'admin@example.com');
    await page.fill('input[name=password]', 'password');
    await page.click('button[type=submit]');
  });

  test('applications-board-navigation', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/applications`);
    await expect(page.getByTestId('application-board-card').first()).toBeVisible();
    await page.getByTestId('application-board-card').first().click();
    await expect(page).toHaveURL(/\/admin\/properties\//);
    const scores = await page.$$eval('[data-testid="application-row-score"]', nodes => nodes.map(n => Number(n.textContent)));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  // ... other tests ...
});
```

---

## MCP Plugin Tips

- Use the Playwright MCP plugin commands (`/playwright/record`, `/playwright/assert`, etc.) to capture selectors quickly.  
- Store recorded steps in `apps/ops/tests/recordings/` as references (not executed) if helpful.  
- Add README snippet describing how to launch MCP plugin for future contributors.

---

## Running Tests

```bash
cd apps/ops
AI_EVAL_STUB=1 npx playwright test --project=chromium
```

For the real AI smoke test:
```bash
AI_EVAL_STUB=0 npx playwright test --grep @real-ai --project=chromium
```

Ensure CI runs the default suite (stubbed mode) inside the Ops pipeline. Capture artifacts/screenshots to troubleshoot failures.

---

## Deliverables

- `apps/ops/tests/ai-eval.spec.ts` covering the scenarios above.  
- Utilities/helpers under `apps/ops/tests/test-utils/ai.ts` for seeding stub mode, quota, duplicate fingerprints.  
- Documentation in `apps/ops/README.md` describing how to run the suite locally with MCP plugin.  
- CI job updated to call `npx playwright test` after building the Ops app.
