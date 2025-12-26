import { useState } from 'react';

export interface ChecklistStep {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  auto_complete?: boolean;
  completed_at?: string;
  notes?: string;
}

export interface LeaseChecklistItemProps {
  step: ChecklistStep;
  onToggle: (completed: boolean, notes?: string) => void;
  disabled?: boolean;
}

export function LeaseChecklistItem({
  step,
  onToggle,
  disabled = false,
}: LeaseChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(step.notes || '');

  const handleToggle = () => {
    if (disabled || step.auto_complete) return;

    const newCompleted = !step.completed;

    if (newCompleted && !showNotes) {
      // If checking the item, show notes field first
      setShowNotes(true);
    } else {
      // If unchecking or notes already shown, proceed with toggle
      onToggle(newCompleted, notes);
      if (!newCompleted) {
        setShowNotes(false);
        setNotes('');
      }
    }
  };

  const handleSaveNotes = () => {
    onToggle(true, notes);
    setShowNotes(false);
  };

  return (
    <div className="border-b border-gray-100 last:border-0 py-3">
      <div className="flex items-start gap-3">
        <div className="flex items-center h-6 mt-0.5">
          <input
            type="checkbox"
            checked={step.completed}
            onChange={handleToggle}
            disabled={disabled || step.auto_complete}
            className={`h-5 w-5 rounded border-gray-300 transition-colors ${
              step.auto_complete
                ? 'cursor-not-allowed bg-gray-100'
                : step.completed
                ? 'text-green-600 focus:ring-green-500'
                : 'text-indigo-600 focus:ring-indigo-500'
            }`}
            aria-label={`Mark "${step.label}" as ${step.completed ? 'incomplete' : 'complete'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                step.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}
            >
              {step.label}
            </span>
            {step.required && (
              <span className="text-xs text-red-500 font-medium">Required</span>
            )}
            {step.auto_complete && (
              <span className="text-xs text-gray-400 italic">Auto</span>
            )}
          </div>

          {step.completed_at && (
            <p className="text-xs text-gray-500 mt-0.5">
              Completed {new Date(step.completed_at).toLocaleString()}
            </p>
          )}

          {step.notes && !showNotes && (
            <p className="text-xs text-gray-600 mt-1 italic">
              Note: {step.notes}
            </p>
          )}

          {showNotes && (
            <div className="mt-2 space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes (optional)"
                className="w-full text-sm border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowNotes(false);
                    setNotes(step.notes || '');
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {step.completed && (
          <div className="flex items-center h-6 mt-0.5">
            <svg
              className="h-5 w-5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
