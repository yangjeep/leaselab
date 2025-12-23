/**
 * Application Detail Page
 * Shows comprehensive view of a single application with tabs for:
 * - Overview (applicants, key info)
 * - Documents (uploads, verification)
 * - Activity (stage transitions, history)
 * - AI Notes (internal notes)
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useNavigate, useSearchParams, useRouteLoaderData, useFetcher, useRevalidator } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import {
  fetchPropertyFromWorker,
  fetchLeadFromWorker,
  fetchApplicationApplicantsFromWorker,
  fetchApplicationDocumentsFromWorker,
  fetchApplicationTransitionsFromWorker,
  fetchApplicationNotesFromWorker,
  approveApplicationToWorker,
  rejectApplicationToWorker,
  reviveApplicationToWorker,
  sendApplicationEmailToWorker,
} from '~/lib/worker-client';
import { ApplicantCard, DocumentsList, InternalNotes } from '~/components/application';
import { AiEvaluationPane } from '~/components/ai/AiEvaluationPane';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const workerEnv = {
    WORKER_URL: env.WORKER_URL,
    WORKER_INTERNAL_KEY: env.WORKER_INTERNAL_KEY,
  };
  const secret = env.SESSION_SECRET as string;
  const hostnameSiteId = getSiteId(request);
  const user = await requireAuth(request, workerEnv, secret, hostnameSiteId);
  const siteId = user.siteId;
  const { propertyId, applicationId } = params;

  if (!propertyId || !applicationId) {
    throw new Response('Property ID and Application ID required', { status: 400 });
  }

  const [property, application, applicants, documents, transitions, notes] = await Promise.all([
    fetchPropertyFromWorker(env, siteId, propertyId),
    fetchLeadFromWorker(env, siteId, applicationId),
    fetchApplicationApplicantsFromWorker(env, siteId, applicationId),
    fetchApplicationDocumentsFromWorker(env, siteId, applicationId),
    fetchApplicationTransitionsFromWorker(env, siteId, applicationId),
    fetchApplicationNotesFromWorker(env, siteId, applicationId),
  ]);

  return json({
    property,
    application,
    applicants,
    documents,
    transitions,
    notes,
  });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const hostnameSiteId = getSiteId(request);
  const { propertyId, applicationId } = params;

  if (!propertyId || !applicationId) {
    return json({ success: false, error: 'Property ID and Application ID required' }, { status: 400 });
  }

  const workerEnv = {
    WORKER_URL: env.WORKER_URL,
    WORKER_INTERNAL_KEY: env.WORKER_INTERNAL_KEY,
  };
  const secret = env.SESSION_SECRET as string;
  const user = await requireAuth(request, workerEnv, secret, hostnameSiteId);
  const siteId = user.siteId;

  const formData = await request.formData();
  const intent = formData.get('_action');

  try {
    switch (intent) {
      case 'approve': {
        await approveApplicationToWorker(env, siteId, user.id, applicationId);
        return json({ success: true, message: 'Application approved successfully!' });
      }
      case 'reject': {
        const reason = formData.get('reason');
        if (!reason || typeof reason !== 'string') {
          return json({ success: false, error: 'Rejection reason is required.' }, { status: 400 });
        }
        await rejectApplicationToWorker(env, siteId, user.id, applicationId, reason);
        return json({ success: true, message: 'Application rejected.' });
      }
      case 'revive': {
        await reviveApplicationToWorker(env, siteId, user.id, applicationId);
        return json({ success: true, message: 'Application revived.' });
      }
      case 'sendEmail': {
        const subject = formData.get('subject');
        const message = formData.get('message');
        if (!subject || typeof subject !== 'string' || !message || typeof message !== 'string') {
          return json({ success: false, error: 'Subject and message are required.' }, { status: 400 });
        }
        await sendApplicationEmailToWorker(env, siteId, user.id, applicationId, { subject, message });
        return json({ success: true, message: 'Email sent successfully!' });
      }
      default:
        return json({ success: false, error: 'Unsupported action.' }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export default function ApplicationDetail() {
  const { property, application, applicants, documents, transitions, notes } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const adminData = useRouteLoaderData<typeof import('./admin').loader>('routes/admin');
  const currentUserId = adminData?.user?.id;
  const currentSiteId = adminData?.currentSite;
  const [showAiPane, setShowAiPane] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const actionFetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();
  const revalidator = useRevalidator();
  const isRejected = application?.status === 'rejected';

  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  if (!currentUserId || !currentSiteId) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          Unable to determine your session context. Please refresh and try again.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (actionFetcher.state === 'idle' && actionFetcher.data && actionLoading) {
      if (actionFetcher.data.success) {
        setActionMessage({ type: 'success', message: actionFetcher.data.message || 'Action completed successfully.' });
      } else if (actionFetcher.data.error) {
        setActionMessage({ type: 'error', message: actionFetcher.data.error });
      } else {
        setActionMessage({ type: 'error', message: 'Unexpected response from server.' });
      }
      setActionLoading(null);
      revalidator.revalidate();
      const timeout = setTimeout(() => setActionMessage(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [actionFetcher.state, actionFetcher.data, actionLoading, revalidator]);

  const handleApprove = async () => {
    setActionLoading('approve');
    setActionMessage(null);
    const formData = new FormData();
    formData.append('_action', 'approve');
    actionFetcher.submit(formData, { method: 'post' });
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading('reject');
    setActionMessage(null);
    const formData = new FormData();
    formData.append('_action', 'reject');
    formData.append('reason', reason);
    actionFetcher.submit(formData, { method: 'post' });
  };

  const handleSendEmail = async () => {
    const subject = prompt('Email subject:');
    if (!subject) return;
    const message = prompt('Email message:');
    if (!message) return;

    setActionLoading('email');
    setActionMessage(null);
    const formData = new FormData();
    formData.append('_action', 'sendEmail');
    formData.append('subject', subject);
    formData.append('message', message);
    actionFetcher.submit(formData, { method: 'post' });
  };

  const handleRevive = async () => {
    setActionLoading('revive');
    setActionMessage(null);
    const formData = new FormData();
    formData.append('_action', 'revive');
    actionFetcher.submit(formData, { method: 'post' });
  };

  // Get primary applicant for header display
  const primaryApplicant = applicants.find((a: any) => a.applicantType === 'primary') || applicants[0];

  // Status badge color mapping
  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    documents_pending: 'bg-yellow-100 text-yellow-800',
    documents_received: 'bg-green-100 text-green-800',
    ai_evaluated: 'bg-purple-100 text-purple-800',
    screening: 'bg-indigo-100 text-indigo-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  // AI label color mapping
  const aiLabelColors: Record<string, string> = {
    A: 'bg-green-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-yellow-500 text-white',
    D: 'bg-red-500 text-white',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate(`/admin/properties/${property.id}/applications`)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {primaryApplicant?.firstName} {primaryApplicant?.lastName}
              </h1>
              {application.aiLabel && (
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${aiLabelColors[application.aiLabel]}`}>
                  Grade {application.aiLabel}
                </span>
              )}
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[application.status] || 'bg-gray-100 text-gray-800'}`}>
                {application.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {application.email}
              </span>
              {application.phone && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {application.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {property.name}
              </span>
              {application.aiScore !== null && application.aiScore !== undefined && (
                <span className="flex items-center gap-1 font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  AI Score: {Math.round(application.aiScore)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiPane(true)}
              disabled={isRejected}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRejected ? 'bg-gray-200 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Evaluation
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading !== null || isRejected}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRejected ? 'bg-gray-200 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {actionLoading === 'approve' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading !== null || isRejected}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRejected ? 'bg-gray-200 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {actionLoading === 'reject' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={actionLoading !== null || isRejected}
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRejected ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {actionLoading === 'email' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {actionLoading === 'email' ? 'Sending...' : 'Send Email'}
            </button>
            <button
              onClick={handleRevive}
              disabled={actionLoading !== null || !isRejected}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'revive' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7.5M19 5a9 9 0 00-14 7.5" />
                </svg>
              )}
              {actionLoading === 'revive' ? 'Reviving...' : 'Revive'}
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`mt-4 p-4 rounded-lg ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{actionMessage.message}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 -mb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activity ({transitions.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            AI Notes ({notes.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Applicants */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Applicants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applicants.map((applicant: any) => (
                  <ApplicantCard key={applicant.id} applicant={applicant} applicationId={application.id} />
                ))}
              </div>
            </div>

            {/* Application Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property</dt>
                  <dd className="mt-1 text-sm text-gray-900">{property.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
                  <dd className="mt-1 text-sm text-gray-900">${application.monthlyRent?.toLocaleString() || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Move-in Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.moveInDate ? new Date(application.moveInDate).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Applied On</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(application.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                {application.householdIncome && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Household Income</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      ${application.householdIncome.toLocaleString()}/mo
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="max-w-5xl mx-auto">
            <DocumentsList applicationId={application.id} documents={documents} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Stage Transitions</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {transitions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No stage transitions yet
                  </div>
                ) : (
                  transitions.map((transition: any) => (
                    <div key={transition.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-gray-900">
                              {transition.fromStage || 'Initial'} → {transition.toStage}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {transition.transitionType}
                            </span>
                          </div>
                          {transition.internalNotes && (
                            <p className="text-sm text-gray-600 mt-1">{transition.internalNotes}</p>
                          )}
                          {transition.bypassReason && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-orange-700">Bypass Reason:</span>{' '}
                              <span className="text-gray-700">{transition.bypassReason}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{new Date(transition.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs">
                            {new Date(transition.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="max-w-5xl mx-auto">
            <InternalNotes applicationId={application.id} notes={notes} currentUserId={currentUserId} />
          </div>
        )}
      </div>

      {/* AI Evaluation Pane */}
      <AiEvaluationPane
        open={showAiPane}
        leadId={application.id}
        leadName={`${primaryApplicant?.firstName || ''} ${primaryApplicant?.lastName || ''}`.trim() || 'Applicant'}
        currentEvaluation={application.aiEvaluation}
        materials={documents}
        onClose={() => setShowAiPane(false)}
      />
    </div>
  );
}
