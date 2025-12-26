# Implementation Plan: Feature 02 - Multi-Select Operations & Proceed to Lease

**Feature ID**: 202601-UX-02
**Status**: Planning
**Created**: 2025-12-23
**Branch**: `feat/multi-select-operations`

---

## Overview

Implement multi-select functionality for applications with bulk operations (reject, move to stage, archive, email) and a streamlined "Proceed to Lease" workflow from the shortlist view.

---

## Implementation Phases

### Phase 1: Database Schema & Audit Trail (1-2 hours)

**Objective**: Add audit trail support for bulk operations

#### 1.1 Database Migration
**File**: `scripts/migrations/0011_bulk_operations_audit.sql`

```sql
-- Add bulk_action_id to audit_log for linking related bulk operations
ALTER TABLE audit_log ADD COLUMN bulk_action_id TEXT;

-- Index for efficient bulk action queries
CREATE INDEX IF NOT EXISTS idx_audit_log_bulk_action
  ON audit_log(bulk_action_id, created_at DESC);

-- Create bulk_actions table to track bulk operation metadata
CREATE TABLE IF NOT EXISTS bulk_actions (
  id TEXT PRIMARY KEY,
  performed_by TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'reject', 'move_to_stage', 'archive', 'send_email'
  application_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  params TEXT, -- JSON parameters
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bulk_actions_user
  ON bulk_actions(performed_by, created_at DESC);
```

#### 1.2 Audit Helper Functions
**File**: `apps/worker/lib/db/bulk-actions.ts` (NEW)

```typescript
import type { DatabaseInput } from '~/shared/storage-core';
import { normalizeDb } from '~/shared/storage-core';
import { nanoid } from 'nanoid';

export interface BulkAction {
  id: string;
  performedBy: string;
  actionType: 'reject' | 'move_to_stage' | 'archive' | 'send_email';
  applicationCount: number;
  successCount: number;
  failureCount: number;
  params: Record<string, any>;
  createdAt: string;
}

export async function createBulkAction(
  dbInput: DatabaseInput,
  performedBy: string,
  actionType: string,
  applicationCount: number,
  params: Record<string, any>
): Promise<string> {
  const db = normalizeDb(dbInput);
  const bulkActionId = nanoid();

  await db.execute(
    `INSERT INTO bulk_actions (id, performed_by, action_type, application_count, params)
     VALUES (?, ?, ?, ?, ?)`,
    [bulkActionId, performedBy, actionType, applicationCount, JSON.stringify(params)]
  );

  return bulkActionId;
}

export async function updateBulkActionResults(
  dbInput: DatabaseInput,
  bulkActionId: string,
  successCount: number,
  failureCount: number
): Promise<void> {
  const db = normalizeDb(dbInput);

  await db.execute(
    `UPDATE bulk_actions
     SET success_count = ?, failure_count = ?
     WHERE id = ?`,
    [successCount, failureCount, bulkActionId]
  );
}

export async function getBulkActionById(
  dbInput: DatabaseInput,
  bulkActionId: string
): Promise<BulkAction | null> {
  const db = normalizeDb(dbInput);

  const result = await db.queryOne<any>(
    `SELECT * FROM bulk_actions WHERE id = ?`,
    [bulkActionId]
  );

  if (!result) return null;

  return {
    id: result.id,
    performedBy: result.performed_by,
    actionType: result.action_type,
    applicationCount: result.application_count,
    successCount: result.success_count,
    failureCount: result.failure_count,
    params: JSON.parse(result.params || '{}'),
    createdAt: result.created_at,
  };
}
```

---

### Phase 2: Backend API - Bulk Operations (2-3 hours)

**Objective**: Implement bulk operations endpoint with proper validation and error handling

#### 2.1 Bulk Operations Endpoint
**File**: `apps/worker/routes/ops-applications.ts` (MODIFY)

Add new endpoint:

