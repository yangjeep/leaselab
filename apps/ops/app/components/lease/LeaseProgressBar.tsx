export interface LeaseProgressBarProps {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
}

export function LeaseProgressBar({
  totalSteps,
  completedSteps,
  percentage,
}: LeaseProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Onboarding Progress
        </span>
        <span className="text-sm text-gray-500">
          {completedSteps} of {totalSteps} steps completed
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${
            percentage === 100
              ? 'bg-green-500'
              : percentage >= 70
              ? 'bg-indigo-500'
              : percentage >= 40
              ? 'bg-yellow-500'
              : 'bg-gray-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-end">
        <span className={`text-xs font-semibold ${
          percentage === 100
            ? 'text-green-600'
            : percentage >= 70
            ? 'text-indigo-600'
            : percentage >= 40
            ? 'text-yellow-600'
            : 'text-gray-600'
        }`}>
          {percentage}% complete
        </span>
      </div>
    </div>
  );
}
