import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSubmit, Form } from '@remix-run/react';
import { getWorkOrderById, getTenantById, getPropertyById, updateWorkOrder } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';
import type { WorkOrder, Tenant, Property } from '~/shared/types';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Work Order Not Found' }];
  return [{ title: `${data.workOrder.title} - Work Order` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const workOrderId = params.id;

  if (!workOrderId) {
    throw new Response('Work Order ID is required', { status: 400 });
  }

  const workOrder = await getWorkOrderById(db, siteId, workOrderId);

  if (!workOrder) {
    throw new Response('Work Order not found', { status: 404 });
  }

  let tenant: Tenant | null = null;
  if (workOrder.tenantId) {
    tenant = await getTenantById(db, siteId, workOrder.tenantId);
  }

  let property: Property | null = null;
  if (workOrder.propertyId) {
    property = await getPropertyById(db, siteId, workOrder.propertyId);
  }

  return json({ workOrder, tenant, property });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const workOrderId = params.id;

  if (!workOrderId) {
    throw new Response('Work Order ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'updateStatus') {
    const status = formData.get('status') as string;
    await updateWorkOrder(db, siteId, workOrderId, { status: status as WorkOrder['status'] });
    return json({ success: true });
  }

  if (action === 'updateDetails') {
    const updates: Partial<WorkOrder> = {};

    const assignedTo = formData.get('assignedTo') as string;
    const scheduledDate = formData.get('scheduledDate') as string;
    const notes = formData.get('notes') as string;
    const priority = formData.get('priority') as string;

    if (assignedTo !== null) updates.assignedTo = assignedTo || undefined;
    if (scheduledDate) updates.scheduledDate = scheduledDate;
    if (notes !== null) updates.notes = notes || undefined;
    if (priority) updates.priority = priority as WorkOrder['priority'];

    await updateWorkOrder(db, siteId, workOrderId, updates);
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function WorkOrderDetail() {
  const { workOrder, tenant, property } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStatus');
    formData.append('status', newStatus);
    submit(formData, { method: 'post' });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/work-orders" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to Work Orders
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{workOrder.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Work Order ID: {workOrder.id}</p>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-700">Current Status:</span>
          <StatusBadge status={workOrder.status} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Update Status:</label>
          <select
            onChange={(e) => handleStatusChange(e.target.value)}
            value={workOrder.status}
            className="block w-full max-w-xs rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_parts">Pending Parts</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Order Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Order Details</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="text-sm text-gray-900 mt-1">{workOrder.description}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {workOrder.category.replace(/_/g, ' ').toUpperCase()}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Priority</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <PriorityBadge priority={workOrder.priority} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(workOrder.createdAt).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
            {workOrder.completedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {new Date(workOrder.completedAt).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Property & Tenant Information */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Property & Tenant</h2>
          <dl className="space-y-4">
            {property && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Property</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <Link to={`/admin/properties/${property.id}`} className="text-indigo-600 hover:text-indigo-700">
                    {property.name}
                  </Link>
                </dd>
                <dd className="text-sm text-gray-500 mt-1">
                  {property.address}, {property.city}
                </dd>
              </div>
            )}
            {tenant && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <Link to={`/admin/tenants/${tenant.id}`} className="text-indigo-600 hover:text-indigo-700">
                    {tenant.firstName} {tenant.lastName}
                  </Link>
                </dd>
                <dd className="text-sm text-gray-500 mt-1">
                  <a href={`mailto:${tenant.email}`} className="text-indigo-600 hover:text-indigo-700">
                    {tenant.email}
                  </a>
                </dd>
                <dd className="text-sm text-gray-500 mt-1">
                  <a href={`tel:${tenant.phone}`} className="text-indigo-600 hover:text-indigo-700">
                    {tenant.phone}
                  </a>
                </dd>
              </div>
            )}
            {!tenant && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                <dd className="text-sm text-gray-500 mt-1">Not assigned</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Assignment & Scheduling */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment & Scheduling</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="_action" value="updateDetails" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  id="assignedTo"
                  name="assignedTo"
                  defaultValue={workOrder.assignedTo || ''}
                  placeholder="Contractor name or company"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  name="scheduledDate"
                  defaultValue={workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toISOString().slice(0, 16) : ''}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue={workOrder.priority}
                className="block w-full max-w-xs rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={workOrder.notes || ''}
                placeholder="Add internal notes about this work order..."
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    open: { bg: 'bg-blue-100', text: 'text-blue-700' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    pending_parts: { bg: 'bg-purple-100', text: 'text-purple-700' },
    scheduled: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700' },
    emergency: { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const c = config[priority] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {priority.toUpperCase()}
    </span>
  );
}