```typescript
// POST /api/ops/applications/bulk
opsApplicationsRoutes.post('/bulk', async (c: Context) => {
  const siteId = c.get('siteId');
  const userId = c.get('userId');

  const body = await c.req.json();
  const { application_ids, action, params } = body;

  // Validation
  if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
    return c.json({ error: 'Invalid application_ids' }, 400);
  }

  if (application_ids.length > 50) {
    return c.json({ error: 'Maximum 50 applications per bulk action' }, 400);
  }

  const validActions = ['reject', 'move_to_stage', 'archive', 'send_email'];
  if (!validActions.includes(action)) {
    return c.json({ error: 'Invalid action' }, 400);
  }

  // Verify all applications belong to the same unit
  const { getLeads } = await import('../lib/db/leads');
  const applications = await getLeads(c.env.DB, siteId, {
    ids: application_ids,
  });

  if (applications.length !== application_ids.length) {
    return c.json({ error: 'Some applications not found' }, 404);
  }

  const unitIds = new Set(applications.map(app => app.unitId).filter(Boolean));
  if (unitIds.size > 1) {
    return c.json({
      error: 'All applications must belong to the same unit',
      details: 'Multi-select across units is not supported'
    }, 400);
  }

  // Create bulk action record
  const { createBulkAction, updateBulkActionResults } = await import('../lib/db/bulk-actions');
  const bulkActionId = await createBulkAction(
    c.env.DB,
    userId,
    action,
    application_ids.length,
    params
  );

  // Execute bulk action
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const appId of application_ids) {
    try {
      switch (action) {
        case 'reject':
          await rejectApplication(c.env.DB, siteId, appId, params.reason, bulkActionId);
          results.push({ application_id: appId, status: 'success' });
          successCount++;
          break;

        case 'move_to_stage':
          await updateApplicationStage(c.env.DB, siteId, appId, params.stage, bulkActionId);
          results.push({ application_id: appId, status: 'success' });
          successCount++;
          break;

        case 'archive':
          await archiveApplication(c.env.DB, siteId, appId, bulkActionId);
          results.push({ application_id: appId, status: 'success' });
          successCount++;
          break;

        case 'send_email':
          // TODO: Integrate with email system (Feature #1 from 202601-next-batch)
          results.push({ application_id: appId, status: 'success' });
          successCount++;
          break;
      }
    } catch (error) {
      results.push({
        application_id: appId,
        status: 'failed',
        error: error.message
      });
      failureCount++;
    }
  }

  // Update bulk action results
  await updateBulkActionResults(c.env.DB, bulkActionId, successCount, failureCount);

  return c.json({
    bulk_action_id: bulkActionId,
    success_count: successCount,
    failure_count: failureCount,
    results,
  });
});

// Helper functions for bulk operations
async function rejectApplication(db: any, siteId: string, appId: string, reason: string, bulkActionId: string) {
  const { updateLead } = await import('../lib/db/leads');
  await updateLead(db, siteId, appId, {
    status: 'rejected',
    rejectionReason: reason,
  });

  // Log to audit trail
  await logAuditEntry(db, {
    entity_type: 'application',
    entity_id: appId,
    action: 'reject',
    bulk_action_id: bulkActionId,
    changes: { status: 'rejected', reason },
  });
}

async function updateApplicationStage(db: any, siteId: string, appId: string, stage: string, bulkActionId: string) {
  const { updateLead } = await import('../lib/db/leads');
  await updateLead(db, siteId, appId, { status: stage });

  await logAuditEntry(db, {
    entity_type: 'application',
    entity_id: appId,
    action: 'move_to_stage',
    bulk_action_id: bulkActionId,
    changes: { status: stage },
  });
}

async function archiveApplication(db: any, siteId: string, appId: string, bulkActionId: string) {
  const { updateLead } = await import('../lib/db/leads');
  await updateLead(db, siteId, appId, { is_active: false });

  await logAuditEntry(db, {
    entity_type: 'application',
    entity_id: appId,
    action: 'archive',
    bulk_action_id: bulkActionId,
    changes: { is_active: false },
  });
}
```

