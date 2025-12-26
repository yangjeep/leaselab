/**
 * TenantBulkActionConfirmModal Component
 * Confirmation dialog for tenant bulk operations
 */

import { useState } from 'react';

export interface TenantBulkActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: string, params?: Record<string, any>) => Promise<void>;
  action: 'send_email' | 'send_document' | 'add_tag' | 'export' | null;
  tenantCount: number;
  tenants?: Array<{ id: string; name: string; email: string }>;
}

export function TenantBulkActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  tenantCount,
  tenants = [],
}: TenantBulkActionConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');

  if (!isOpen || !action) {
    return null;
  }

  const actionConfig: Record<string, { title: string; description: string; buttonLabel: string; buttonClass: string }> = {
    send_email: {
      title: 'Send Email',
      description: `Send email to ${tenantCount} tenant${tenantCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Send Email',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    send_document: {
      title: 'Send Document',
      description: `Send document to ${tenantCount} tenant${tenantCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Send Document',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
    },
    add_tag: {
      title: 'Add Tag',
      description: `Add tag to ${tenantCount} tenant${tenantCount !== 1 ? 's' : ''}`,
      buttonLabel: 'Add Tag',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    export: {
      title: 'Export Tenants',
      description: `Export ${tenantCount} tenant${tenantCount !== 1 ? 's' : ''} to CSV`,
      buttonLabel: 'Export',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = actionConfig[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const params: Record<string, any> = {};

      if (action === 'add_tag') {
        // Parse comma-separated tags
        const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
        if (tagList.length === 0) {
          alert('Please enter at least one tag');
          setIsSubmitting(false);
          return;
        }
        params.tags = tagList;
      } else if (action === 'export') {
        params.export_format = exportFormat;
      }

      await onConfirm(action, params);
      onClose();
      setTags('');
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

            {/* Show list of affected tenants */}
            {tenants.length > 0 && tenants.length <= 10 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Affected Tenants:</p>
                <ul className="space-y-1">
                  {tenants.map((tenant) => (
                    <li key={tenant.id} className="text-sm text-gray-700">
                      {tenant.name} ({tenant.email})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action-specific fields */}
            {action === 'add_tag' && (
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., renewal_priority, long_term"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter one or more tags separated by commas
                </p>
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

            {action === 'send_document' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Document sending will be available once the document system is configured.
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
              disabled={isSubmitting || (action === 'send_email') || (action === 'send_document')}
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
