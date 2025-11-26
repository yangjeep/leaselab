import { Link } from '@remix-run/react';

export type Stage = {
  key: string;
  label: string;
  description: string;
};

type StageWorkflowProps = {
  stages: Stage[];
  currentStage: string;
  applicationId: string;
  onStageChange?: (newStage: string) => void;
};

export function StageWorkflow({ stages, currentStage, applicationId, onStageChange }: StageWorkflowProps) {
  const currentIndex = stages.findIndex(s => s.key === currentStage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < stages.length - 1;

  const handleStageChange = (direction: 'back' | 'forward') => {
    const newIndex = direction === 'back' ? currentIndex - 1 : currentIndex + 1;
    const newStage = stages[newIndex];
    if (newStage && onStageChange) {
      onStageChange(newStage.key);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      {/* Stage Progress Indicator */}
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
        <p className="text-sm text-indigo-700">
          {stages[currentIndex]?.description}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => handleStageChange('back')}
          disabled={!canGoBack}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoBack
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous Stage
        </button>

        <Link
          to="/admin/leads"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Back to List
        </Link>

        <button
          onClick={() => handleStageChange('forward')}
          disabled={!canGoForward}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoForward
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next Stage
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
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