#### 2.2 Proceed to Lease Endpoint
**File**: `apps/worker/routes/ops-applications.ts` (MODIFY)

```typescript
// POST /api/ops/applications/:id/proceed-to-lease
opsApplicationsRoutes.post('/:id/proceed-to-lease', async (c: Context) => {
  const siteId = c.get('siteId');
  const userId = c.get('userId');
  const applicationId = c.req.param('id');

  const body = await c.req.json();
  const { lease_start_date, lease_term_months } = body;

  // Validation
  if (!lease_start_date || !lease_term_months) {
    return c.json({ error: 'lease_start_date and lease_term_months required' }, 400);
  }

  // Verify application exists and is in shortlist
  const { getLeadById } = await import('../lib/db/leads');
  const application = await getLeadById(c.env.DB, siteId, applicationId);

  if (!application) {
    return c.json({ error: 'Application not found' }, 404);
  }

  if (application.status !== 'ai_evaluated' && application.aiLabel !== 'A' && application.aiLabel !== 'B') {
    return c.json({
      error: 'Application must be shortlisted',
      details: 'Only shortlisted applications can proceed to lease'
    }, 400);
  }

  // Check unit availability
  if (!application.unitId) {
    return c.json({ error: 'Application must have a unit assigned' }, 400);
  }

  const { getUnitById } = await import('../lib/db/units');
  const unit = await getUnitById(c.env.DB, siteId, application.unitId);

  if (!unit || unit.status !== 'available') {
    return c.json({
      error: 'Unit is not available',
      details: `Unit status: ${unit?.status || 'unknown'}`
    }, 400);
  }

  // Create lease in progress
  const { createLeaseInProgress } = await import('../lib/db/leases');
  const leaseInProgressId = await createLeaseInProgress(c.env.DB, {
    siteId,
    propertyId: application.propertyId,
    unitId: application.unitId,
    primaryTenantId: null, // Will be created from application
    applicationId,
    leaseStartDate: lease_start_date,
    leaseTermMonths: lease_term_months,
    monthlyRent: unit.monthlyRent,
    status: 'draft',
    createdBy: userId,
  });

  // Update application status
  const { updateLead } = await import('../lib/db/leads');
  await updateLead(c.env.DB, siteId, applicationId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: userId,
  });

  return c.json({
    lease_in_progress_id: leaseInProgressId,
    redirect_url: `/admin/leases/in-progress/${leaseInProgressId}`,
  });
});
```

---

### Phase 3: Frontend - Multi-Select UI (3-4 hours)

**Objective**: Build checkbox UI, selection state management, and bulk action toolbar

#### 3.1 Selection State Hook
**File**: `apps/ops/app/hooks/useMultiSelect.ts` (NEW)

```typescript
import { useState, useCallback, useMemo } from 'react';

export interface MultiSelectState {
  selectedIds: string[];
  selectedUnit: string | null;
  selectAll: boolean;
}

export function useMultiSelect() {
  const [state, setState] = useState<MultiSelectState>({
    selectedIds: [],
    selectedUnit: null,
    selectAll: false,
  });

  const toggleSelection = useCallback((id: string, unitId: string | null) => {
    setState((prev) => {
      // If selecting from different unit, clear previous selections
      if (prev.selectedUnit && prev.selectedUnit !== unitId) {
        return {
          selectedIds: [id],
          selectedUnit: unitId,
          selectAll: false,
        };
      }

      const isSelected = prev.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? prev.selectedIds.filter((selectedId) => selectedId !== id)
          : [...prev.selectedIds, id],
        selectedUnit: unitId,
        selectAll: false,
      };
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[], unitId: string | null) => {
    setState((prev) => {
      if (prev.selectAll) {
        return {
          selectedIds: [],
          selectedUnit: null,
          selectAll: false,
        };
      }
      return {
        selectedIds: ids,
        selectedUnit: unitId,
        selectAll: true,
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState({
      selectedIds: [],
      selectedUnit: null,
      selectAll: false,
    });
  }, []);

  const isSelected = useCallback(
    (id: string) => state.selectedIds.includes(id),
    [state.selectedIds]
  );

  const selectedCount = useMemo(() => state.selectedIds.length, [state.selectedIds]);

  return {
    selectedIds: state.selectedIds,
    selectedUnit: state.selectedUnit,
    selectAll: state.selectAll,
    selectedCount,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isSelected,
  };
}
```

