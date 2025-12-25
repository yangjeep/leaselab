/**
 * LeaseBulkActionConfirmModal Component
 * Confirmation dialog for lease bulk operations
 */

import { useState } from 'react';

export interface LeaseBulkActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params?: Record<string, any>) => Promise<void>;
  action: 'update_status' | 'export' | 'send_email' | 'generate_documents' | null;
  leaseCount: number;
  leases?: Array<{ id: string; tenantName: string; unitNumber: string }>;
}

export function LeaseBulkActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  leaseCount,
  leases = [],
}: LeaseBulkActionConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');

  if (!isOpen || !action) {
    return null;
  }

  const actionConfig: Record<string, { title: string; description: string; buttonLabel: string; buttonClass: string }> = {
    update_status: {
      title: 'Update Lease Status',
      description: `Update status for ${leaseCount} lease${leaseCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Update Status',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    export: {
      title: 'Export Leases',
      description: `Export ${leaseCount} lease${leaseCount !== 1 ? 's' : ''} to CSV`,
      buttonLabel: 'Export',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    send_email: {
      title: 'Send Email',
      description: `Send email to ${leaseCount} tenant${leaseCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Send Email',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    generate_documents: {
      title: 'Generate Documents',
      description: `Generate documents for ${leaseCount} lease${leaseCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Generate',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
    },
  };

  const config = actionConfig[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const params: Record<string, any> = {};

      if (action === 'update_status') {
        params.new_status = newStatus;
        params.reason = reason;
      } else if (action === 'export') {
        params.export_format = exportFormat;
      }

      await onConfirm(params);
      onClose();
      setNewStatus('');
      setReason('');
      setExportFormat('csv');
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

            {/* Show list of affected leases */}
            {leases.length > 0 && leases.length <= 10 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Affected Leases:</p>
                <ul className="space-y-1">
                  {leases.map((lease) => (
                    <li key={lease.id} className="text-sm text-gray-700">
                      {lease.tenantName} - {lease.unitNumber}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action-specific fields */}
            {action === 'update_status' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    id="newStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a status...</option>
                    <option value="draft">Draft</option>
                    <option value="pending_signature">Pending Signature</option>
                    <option value="signed">Signed</option>
                    <option value="active">Active</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
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
                    placeholder="Enter reason for status change..."
                  />
                </div>
              </div>
            )}

            {action === 'export' && (
              <div>
                <label htmlFor="exportFormat" className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format
                </label>
                <select
                  id="exportFormat"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (Coming Soon)</option>
                </select>
              </div>
            )}

            {action === 'send_email' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Email functionality will be available once the email system is configured.
                </p>
              </div>
            )}

            {action === 'generate_documents' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Document generation will be available once the document template system is configured.
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
              disabled={isSubmitting || (action === 'send_email') || (action === 'generate_documents')}
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
