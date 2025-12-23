import { useFetcher } from '@remix-run/react';
import { useEffect } from 'react';

export default function SettingsAiPage() {
  const usageFetcher = useFetcher<any>();

  useEffect(() => {
    if (usageFetcher.state === 'idle' && !usageFetcher.data) {
      usageFetcher.load('/api/ai-usage');
    }
  }, []);

  const usage = usageFetcher.data?.success ? usageFetcher.data.data : null;

  return (
    <div className="p-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI</h1>
        <p className="text-gray-600 mb-8">Quota, usage, and site-level AI settings</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Monthly Usage</h2>
              <p className="text-sm text-gray-600">Track how many evaluations are available this month.</p>
            </div>
            <button
              type="button"
              onClick={() => usageFetcher.load('/api/ai-usage')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={usageFetcher.state === 'loading'}
            >
              {usageFetcher.state === 'loading' ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {usageFetcher.state === 'loading' && !usage && (
            <div className="py-6 text-sm text-gray-500">Loading usage…</div>
          )}

          {usage && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {usage.evaluation_count} / {usage.quota_limit} evaluations
                </p>
                <p className="text-sm text-gray-600">{usage.percentage}% used</p>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={[
                    'h-2',
                    usage.percentage >= 100
                      ? 'bg-red-500'
                      : usage.percentage >= 80
                      ? 'bg-orange-500'
                      : 'bg-green-500',
                  ].join(' ')}
                  style={{ width: `${Math.min(100, Math.max(0, usage.percentage))}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p>
                  {usage.month} • {usage.remaining} remaining
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Resets on{' '}
                  {new Date(usage.reset_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {usage.percentage >= 100 && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Monthly quota exhausted. Upgrade your plan for more evaluations.
                </div>
              )}
              {usage.percentage >= 80 && usage.percentage < 100 && (
                <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Approaching quota limit. Consider upgrading for more evaluations.
                </div>
              )}
            </div>
          )}

          {usageFetcher.data?.success === false && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {usageFetcher.data.message || 'Failed to load usage data.'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">AI Settings</h2>
          <p className="text-sm text-gray-600 mb-6">Site-level controls for AI evaluation behavior.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">AI Evaluations Enabled</p>
                <p className="text-xs text-gray-500">Allow AI evaluations for this site</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Coming soon
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-run on Documents</p>
                <p className="text-xs text-gray-500">Automatically evaluate when documents are uploaded</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Coming soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

