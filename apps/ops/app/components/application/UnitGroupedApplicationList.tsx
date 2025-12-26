/**
 * UnitGroupedApplicationList Component
 * Displays applications grouped by unit with unit details
 * Supports multi-select operations with bulk actions
 */

import { useState } from 'react';
import { Link, useRevalidator } from '@remix-run/react';
import type { UnitApplicationGroup } from '~/shared/types';
import { useMultiSelect } from '~/lib/useMultiSelect';
import { BulkActionToolbar } from './BulkActionToolbar';
import { BulkActionConfirmModal } from './BulkActionConfirmModal';

interface UnitGroupedApplicationListProps {
  groups: UnitApplicationGroup[];
  propertyId: string;
}

interface ApplicationRowProps {
  application: any;
  propertyId: string;
  isSelected: boolean;
  onToggleSelection: () => void;
}

/**
 * Displays applications organized by unit
 * Shows unit details, application count, and applications table for each unit
 */
export function UnitGroupedApplicationList({
  groups,
  propertyId,
}: UnitGroupedApplicationListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No applications found</h3>
        <p className="text-gray-500">Applications will appear here once submitted</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <UnitGroup key={group.unit?.id || `no-unit-${index}`} group={group} propertyId={propertyId} />
      ))}
    </div>
  );
}

/**
 * Individual unit group with header and applications table
 * Includes multi-select functionality and bulk actions
 */
function UnitGroup({ group, propertyId }: { group: UnitApplicationGroup; propertyId: string }) {
  const { unit, applications, count } = group;
  const multiSelect = useMultiSelect();
  const revalidator = useRevalidator();
  const [modalAction, setModalAction] = useState<'reject' | 'move_to_stage' | 'archive' | 'send_email' | 'proceed_to_lease' | null>(null);

  // Check if any selected application is shortlisted (AI grade A/B or score >= 70)
  const hasShortlistedSelection = applications.some(
    (app: any) =>
      multiSelect.isSelected(app.id) &&
      (app.aiLabel === 'A' || app.aiLabel === 'B' || (app.aiScore && app.aiScore >= 70))
  );

  const showProceedToLease = multiSelect.count === 1 && hasShortlistedSelection;

  const selectedApplications = applications.filter((app: any) => multiSelect.isSelected(app.id));

  const handleBulkAction = async (action: string, params?: Record<string, any>) => {
    try {
      if (action === 'proceed_to_lease' && selectedApplications.length === 1) {
        // Proceed to lease endpoint
        const response = await fetch(`/api/ops/applications/${selectedApplications[0].id}/proceed-to-lease`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          alert(`Error: ${error.error}`);
          return;
        }

        const result = (await response.json()) as { lease_id: string; redirect_url: string };
        alert(`Lease created successfully! Redirecting to lease...`);
        window.location.href = result.redirect_url;
      } else {
        // Bulk operations endpoint
        const response = await fetch('/api/ops/applications/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_ids: multiSelect.selectedIds,
            action,
            params,
          }),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          alert(`Error: ${error.error}`);
          return;
        }

        const result = (await response.json()) as { success_count: number; application_count: number };
        alert(`Successfully processed ${result.success_count} of ${result.application_count} applications`);

        // Clear selection and reload data
        multiSelect.clearSelection();
        revalidator.revalidate();
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleSelectAll = () => {
    const allIds = applications.map((app: any) => app.id);
    multiSelect.selectAll(allIds, unit?.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Unit Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {unit ? `Unit ${unit.unitNumber}` : 'No Unit Assigned'}
                </h3>
                {unit && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600">
                      {unit.bedrooms} bed • {unit.bathrooms} bath
                    </span>
                    {unit.squareFeet && (
                      <span className="text-sm text-gray-600">• {unit.squareFeet} sqft</span>
                    )}
                    {unit.monthlyRent && (
                      <span className="text-sm font-medium text-blue-700">
                        • ${unit.monthlyRent.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {count} application{count !== 1 ? 's' : ''}
            </span>
            {unit?.status && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  unit.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : unit.status === 'occupied'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {unit.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <div className="px-6 pt-4">
        <BulkActionToolbar
          selectedCount={multiSelect.count}
          onClearSelection={multiSelect.clearSelection}
          onReject={() => setModalAction('reject')}
          onMoveToStage={() => setModalAction('move_to_stage')}
          onArchive={() => setModalAction('archive')}
          onSendEmail={() => setModalAction('send_email')}
          onProceedToLease={showProceedToLease ? () => setModalAction('proceed_to_lease') : undefined}
          showProceedToLease={showProceedToLease}
        />
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 w-12">
                <input
                  type="checkbox"
                  checked={applications.length > 0 && applications.every((app: any) => multiSelect.isSelected(app.id))}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  aria-label="Select all applications"
                />
              </th>
              <th className="px-6 py-3">Applicant</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">AI Score</th>
              <th className="px-6 py-3">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.map((app: any) => (
              <ApplicationRow
                key={app.id}
                application={app}
                propertyId={propertyId}
                isSelected={multiSelect.isSelected(app.id)}
                onToggleSelection={() => multiSelect.toggleSelection(app.id, app.unitId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Confirm Modal */}
      <BulkActionConfirmModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={(params) => handleBulkAction(modalAction!, params)}
        action={modalAction}
        applicationCount={multiSelect.count}
        applications={selectedApplications.map((app: any) => ({
          id: app.id,
          firstName: app.firstName,
          lastName: app.lastName,
        }))}
      />
    </div>
  );
}

/**
 * Individual application row in the table with checkbox
 */
function ApplicationRow({ application, propertyId, isSelected, onToggleSelection }: ApplicationRowProps) {
  const aiLabelColors: Record<string, string> = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    D: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    new: 'New',
    documents_pending: 'Docs Pending',
    documents_received: 'Docs Received',
    ai_evaluated: 'AI Evaluated',
    screening: 'Background Check',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          aria-label={`Select ${application.firstName} ${application.lastName}`}
        />
      </td>
      <td className="px-6 py-4">
        <Link
          to={`/admin/properties/${propertyId}/applications/${application.id}`}
          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
        >
          {application.firstName} {application.lastName}
        </Link>
        <div className="text-sm text-gray-500 mt-1">{application.email}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {application.aiLabel && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${
                aiLabelColors[application.aiLabel] || 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              Grade {application.aiLabel}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${
              statusColors[application.status] || 'bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            {statusLabels[application.status] || application.status}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {application.aiScore !== null && application.aiScore !== undefined ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{Math.round(application.aiScore)}</span>
            {application.aiScore >= 80 && (
              <span className="text-green-600" title="High score">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(application.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}
