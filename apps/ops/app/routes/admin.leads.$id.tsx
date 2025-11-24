import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Form, useNavigation } from '@remix-run/react';
import { getLeadById, getLeadFiles, getAIEvaluation, getPropertyById, updateLead } from '~/lib/db.server';
import { formatCurrency, formatPhoneNumber } from '@leaselab/shared-utils';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const name = data?.lead ? `${data.lead.firstName} ${data.lead.lastName}` : 'Lead';
  return [{ title: `${name} - LeaseLab.io` }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Not found', { status: 404 });

  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  const [lead, files, evaluation] = await Promise.all([
    getLeadById(db, siteId, id),
    getLeadFiles(db, siteId, id),
    getAIEvaluation(db, siteId, id),
  ]);

  if (!lead) {
    throw new Response('Lead not found', { status: 404 });
  }

  const property = await getPropertyById(db, siteId, lead.propertyId);

  return json({ lead, files, evaluation, property });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) return json({ error: 'Lead ID required' }, { status: 400 });

  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'approve') {
    await updateLead(db, siteId, id, { status: 'approved' });
  } else if (action === 'reject') {
    await updateLead(db, siteId, id, { status: 'rejected' });
  } else if (action === 'trigger_ai') {
    // Trigger AI evaluation via API
    const response = await fetch(`${new URL(request.url).origin}/api/leads/${id}/ai`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      }
    });
    if (!response.ok) {
      return json({ error: 'AI evaluation failed' }, { status: 500 });
    }
  }

  return redirect(`/admin/leads/${id}`);
}

export default function LeadDetail() {
  const { lead, files, evaluation, property } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const incomeRatio = property ? (lead.monthlyIncome / property.rent).toFixed(2) : 'N/A';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {lead.firstName} {lead.lastName}
        </h1>
        <p className="text-gray-500">Lead #{lead.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium text-gray-900">{formatPhoneNumber(lead.phone)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Current Address</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.currentAddress || 'Not provided'}</dd>
              </div>
            </dl>
          </div>

          {/* Financial Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Employment Status</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">{lead.employmentStatus.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Monthly Income</dt>
                <dd className="text-sm font-medium text-gray-900">{formatCurrency(lead.monthlyIncome)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Property Rent</dt>
                <dd className="text-sm font-medium text-gray-900">{property ? formatCurrency(property.rent) : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Income to Rent Ratio</dt>
                <dd className={`text-sm font-medium ${parseFloat(incomeRatio) >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                  {incomeRatio}x
                </dd>
              </div>
            </dl>
          </div>

          {/* AI Evaluation */}
          {evaluation && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Evaluation</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-4xl font-bold ${getScoreColor(evaluation.score)}`}>
                  {evaluation.score}
                </div>
                <span className={`text-xl font-bold px-3 py-1 rounded ${getLabelBg(evaluation.label)}`}>
                  {evaluation.label}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Summary</h3>
                  <p className="text-sm text-gray-600 mt-1">{evaluation.summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Recommendation</h3>
                  <p className="text-sm text-gray-600 mt-1">{evaluation.recommendation}</p>
                </div>
                {evaluation.riskFlags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Risk Flags</h3>
                    <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                      {evaluation.riskFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h2>
            {files.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {files.map((file) => (
                  <li key={file.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500 capitalize">{file.fileType.replace('_', ' ')}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="mb-4">
              <StatusBadge status={lead.status} />
            </div>
            <div className="space-y-2">
              {!evaluation && (
                <Form method="post">
                  <input type="hidden" name="_action" value="trigger_ai" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Run AI Evaluation
                  </button>
                </Form>
              )}
              {lead.status !== 'approved' && lead.status !== 'rejected' && (
                <>
                  <Form method="post">
                    <input type="hidden" name="_action" value="approve" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="_action" value="reject" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </Form>
                </>
              )}
            </div>
          </div>

          {/* Move-in Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Move-in Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Desired Move-in Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(lead.moveInDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Applied On</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Message</h2>
              <p className="text-sm text-gray-600">{lead.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    documents_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Documents Pending' },
    documents_received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Documents Received' },
    ai_evaluating: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'AI Evaluating' },
    ai_evaluated: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'AI Evaluated' },
    screening: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Screening' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return <span className={`text-sm px-3 py-1 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getLabelBg(label: string): string {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-red-100 text-red-700',
  };
  return colors[label] || 'bg-gray-100 text-gray-700';
}
