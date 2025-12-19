import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useRouteLoaderData, useSubmit, useActionData } from '@remix-run/react';
import { fetchLeadFromWorker, fetchPropertyFromWorker, updateLeadToWorker, fetchLeadHistoryFromWorker, fetchLeadFilesFromWorker } from '~/lib/worker-client';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import { canDelete } from '~/lib/permissions';
import { StageWorkflow, RENTAL_APPLICATION_STAGES } from '~/components/StageWorkflow';
import { AiEvaluationPane } from '~/components/ai/AiEvaluationPane';
import { useState } from 'react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Application Not Found' }];
  return [{ title: `${data.lead.firstName} ${data.lead.lastName} - Rental Application` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const leadId = params.id;

  if (!leadId) {
    throw new Response('Lead ID is required', { status: 400 });
  }

  const lead = await fetchLeadFromWorker(workerEnv, siteId, leadId);
  if (!lead) {
    throw new Response('Application not found', { status: 404 });
  }

  let property = null;
  if (lead.propertyId) {
    property = await fetchPropertyFromWorker(workerEnv, siteId, lead.propertyId);
  }

  const history = await fetchLeadHistoryFromWorker(workerEnv, siteId, lead.id);
  const files = await fetchLeadFilesFromWorker(workerEnv, siteId, lead.id);

  // Fetch AI evaluation if exists
  let aiEvaluation = null;
  try {
    const { fetchAIEvaluationFromWorker } = await import('~/lib/worker-client');
    aiEvaluation = await fetchAIEvaluationFromWorker(workerEnv, siteId, lead.id);
  } catch (error) {
    // AI evaluation not found or error - that's okay
    console.log('No AI evaluation found for lead:', lead.id);
  }

  return json({ lead, property, history, files, aiEvaluation });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const leadId = params.id;

  if (!leadId) {
    throw new Response('Lead ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'updateStage') {
    const newStatus = formData.get('status') as string;
    await updateLeadToWorker(workerEnv, siteId, leadId, { status: newStatus as any });
    return json({ success: true });
  }

  if (action === 'updateNotes') {
    const landlordNote = formData.get('landlordNote') as string | null;
    await updateLeadToWorker(workerEnv, siteId, leadId, {
      landlordNote: landlordNote || undefined,
    });
    return json({ success: true });
  }

  if (action === 'uploadFile') {
    const { uploadLeadFileToWorker } = await import('~/lib/worker-client');
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string;

    if (!file || file.size === 0) {
      return json({ success: false, error: 'No file selected' }, { status: 400 });
    }

    try {
      await uploadLeadFileToWorker(workerEnv, siteId, leadId, file, fileType);
      return json({ success: true });
    } catch (error) {
      console.error('Error uploading file:', error);
      return json({ success: false, error: 'Failed to upload file' }, { status: 500 });
    }
  }

  if (action === 'archiveLead') {
    // Check permissions
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const user = await requireAuth(request, workerEnv, secret, siteId);
    if (!canDelete(user)) {
      return json({ error: 'Insufficient permissions to archive applications' }, { status: 403 });
    }

    const { archiveLeadToWorker } = await import('~/lib/worker-client');
    await archiveLeadToWorker(workerEnv, siteId, leadId);
    return redirect('/admin/leads');
  }

  return json({ success: false }, { status: 400 });
}

export default function LeadDetail() {
  const { lead, property, history, files, aiEvaluation } = useLoaderData<typeof loader>();
  const adminData = useRouteLoaderData<typeof import('./admin').loader>('routes/admin');
  const user = adminData?.user || null;
  const submit = useSubmit();
  const userCanDelete = canDelete(user);
  const [isAiPaneOpen, setIsAiPaneOpen] = useState(false);

  const handleStageChange = (newStage: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStage');
    formData.append('status', newStage);
    submit(formData, { method: 'post' });
  };

  // Income ratio no longer available (monthly income removed)

  const handleArchive = () => {
    if (!confirm('Are you sure you want to archive this application? It will be hidden from the main list but can be restored later.')) {
      return;
    }
    const formData = new FormData();
    formData.append('_action', 'archiveLead');
    submit(formData, { method: 'post' });
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Application ID: {lead.id}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsAiPaneOpen(true)}
            className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            AI Evaluation
          </button>
          {userCanDelete ? (
            <button
              onClick={handleArchive}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Archive Application
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
              title="Admin permission required"
            >
              Archive Application
            </button>
          )}
        </div>
      </div>

      {/* Stage Workflow */}
      <StageWorkflow
        stages={RENTAL_APPLICATION_STAGES}
        currentStage={lead.status}
        applicationId={lead.id}
        onStageChange={handleStageChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Details - Matching Site Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
          <dl className="space-y-4">
            {/* Property */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Property</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {property ? property.name : 'Not specified'}
                {lead.isUnitOccupied && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                      ⚠️ Property/Unit Currently Occupied
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      This application is for a property or unit that is currently occupied by another tenant.
                    </p>
                  </div>
                )}
              </dd>
            </div>

            {/* Contact Information */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {lead.email}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:text-indigo-700">
                  {lead.phone}
                </a>
              </dd>
            </div>

            {/* Move-in Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Ideal Move-in Date</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(lead.moveInDate).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </dd>
            </div>

            {/* Employment Status */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
              <dd className="text-sm text-gray-900 mt-1 capitalize">
                {lead.employmentStatus.replace('_', ' ')}
              </dd>
            </div>

            {/* Landlord/Internal Notes */}
            {lead.landlordNote && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Landlord Note</dt>
                <dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{lead.landlordNote}</dd>
              </div>
            )}

            {/* Current Address */}
            {lead.currentAddress && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Address</dt>
                <dd className="text-sm text-gray-900 mt-1">{lead.currentAddress}</dd>
              </div>
            )}

            {/* Message */}
            {lead.message && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Message</dt>
                <dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{lead.message}</dd>
              </div>
            )}

            {/* Application Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Applied On</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(lead.createdAt).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes Editor & History */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h2>
            <form method="post" className="space-y-4" onSubmit={(e) => {
              // allow progressive enhancement
            }}>
              <input type="hidden" name="_action" value="updateNotes" />
              <div>
                <label htmlFor="landlordNote" className="text-sm font-medium text-gray-700">Landlord Note</label>
                <textarea id="landlordNote" name="landlordNote" rows={4} className="input w-full mt-1" defaultValue={lead.landlordNote || ''} />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Save Notes</button>
            </form>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No history events recorded.</p>
            ) : (
              <ul className="space-y-3">
                {history.map(evt => (
                  <li key={evt.id} className="text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{evt.eventType}</span>
                      <span className="text-xs text-gray-500">{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(evt.eventData, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Applicant Files Section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Submitted Documents</h2>
        </div>

        {/* Upload Form */}
        <form method="post" encType="multipart/form-data" className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input type="hidden" name="_action" value="uploadFile" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                id="fileType"
                name="fileType"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="government_id">Government ID</option>
                <option value="paystub">Pay Stub</option>
                <option value="bank_statement">Bank Statement</option>
                <option value="tax_return">Tax Return</option>
                <option value="employment_letter">Employment Letter</option>
                <option value="other">Other Document</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <input
                type="file"
                id="file"
                name="file"
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upload Document
              </button>
            </div>
          </div>
        </form>

        {files.length === 0 ? (
          <p className="text-sm text-gray-500">No documents have been submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {files.map((file: any) => {
              const fileTypeLabels: Record<string, string> = {
                government_id: 'Government ID',
                paystub: 'Pay Stub',
                bank_statement: 'Bank Statement',
                tax_return: 'Tax Return',
                employment_letter: 'Employment Letter',
                other: 'Other Document',
              };

              const fileTypeLabel = fileTypeLabels[file.fileType] || file.fileType;
              const fileSizeKB = (file.fileSize / 1024).toFixed(1);
              const uploadDate = new Date(file.uploadedAt).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {fileTypeLabel}
                        </span>
                        <span className="text-xs text-gray-500">
                          {fileSizeKB} KB
                        </span>
                        <span className="text-xs text-gray-500">
                          • {uploadDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="flex-shrink-0 ml-4">
                    <a
                      href={file.signedUrl}
                      download={file.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {files.length > 0 && (
          <div className="mt-4 text-xs text-gray-500">
            Download links are valid for 24 hours from page load.
          </div>
        )}
      </div>

      {/* AI Evaluation Pane */}
      <AiEvaluationPane
        open={isAiPaneOpen}
        onClose={() => setIsAiPaneOpen(false)}
        leadId={lead.id}
        leadName={`${lead.firstName} ${lead.lastName}`}
        currentEvaluation={aiEvaluation?.data}
        isSuperAdmin={Boolean(user?.isSuperAdmin)}
      />
    </div>
  );
}
