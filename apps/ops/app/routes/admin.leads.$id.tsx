import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useSubmit } from '@remix-run/react';
import { getLeadById, getPropertyById, updateLead } from '~/lib/db.server';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { StageWorkflow, RENTAL_APPLICATION_STAGES } from '~/components/StageWorkflow';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Application Not Found' }];
  return [{ title: `${data.lead.firstName} ${data.lead.lastName} - Rental Application` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const leadId = params.id;

  if (!leadId) {
    throw new Response('Lead ID is required', { status: 400 });
  }

  const lead = await getLeadById(db, siteId, leadId);
  if (!lead) {
    throw new Response('Application not found', { status: 404 });
  }

  let property = null;
  if (lead.propertyId) {
    property = await getPropertyById(db, siteId, lead.propertyId);
  }

  return json({ lead, property });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const leadId = params.id;

  if (!leadId) {
    throw new Response('Lead ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'updateStage') {
    const newStatus = formData.get('status') as string;
    await updateLead(db, siteId, leadId, { status: newStatus as any });
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function LeadDetail() {
  const { lead, property } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleStageChange = (newStage: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStage');
    formData.append('status', newStage);
    submit(formData, { method: 'post' });
  };

  const incomeRatio = property?.units?.[0]?.rentAmount
    ? (lead.monthlyIncome / property.units[0].rentAmount).toFixed(2)
    : 'N/A';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {lead.firstName} {lead.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Application ID: {lead.id}
        </p>
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

            {/* Monthly Income */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Monthly Income</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {formatCurrency(lead.monthlyIncome)}
              </dd>
            </div>

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

        {/* Financial Assessment */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Assessment</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {property?.units?.[0]?.rentAmount ? formatCurrency(property.units[0].rentAmount) : 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Income-to-Rent Ratio</dt>
              <dd className="text-sm mt-1">
                <span className={`font-medium ${
                  parseFloat(incomeRatio) >= 3 ? 'text-green-600' :
                  parseFloat(incomeRatio) >= 2.5 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {incomeRatio}x
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  (Recommended: 3x+)
                </span>
              </dd>
            </div>

            {lead.aiScore !== undefined && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">AI Screening Score</dt>
                  <dd className="text-sm mt-1">
                    <span className={`text-2xl font-bold ${
                      lead.aiScore >= 80 ? 'text-green-600' :
                      lead.aiScore >= 60 ? 'text-blue-600' :
                      lead.aiScore >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {lead.aiScore}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">/ 100</span>
                  </dd>
                </div>

                {lead.aiLabel && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Risk Grade</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        lead.aiLabel === 'A' ? 'bg-green-100 text-green-800' :
                        lead.aiLabel === 'B' ? 'bg-blue-100 text-blue-800' :
                        lead.aiLabel === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Grade {lead.aiLabel}
                      </span>
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                Approve Application
              </button>
              <button className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                Reject Application
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                Request Documents
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
