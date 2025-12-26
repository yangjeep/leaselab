import { Link } from '@remix-run/react';
import { LeaseProgressBar } from './LeaseProgressBar';
import { LeaseChecklistItem, type ChecklistStep } from './LeaseChecklistItem';

export interface LeaseInProgress {
  id: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  unit: {
    id: string;
    unitNumber: string;
    propertyName: string;
  };
  progress: {
    total_steps: number;
    completed_steps: number;
    percentage: number;
  };
  checklist: ChecklistStep[];
  startDate: string;
  monthlyRent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseInProgressCardProps {
  lease: LeaseInProgress;
  onChecklistUpdate: (leaseId: string, stepId: string, completed: boolean, notes?: string) => void;
  onCompleteOnboarding: (leaseId: string) => void;
  isUpdating?: boolean;
}

export function LeaseInProgressCard({
  lease,
  onChecklistUpdate,
  onCompleteOnboarding,
  isUpdating = false,
}: LeaseInProgressCardProps) {
  const allRequiredStepsComplete = lease.checklist
    .filter(step => step.required)
    .every(step => step.completed);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {lease.tenant.firstName} {lease.tenant.lastName}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {lease.unit.propertyName} - Unit {lease.unit.unitNumber}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {lease.tenant.email}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              ${lease.monthlyRent.toLocaleString()}/mo
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Start: {new Date(lease.startDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <LeaseProgressBar
          totalSteps={lease.progress.total_steps}
          completedSteps={lease.progress.completed_steps}
          percentage={lease.progress.percentage}
        />
      </div>

      {/* Checklist */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Onboarding Checklist</h4>
        <div className="space-y-1">
          {lease.checklist.map((step) => (
            <LeaseChecklistItem
              key={step.id}
              step={step}
              onToggle={(completed, notes) =>
                onChecklistUpdate(lease.id, step.id, completed, notes)
              }
              disabled={isUpdating}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/leases/${lease.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View Lease Details
          </Link>
          <Link
            to={`/admin/tenants/${lease.tenant.id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-700"
          >
            View Tenant
          </Link>
        </div>

        {allRequiredStepsComplete && (
          <button
            onClick={() => onCompleteOnboarding(lease.id)}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? 'Processing...' : 'Complete Onboarding'}
          </button>
        )}
      </div>

      {/* Info Banner */}
      {!allRequiredStepsComplete && (
        <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-100">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Complete all required steps to finish onboarding</span>
          </div>
        </div>
      )}
    </div>
  );
}
