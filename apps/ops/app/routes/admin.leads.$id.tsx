import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useSubmit } from '@remix-run/react';
import { getLeadById, getPropertyById, updateLead, getLeadHistory } from '~/lib/db.server';
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

  const history = await getLeadHistory(db, siteId, lead.id);
  return json({ lead, property, history });
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

  if (action === 'updateNotes') {
    const landlordNote = formData.get('landlordNote') as string | null;
    await updateLead(db, siteId, leadId, {
      landlordNote: landlordNote || undefined,
    });
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function LeadDetail() {
  const { lead, property, history } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleStageChange = (newStage: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStage');
    formData.append('status', newStage);
    submit(formData, { method: 'post' });
  };

  // Income ratio no longer available (monthly income removed)

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
    </div>
  );
}
