/**
 * EnhancedStageWorkflow - Stage workflow with integrated checklist and confirmation dialogs
 * Replaces the basic StageWorkflow with full stage-gating support
 */

import { useState } from 'react';
import { Link } from '@remix-run/react';
import { StageChecker, type ChecklistItem } from './application/StageChecker';
import { StageConfirmationDialog, type StageTransition } from './application/StageConfirmationDialog';

export type Stage = {
  key: string;
  label: string;
  description: string;
};

type StageWorkflowProps = {
  stages: Stage[];
  currentStage: string;
  applicationId: string;
  checklistItems: ChecklistItem[];
  onStageChange?: (newStage: string, bypassReason?: string) => Promise<void>;
  onChecklistItemToggle?: (itemId: string, checked: boolean) => void;
  warnings?: string[];
  canBypassRequirements?: boolean;
  backLinkTo?: string;
  backLinkLabel?: string;
};

export function EnhancedStageWorkflow({
  stages,
  currentStage,
  applicationId,
  checklistItems,
  onStageChange,
  onChecklistItemToggle,
  warnings = [],
  canBypassRequirements = false,
  backLinkTo = '/admin/applications',
  backLinkLabel = 'Back to Applications',
}: StageWorkflowProps) {
  const [pendingTransition, setPendingTransition] = useState<StageTransition | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentIndex = stages.findIndex((s) => s.key === currentStage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < stages.length - 1;

  const handleStageChangeRequest = (direction: 'back' | 'forward') => {
    const newIndex = direction === 'back' ? currentIndex - 1 : currentIndex + 1;
    const newStage = stages[newIndex];
    const fromStage = stages[currentIndex];

    if (newStage && fromStage) {
      setPendingTransition({
        fromStage: fromStage.key,
        fromStageLabel: fromStage.label,
        toStage: newStage.key,
        toStageLabel: newStage.label,
      });
    }
  };

  const handleConfirmTransition = async (bypassReason?: string) => {
    if (!pendingTransition || !onStageChange) return;

    setIsTransitioning(true);
    try {
      await onStageChange(pendingTransition.toStage, bypassReason);
      setPendingTransition(null);
    } catch (error) {
      console.error('Stage transition failed:', error);
      // Error handling should be done by parent component
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        {/* Stage Progress Indicator */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Application Progress</h3>
              <span className="text-xs text-gray-500">
                Stage {currentIndex + 1} of {stages.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"
                />
              </div>
            </div>

            {/* Stage Indicators */}
            <div className="flex justify-between">
              {stages.map((stage, index) => {
                const isComplete = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;

                return (
                  <div key={stage.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-2 transition-all ${
                        isComplete
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isComplete ? '✓' : index + 1}
                    </div>
                    <span
                      className={`text-xs font-medium text-center ${
                        isCurrent ? 'text-indigo-700' : isComplete ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Stage Info */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-indigo-900 mb-1">
              {stages[currentIndex]?.label}
            </h4>
            <p className="text-sm text-indigo-700">{stages[currentIndex]?.description}</p>
          </div>

          {/* Stage Checklist */}
          {checklistItems.length > 0 && onChecklistItemToggle && (
            <div className="mb-4">
              <StageChecker
                title="Stage Requirements"
                description="Complete these items before advancing to the next stage"
                items={checklistItems}
                onItemToggle={onChecklistItemToggle}
                showProgress={true}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => handleStageChangeRequest('back')}
              disabled={!canGoBack || isTransitioning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                canGoBack && !isTransitioning
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous Stage
            </button>

            <Link to={backLinkTo} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              {backLinkLabel}
            </Link>

            <button
              onClick={() => handleStageChangeRequest('forward')}
              disabled={!canGoForward || isTransitioning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                canGoForward && !isTransitioning
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isTransitioning && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              Next Stage
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stage Confirmation Dialog */}
      <StageConfirmationDialog
        isOpen={!!pendingTransition}
        transition={pendingTransition}
        checklistItems={checklistItems}
        warnings={warnings}
        canBypass={canBypassRequirements}
        onConfirm={handleConfirmTransition}
        onCancel={() => setPendingTransition(null)}
        isLoading={isTransitioning}
      />
    </>
  );
}

// Define standard stages for rental applications
export const RENTAL_APPLICATION_STAGES: Stage[] = [
  {
    key: 'new',
    label: 'New Application',
    description: 'Review application details submitted from the website',
  },
  {
    key: 'documents_pending',
    label: 'Documents',
    description: 'Request and collect required documents from applicant',
  },
  {
    key: 'documents_received',
    label: 'Documents Received',
    description: 'Verify uploaded documents for completeness and validity',
  },
  {
    key: 'ai_evaluated',
    label: 'AI Screening',
    description: 'Automated evaluation of application and documents',
  },
  {
    key: 'screening',
    label: 'Background Check',
    description: 'Manual review and third-party verification',
  },
  {
    key: 'approved',
    label: 'Decision',
    description: 'Approve or reject the application',
  },
  {
    key: 'lease_sent',
    label: 'Lease Preparation',
    description: 'Generate and send lease agreement',
  },
  {
    key: 'lease_signed',
    label: 'Lease Signed',
    description: 'Application complete - convert to active tenant',
  },
];
