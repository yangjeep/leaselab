/**
 * TenantBulkActionToolbar Component
 * Displays action buttons for bulk operations on selected tenants
 */

export interface TenantBulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSendEmail: () => void;
  onExport: () => void;
  onAddTag: () => void;
  onSendDocument: () => void;
}

export function TenantBulkActionToolbar({
  selectedCount,
  onClearSelection,
  onSendEmail,
  onExport,
  onAddTag,
  onSendDocument,
}: TenantBulkActionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClearSelection}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Clear selection"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} tenant{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onSendEmail}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Send Email
          </button>

          <button
            onClick={onSendDocument}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
            Send Document
          </button>

          <button
            onClick={onAddTag}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            Add Tag
          </button>

          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
