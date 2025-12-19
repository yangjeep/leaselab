/**
 * StageConfirmationDialog - Modal dialog for confirming stage transitions
 * Shows warnings, required checklist items, and allows bypass with reason
 */

import { useState, useEffect } from 'react';
import type { ChecklistItem } from './StageChecker';

export type StageTransition = {
  fromStage: string;
  fromStageLabel: string;
  toStage: string;
  toStageLabel: string;
};

type StageConfirmationDialogProps = {
  isOpen: boolean;
  transition: StageTransition | null;
  checklistItems: ChecklistItem[];
  warnings?: string[];
  canBypass?: boolean;
  onConfirm: (bypassReason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function StageConfirmationDialog({
  isOpen,
  transition,
  checklistItems,
  warnings = [],
  canBypass = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: StageConfirmationDialogProps) {
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  const requiredItems = checklistItems.filter((item) => item.required);
  const incompleteRequired = requiredItems.filter((item) => !item.checked);
  const hasIncomplete = incompleteRequired.length > 0;

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowBypassInput(false);
      setBypassReason('');
    }
  }, [isOpen]);

  if (!isOpen || !transition) return null;

  const handleConfirm = () => {
    if (hasIncomplete && showBypassInput) {
      onConfirm(bypassReason);
    } else {
      onConfirm();
    }
  };

  const canProceed = !hasIncomplete || (showBypassInput && bypassReason.trim().length >= 10);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Stage Transition
                </h3>
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Transition Info */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">You are about to move this application:</p>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1 text-center">
                    <div className="text-xs text-gray-500 mb-1">From</div>
                    <div className="font-medium text-gray-900">{transition.fromStageLabel}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-gray-500 mb-1">To</div>
                    <div className="font-medium text-indigo-700">{transition.toStageLabel}</div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Warning</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Incomplete Checklist Items */}
              {hasIncomplete && (
                <div className="mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800 mb-2">
                          Required items not completed
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                          {incompleteRequired.map((item) => (
                            <li key={item.id}>{item.label}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Bypass Option */}
                  {canBypass && !showBypassInput && (
                    <button
                      onClick={() => setShowBypassInput(true)}
                      className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Bypass requirements with reason
                    </button>
                  )}

                  {/* Bypass Reason Input */}
                  {showBypassInput && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bypass Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        placeholder="Explain why you're bypassing these requirements (minimum 10 characters)"
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {bypassReason.length} / 10 characters minimum
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {!hasIncomplete && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-700">
                      All required items are complete. You can proceed with this transition.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canProceed || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {hasIncomplete && showBypassInput ? 'Bypass & Proceed' : 'Confirm Transition'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
