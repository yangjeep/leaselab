/**
 * BulkActionConfirmModal Component
 * Confirmation dialog for bulk operations
 */

import { useState } from 'react';

export interface BulkActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params?: Record<string, any>) => Promise<void>;
  action: 'reject' | 'move_to_stage' | 'archive' | 'send_email' | 'proceed_to_lease' | null;
  applicationCount: number;
  applications?: Array<{ id: string; firstName: string; lastName: string }>;
}

export function BulkActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  applicationCount,
  applications = [],
}: BulkActionConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [stage, setStage] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseTermMonths, setLeaseTermMonths] = useState('12');

  if (!isOpen || !action) {
    return null;
  }

  const actionLabels: Record<string, { title: string; description: string; buttonLabel: string; buttonClass: string }> = {
    reject: {
      title: 'Reject Applications',
      description: `Are you sure you want to reject ${applicationCount} application${applicationCount !== 1 ? 's' : ''}?`,
      buttonLabel: 'Reject Applications',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    move_to_stage: {
      title: 'Move to Stage',
      description: `Move ${applicationCount} application${applicationCount !== 1 ? 's' : ''} to a different stage.`,
      buttonLabel: 'Move Applications',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    archive: {
      title: 'Archive Applications',
      description: `Are you sure you want to archive ${applicationCount} application${applicationCount !== 1 ? 's' : ''}?`,
      buttonLabel: 'Archive Applications',
      buttonClass: 'bg-gray-600 hover:bg-gray-700',
    },
    send_email: {
      title: 'Send Email',
      description: `Send email to ${applicationCount} applicant${applicationCount !== 1 ? 's' : ''}.`,
      buttonLabel: 'Send Email',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    proceed_to_lease: {
      title: 'Proceed to Lease',
      description: 'Create a lease for the selected application.',
      buttonLabel: 'Create Lease',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = actionLabels[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const params: Record<string, any> = {};

      if (action === 'reject') {
        params.reason = reason;
      } else if (action === 'move_to_stage') {
        params.stage = stage;
      } else if (action === 'proceed_to_lease') {
        params.lease_start_date = leaseStartDate;
        params.lease_term_months = parseInt(leaseTermMonths);
      }

      await onConfirm(params);
      onClose();
      setReason('');
      setStage('');
      setLeaseStartDate('');
      setLeaseTermMonths('12');
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600">{config.description}</p>

            {/* Show list of affected applications */}
            {applications.length > 0 && applications.length <= 10 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Affected Applications:</p>
                <ul className="space-y-1">
                  {applications.map((app) => (
                    <li key={app.id} className="text-sm text-gray-700">
                      {app.firstName} {app.lastName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action-specific fields */}
            {action === 'reject' && (
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter rejection reason..."
                />
              </div>
            )}

            {action === 'move_to_stage' && (
              <div>
                <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Stage
                </label>
                <select
                  id="stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a stage...</option>
                  <option value="new">New</option>
                  <option value="documents_pending">Documents Pending</option>
                  <option value="documents_received">Documents Received</option>
                  <option value="ai_evaluated">AI Evaluated</option>
                  <option value="screening">Background Check</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            {action === 'proceed_to_lease' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Start Date
                  </label>
                  <input
                    type="date"
                    id="leaseStartDate"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="leaseTermMonths" className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Term (months)
                  </label>
                  <select
                    id="leaseTermMonths"
                    value={leaseTermMonths}
                    onChange={(e) => setLeaseTermMonths(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                  </select>
                </div>
              </div>
            )}

            {action === 'send_email' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Email functionality will be available once email templates are configured.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (action === 'send_email')}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${config.buttonClass}`}
            >
              {isSubmitting ? 'Processing...' : config.buttonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
