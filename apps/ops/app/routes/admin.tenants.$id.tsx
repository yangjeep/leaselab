import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useRouteLoaderData, Link, useSubmit, Form } from '@remix-run/react';
import { fetchTenantsFromWorker, fetchWorkOrdersFromWorker, updateTenantToWorker, deleteTenantToWorker } from '~/lib/worker-client';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import { canDelete } from '~/lib/permissions';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Tenant Not Found' }];
  return [{ title: `${data.tenant.firstName} ${data.tenant.lastName} - Tenant Details` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const tenantId = params.id;

  if (!tenantId) {
    throw new Response('Tenant ID is required', { status: 400 });
  }

  // Use getTenants with full joins - it already includes lease, property, unit, and work order count
  const tenants = await fetchTenantsFromWorker(workerEnv, siteId);
  const tenant = tenants.find(t => t.id === tenantId);

  if (!tenant) {
    throw new Response('Tenant not found', { status: 404 });
  }

  // Fetch work orders for this tenant
  const allWorkOrders = await fetchWorkOrdersFromWorker(workerEnv, siteId);
  const workOrders = allWorkOrders.filter(wo => wo.tenantId === tenantId);

  return json({ tenant, workOrders });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const secret = context.cloudflare.env.SESSION_SECRET as string;
  const tenantId = params.id;

  if (!tenantId) {
    throw new Response('Tenant ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'delete') {
    // Check permissions
    const user = await requireAuth(request, workerEnv, secret, siteId);
    if (!canDelete(user)) {
      return json({ error: 'Insufficient permissions to delete tenants' }, { status: 403 });
    }

    await deleteTenantToWorker(workerEnv, siteId, tenantId);
    return redirect('/admin/tenants');
  }

  if (action === 'updateStatus') {
    const status = formData.get('status') as string;
    await updateTenantToWorker(workerEnv, siteId, tenantId, { status });
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function TenantDetail() {
  const { tenant, workOrders } = useLoaderData<typeof loader>();
  const adminData = useRouteLoaderData<typeof import('./admin').loader>('routes/admin');
  const user = adminData?.user || null;
  const submit = useSubmit();
  const userCanDelete = canDelete(user);

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStatus');
    formData.append('status', newStatus);
    submit(formData, { method: 'post' });
  };

  const activeWorkOrders = workOrders.filter(wo =>
    ['open', 'in_progress', 'scheduled'].includes(wo.status)
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/tenants" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to Tenants
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {tenant.firstName} {tenant.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Tenant ID: {tenant.id}</p>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Status</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Current Status:</span>
          <StatusBadge status={tenant.status} />
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Update Status:</label>
          <select
            onChange={(e) => handleStatusChange(e.target.value)}
            value={tenant.status}
            className="block w-full max-w-xs rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="moving_in">Moving In</option>
            <option value="active">Active</option>
            <option value="lease_up">Lease Up</option>
            <option value="renewing">Renewing</option>
            <option value="moving_out">Moving Out</option>
            <option value="pending_n11">Pending N11</option>
            <option value="terminated">Terminated</option>
            <option value="inactive">Inactive</option>
            <option value="evicted">Evicted</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`mailto:${tenant.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {tenant.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`tel:${tenant.phone}`} className="text-indigo-600 hover:text-indigo-700">
                  {tenant.phone}
                </a>
              </dd>
            </div>
            {tenant.emergencyContact && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                  <dd className="text-sm text-gray-900 mt-1">{tenant.emergencyContact}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Emergency Phone</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    <a href={`tel:${tenant.emergencyPhone}`} className="text-indigo-600 hover:text-indigo-700">
                      {tenant.emergencyPhone}
                    </a>
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Property & Unit Information */}
        {tenant.property && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property & Unit</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Property</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <Link to={`/admin/properties/${tenant.property.id}`} className="text-indigo-600 hover:text-indigo-700">
                    {tenant.property.name}
                  </Link>
                </dd>
                <dd className="text-sm text-gray-500 mt-1">
                  {tenant.property.address}, {tenant.property.city}, {tenant.property.province} {tenant.property.postalCode}
                </dd>
              </div>
              {tenant.unit && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unit</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      Unit {tenant.unit.unitNumber} {tenant.unit.name && `- ${tenant.unit.name}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unit Details</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {tenant.unit.bedrooms} bed, {tenant.unit.bathrooms} bath
                      {tenant.unit.sqft && ` • ${tenant.unit.sqft} sq ft`}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        )}

        {/* Lease Information */}
        {tenant.currentLease && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Lease</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Lease Status</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.currentLease.status === 'active' ? 'bg-green-100 text-green-800' :
                    tenant.currentLease.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tenant.currentLease.status.replace('_', ' ').toUpperCase()}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Lease Period</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {new Date(tenant.currentLease.startDate).toLocaleDateString()} - {new Date(tenant.currentLease.endDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatCurrency(tenant.currentLease.monthlyRent)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatCurrency(tenant.currentLease.securityDeposit)}
                </dd>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Link
                  to={`/admin/leases/${tenant.currentLease.id}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View Lease Details →
                </Link>
              </div>
            </dl>
          </div>
        )}

        {/* Work Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Work Orders
            {activeWorkOrders.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {activeWorkOrders.length} active
              </span>
            )}
          </h2>
          {workOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No work orders</p>
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <Link
                  key={wo.id}
                  to={`/admin/work-orders/${wo.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{wo.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{wo.category}</p>
                    </div>
                    <WorkOrderStatusBadge status={wo.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <WorkOrderPriorityBadge priority={wo.priority} />
                    <span className="text-xs text-gray-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Section */}
      {userCanDelete && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-600 mb-4">
            Delete this tenant permanently. This action cannot be undone.
          </p>
          <Form method="post" onSubmit={(e) => {
            if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone and will remove all associated data.')) {
              e.preventDefault();
            }
          }}>
            <input type="hidden" name="_action" value="delete" />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              Delete Tenant
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    moving_in: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Moving In' },
    active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
    lease_up: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Lease Up' },
    renewing: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Renewing' },
    moving_out: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Moving Out' },
    pending_n11: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Pending N11' },
    terminated: { bg: 'bg-red-100', text: 'text-red-700', label: 'Terminated' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' },
    evicted: { bg: 'bg-red-200', text: 'text-red-900', label: 'Evicted' },
  };

  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

function WorkOrderStatusBadge({ status }: { status: string }) {
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

function WorkOrderPriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700' },
    emergency: { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const c = config[priority] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {priority.toUpperCase()}
    </span>
  );
}
