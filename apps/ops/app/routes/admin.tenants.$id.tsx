import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSubmit } from '@remix-run/react';
import { getTenantById, getWorkOrders } from '~/lib/db.server';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import type { Tenant, WorkOrder, Lease, Property, Unit } from '~/shared/types';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Tenant Not Found' }];
  return [{ title: `${data.tenant.firstName} ${data.tenant.lastName} - Tenant Details` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const tenantId = params.id;

  if (!tenantId) {
    throw new Response('Tenant ID is required', { status: 400 });
  }

  // Fetch tenant with full details (using the getTenants query for complete data)
  const query = `
    SELECT
      t.*,
      l.id as lease_id,
      l.property_id,
      l.unit_id,
      l.start_date as lease_start_date,
      l.end_date as lease_end_date,
      l.monthly_rent,
      l.security_deposit,
      l.status as lease_status,
      p.name as property_name,
      p.address as property_address,
      p.city as property_city,
      p.province as property_province,
      p.postal_code as property_postal_code,
      u.unit_number,
      u.name as unit_name,
      u.bedrooms,
      u.bathrooms,
      u.sqft
    FROM tenants t
    LEFT JOIN leases l ON t.id = l.tenant_id AND l.status IN ('active', 'signed')
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN units u ON l.unit_id = u.id
    WHERE t.id = ? AND t.site_id = ?
    LIMIT 1
  `;

  const result = await db.prepare(query).bind(tenantId, siteId).first();

  if (!result) {
    throw new Response('Tenant not found', { status: 404 });
  }

  // Map the result to tenant with related data
  const tenant: Tenant & { currentLease?: Lease; property?: Property; unit?: Unit } = {
    id: result.id as string,
    leadId: result.lead_id as string | undefined,
    firstName: result.first_name as string,
    lastName: result.last_name as string,
    email: result.email as string,
    phone: result.phone as string,
    emergencyContact: result.emergency_contact as string | undefined,
    emergencyPhone: result.emergency_phone as string | undefined,
    status: result.status as Tenant['status'],
    createdAt: result.created_at as string,
    updatedAt: result.updated_at as string,
  };

  if (result.lease_id) {
    tenant.currentLease = {
      id: result.lease_id as string,
      propertyId: result.property_id as string,
      unitId: result.unit_id as string | undefined,
      tenantId: tenant.id,
      startDate: result.lease_start_date as string,
      endDate: result.lease_end_date as string,
      monthlyRent: result.monthly_rent as number,
      securityDeposit: result.security_deposit as number,
      status: result.lease_status as Lease['status'],
      createdAt: '',
      updatedAt: '',
    };

    if (result.property_name) {
      tenant.property = {
        id: result.property_id as string,
        name: result.property_name as string,
        address: result.property_address as string,
        city: result.property_city as string,
        province: result.property_province as string,
        postalCode: result.property_postal_code as string,
        slug: '',
        propertyType: 'single_family',
        amenities: [],
        isActive: true,
        createdAt: '',
        updatedAt: '',
      };
    }

    if (result.unit_number) {
      tenant.unit = {
        id: result.unit_id as string,
        propertyId: result.property_id as string,
        unitNumber: result.unit_number as string,
        name: result.unit_name as string | undefined,
        bedrooms: result.bedrooms as number,
        bathrooms: result.bathrooms as number,
        sqft: result.sqft as number | undefined,
        rentAmount: result.monthly_rent as number,
        status: 'occupied',
        floor: undefined,
        features: [],
        isActive: true,
        createdAt: '',
        updatedAt: '',
      };
    }
  }

  // Fetch work orders for this tenant
  const workOrders = await getWorkOrders(db, siteId, { propertyId: tenant.property?.id });
  const tenantWorkOrders = workOrders.filter(wo => wo.tenantId === tenantId);

  return json({ tenant, workOrders: tenantWorkOrders });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const tenantId = params.id;

  if (!tenantId) {
    throw new Response('Tenant ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'updateStatus') {
    const status = formData.get('status') as string;
    await db.prepare('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ? AND site_id = ?')
      .bind(status, new Date().toISOString(), tenantId, siteId)
      .run();
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function TenantDetail() {
  const { tenant, workOrders } = useLoaderData<typeof loader>();
  const submit = useSubmit();

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
