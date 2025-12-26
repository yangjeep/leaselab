/**
 * BulkActionToolbar Component
 * Displays action buttons for bulk operations on selected applications
 */

import { useState } from 'react';

export interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onReject: () => void;
  onMoveToStage: () => void;
  onArchive: () => void;
  onSendEmail: () => void;
  onProceedToLease?: () => void;
  showProceedToLease?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onClearSelection,
  onReject,
  onMoveToStage,
  onArchive,
  onSendEmail,
  onProceedToLease,
  showProceedToLease = false,
}: BulkActionToolbarProps) {
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
            {selectedCount} application{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showProceedToLease && onProceedToLease && (
            <button
              onClick={onProceedToLease}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Proceed to Lease
            </button>
          )}

          <button
            onClick={onReject}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Reject
          </button>

          <button
            onClick={onMoveToStage}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Move to Stage
          </button>

          <button
            onClick={onArchive}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
              <path
                fillRule="evenodd"
                d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Archive
          </button>

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
        </div>
      </div>
    </div>
  );
}
