import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@leaselab/ui-components';

interface AiEvaluationPaneProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentEvaluation?: any;
  isSuperAdmin?: boolean;
  materials?: any[];
}

export function AiEvaluationPane({
  open,
  onClose,
  leadId,
  leadName,
  currentEvaluation,
  isSuperAdmin = false,
  materials = [],
}: AiEvaluationPaneProps) {
  const jobFetcher = useFetcher();
  const usageFetcher = useFetcher<any>();
  const [showForceModal, setShowForceModal] = useState(false);
  const [forceReason, setForceReason] = useState('');

  // Fetch usage data when pane opens
  useEffect(() => {
    if (open && usageFetcher.state === 'idle' && !usageFetcher.data) {
      usageFetcher.load('/api/ai-usage');
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const isLoading = jobFetcher.state !== 'idle';
  const jobData = jobFetcher.data as any;
  const hasError = jobData?.success === false;
  const isDuplicate = jobData?.error === 'DuplicateDocuments' || jobData?.error === 'AlreadyEvaluated';

  const handleRunEvaluation = (force: boolean = false) => {
    const formData = new FormData();
    if (force) {
      formData.set('force_refresh', 'true');
      if (forceReason) {
        formData.set('reason', forceReason);
      }
    }

    jobFetcher.submit(formData, {
      method: 'post',
      action: `/api/ops/leads/${leadId}/ai-evaluation`,
    });

    if (force) {
      setShowForceModal(false);
      setForceReason('');
    }
  };

  // Get evaluation status
  const getStatus = () => {
    if (isLoading) return 'loading';
    if (hasError && !isDuplicate) return 'error';
    if (isDuplicate) return 'duplicate';
    if (jobData?.success && jobData?.data?.status === 'pending') return 'queued';
    if (currentEvaluation) return 'completed';
    return 'not_evaluated';
  };

  const status = getStatus();

  const normalizedMaterials = (materials || [])
    .filter(Boolean)
    .map((m: any, idx: number) => ({
      id: m.id || m.fileId || m.r2Key || m.storageKey || `${m.fileName || m.uploadedAt || 'doc'}:${idx}`,
      fileName: m.fileName || m.filename || m.name || 'Document',
      type: m.documentType || m.fileType || m.mimeType || 'document',
      uploadedAt: m.uploadedAt || m.createdAt || null,
    }))
    .slice(0, 25);

  return (
    <>
      {/* Slide-over panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-pane-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="ai-pane-title" className="text-lg font-semibold text-gray-900">
                AI Evaluation
              </h2>
              <p className="text-sm text-gray-500 mt-1">{leadName}</p>
            </div>
            <Button onClick={onClose} variant="ghost" size="icon" aria-label="Close panel" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Action Row */}
          {status !== 'duplicate' && (
            <div className="space-y-2">
              <Button
                onClick={() => handleRunEvaluation(false)}
                disabled={isLoading || status === 'queued'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 disabled:hover:bg-indigo-600"
              >
                {isLoading && (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{status === 'queued' ? 'Evaluation Queued...' : 'Run AI Evaluation'}</span>
              </Button>

              {isSuperAdmin && status === 'completed' && (
                <Button type="button" variant="secondary" className="w-full" onClick={() => setShowForceModal(true)}>
                  Force Re-Evaluation
                </Button>
              )}
            </div>
          )}

          {/* Materials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Materials sent to AI</CardTitle>
              <CardDescription>
                Review what will be submitted before starting the evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {normalizedMaterials.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No documents found. AI will evaluate based on application information only.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {normalizedMaterials.map((m) => (
                    <li key={m.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {String(m.type).replace(/_/g, ' ')}
                          {m.uploadedAt ? ` • ${new Date(m.uploadedAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card role="status" aria-live="polite">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === 'not_evaluated' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Not Evaluated</p>
                    <p className="text-sm text-gray-500">Click "Run AI Evaluation" to start</p>
                  </div>
                </div>
              )}

              {status === 'loading' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Creating Evaluation Job...</p>
                    <p className="text-sm text-gray-500">Please wait</p>
                  </div>
                </div>
              )}

              {status === 'queued' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Evaluation Queued</p>
                    <p className="text-sm text-gray-500">AI evaluation running in the background. Re-open this panel later to view the score.</p>
                    {jobData?.data?.estimated_completion && (
                      <p className="text-xs text-gray-400 mt-1">
                        Est. completion: {new Date(jobData.data.estimated_completion).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {status === 'duplicate' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Documents Unchanged</p>
                    <p className="text-sm text-gray-500">{jobData?.message}</p>
                    {isSuperAdmin ? (
                      <Button variant="link" className="px-0" onClick={() => setShowForceModal(true)}>
                        Force Re-Evaluation →
                      </Button>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">Contact a super admin to force re-evaluation</p>
                    )}
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Error</p>
                    <p className="text-sm text-gray-500">{jobData?.message || 'Failed to create evaluation job'}</p>
                    {jobData?.error === 'QuotaExceeded' && (
                      <p className="text-xs text-gray-400 mt-2">Upgrade your plan for more evaluations</p>
                    )}
                  </div>
                </div>
              )}

              {status === 'completed' && currentEvaluation && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Score Available</p>
                    <p className="text-sm text-gray-500">
                      Evaluated {new Date(currentEvaluation.evaluatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evaluation Result */}
          {status === 'completed' && currentEvaluation && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium text-foreground">Evaluation Result</CardTitle>
                <CardDescription>Overview of the latest AI score.</CardDescription>
              </CardHeader>
              <CardContent>

              {/* Score Gauge */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(currentEvaluation.score / 100) * 351.86} 351.86`}
                      className={
                        currentEvaluation.label === 'A'
                          ? 'text-green-500'
                          : currentEvaluation.label === 'B'
                          ? 'text-blue-500'
                          : 'text-yellow-500'
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-gray-900">{currentEvaluation.score}</div>
                    <div className="text-sm text-gray-500">out of 100</div>
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="flex items-center justify-center mb-4">
                <Badge
                  variant={
                    currentEvaluation.label === 'A'
                      ? 'success'
                      : currentEvaluation.label === 'B'
                      ? 'info'
                      : 'warning'
                  }
                  className="px-4 py-2 text-sm font-semibold"
                >
                  Grade {currentEvaluation.label}
                </Badge>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-700 mb-4">{currentEvaluation.summary}</p>

              {/* Risk Flags */}
              {currentEvaluation.riskFlags && currentEvaluation.riskFlags.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Risk Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentEvaluation.riskFlags.map((flag: string, idx: number) => (
                      <Badge key={idx} variant="warning">
                        {flag.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Fraud Signals */}
              {currentEvaluation.fraudSignals && currentEvaluation.fraudSignals.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-red-900 mb-2">⚠️ Fraud Signals:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentEvaluation.fraudSignals.map((signal: string, idx: number) => (
                      <Badge key={idx} variant="destructive">
                        {signal.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          )}
          {/* Usage / Quota */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-foreground">Monthly Usage</CardTitle>
              <CardDescription>Track how many evaluations are available this month.</CardDescription>
            </CardHeader>
            <CardContent>
              {usageFetcher.state === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}

              {usageFetcher.data?.success && (
                <>
                  {/* Progress Circle */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative inline-flex items-center justify-center w-40 h-40">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(usageFetcher.data.data.percentage / 100) * 439.82} 439.82`}
                          className={
                            usageFetcher.data.data.percentage >= 100
                              ? 'text-red-500'
                              : usageFetcher.data.data.percentage >= 80
                              ? 'text-orange-500'
                              : 'text-green-500'
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-gray-900">{usageFetcher.data.data.percentage}%</div>
                        <div className="text-sm text-gray-500">used</div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="text-center mb-6">
                    <p className="text-lg font-semibold text-gray-900">
                      {usageFetcher.data.data.evaluation_count} / {usageFetcher.data.data.quota_limit} evaluations
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {usageFetcher.data.data.month} • {usageFetcher.data.data.remaining} remaining
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Resets on {new Date(usageFetcher.data.data.reset_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Warning Messages */}
                  {usageFetcher.data.data.percentage >= 100 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Monthly quota exhausted</h3>
                          <p className="mt-1 text-sm text-red-700">
                            You've used all {usageFetcher.data.data.quota_limit} evaluations for this month.
                            <a href="/admin/settings" className="font-semibold underline ml-1">Upgrade to Pro</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {usageFetcher.data.data.percentage >= 80 && usageFetcher.data.data.percentage < 100 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">Approaching quota limit</h3>
                          <p className="mt-1 text-sm text-orange-700">
                            You've used {usageFetcher.data.data.evaluation_count} of {usageFetcher.data.data.quota_limit} evaluations.
                            <a href="/admin/settings" className="font-semibold underline ml-1">Upgrade for more</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => usageFetcher.load('/api/ai-usage')}
                    disabled={usageFetcher.state === 'loading'}
                    className="w-full"
                  >
                    {usageFetcher.state === 'loading' ? 'Refreshing...' : 'Refresh Usage'}
                  </Button>
                </>
              )}

              {usageFetcher.data?.success === false && (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-4">{usageFetcher.data.message || 'Failed to load usage data'}</p>
                  <Button type="button" variant="outline" onClick={() => usageFetcher.load('/api/ai-usage')}>
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={showForceModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowForceModal(false);
            setForceReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Re-Evaluation</DialogTitle>
            <DialogDescription>
              This will create a new evaluation even if documents have not changed. Provide a reason for auditing purposes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={forceReason}
            onChange={(e) => setForceReason(e.target.value)}
            rows={3}
            placeholder="e.g., Testing AI model update, Manual review required..."
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForceModal(false);
                setForceReason('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => handleRunEvaluation(true)} disabled={!forceReason.trim()}>
              Force Re-Eval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