#### 3.2 Bulk Action Toolbar Component
**File**: `apps/ops/app/components/application/BulkActionToolbar.tsx` (NEW)

```typescript
import { useState } from 'react';
import { BulkActionConfirmModal } from './BulkActionConfirmModal';

interface BulkActionToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkActionComplete: () => void;
  isShortlistView?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkActionComplete,
  isShortlistView = false,
}: BulkActionToolbarProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    params?: any;
  } | null>(null);

  const handleActionClick = (action: string, params?: any) => {
    setPendingAction({ action, params });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    try {
      const response = await fetch('/api/ops/applications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: selectedIds,
          action: pendingAction.action,
          params: pendingAction.params || {},
        }),
      });

      if (!response.ok) throw new Error('Bulk action failed');

      const result = await response.json();

      // Show success message
      if (result.failure_count > 0) {
        alert(`${result.success_count} succeeded, ${result.failure_count} failed`);
      }

      onBulkActionComplete();
      onClearSelection();
    } catch (error) {
      alert('Error performing bulk action');
    } finally {
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-700 hover:text-blue-900"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleActionClick('reject')}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50"
          >
            ✕ Reject
          </button>

          <button
            onClick={() => handleActionClick('move_to_stage', { stage: 'screening' })}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            → Move to Stage
          </button>

          <button
            onClick={() => handleActionClick('archive')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            📦 Archive
          </button>

          {isShortlistView && selectedCount === 1 && (
            <button
              onClick={() => {
                // Navigate to proceed to lease
                window.location.href = `/admin/applications/${selectedIds[0]}/proceed-to-lease`;
              }}
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
            >
              ▶ Proceed to Lease
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && pendingAction && (
        <BulkActionConfirmModal
          action={pendingAction.action}
          selectedCount={selectedCount}
          onConfirm={handleConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
```

#### 3.3 Update Application List with Checkboxes
**File**: `apps/ops/app/routes/admin.properties.$propertyId.applications._index.tsx` (MODIFY)

Add checkbox column to the table and integrate multi-select state.

---

### Phase 4: Testing (4-6 hours)

#### 4.1 Unit Tests
- Test `useMultiSelect` hook
- Test bulk action functions
- Test unit scoping validation

#### 4.2 Integration Tests
- Test bulk operations endpoint
- Test proceed to lease endpoint
- Test audit trail creation

#### 4.3 E2E Tests
- Test multi-select workflow
- Test bulk reject
- Test proceed to lease flow

---

## Success Criteria

- ✅ Checkboxes appear on all application list items
- ✅ Selecting applications from different units clears previous selection
- ✅ Bulk action toolbar appears when applications are selected
- ✅ Bulk operations (reject, move, archive) work correctly
- ✅ All bulk actions are logged to audit trail
- ✅ "Proceed to Lease" button appears in shortlist view
- ✅ Proceed to lease creates lease in progress record
- ✅ Comprehensive test coverage (unit + integration + E2E)
- ✅ Documentation updated

---

## Estimated Timeline

- **Phase 1 (Database)**: 1-2 hours
- **Phase 2 (Backend API)**: 2-3 hours
- **Phase 3 (Frontend UI)**: 3-4 hours
- **Phase 4 (Testing)**: 4-6 hours
- **Total**: 10-15 hours

---

## Dependencies

- Feature 01 (Unit-Level View): Multi-select respects unit grouping ✅
- Leases database table: Required for "Proceed to Lease"
- Audit log table: Required for bulk action tracking
