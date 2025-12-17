import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import {
  fetchLeasesFromWorker,
  fetchPropertiesFromWorker,
  fetchUnitsFromWorker,
  fetchTenantsFromWorker,
} from '~/lib/worker-client';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { SortableTableHeader, NonSortableTableHeader } from '~/components/SortableTableHeader';

export const meta: MetaFunction = () => {
  return [{ title: 'Leases - LeaseLab.io' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const url = new URL(request.url);

  const status = url.searchParams.get('status') || undefined;
  const propertyId = url.searchParams.get('propertyId') || undefined;
  const unitId = url.searchParams.get('unitId') || undefined;
  const tenantId = url.searchParams.get('tenantId') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'start_date';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const [leases, properties, units, tenants] = await Promise.all([
    fetchLeasesFromWorker(env, siteId, { status, propertyId, unitId, tenantId, sortBy, sortOrder }),
    fetchPropertiesFromWorker(env, siteId),
    propertyId ? fetchUnitsFromWorker(env, siteId, propertyId) : Promise.resolve([]),
    fetchTenantsFromWorker(env, siteId),
  ]);

  return json({ leases, properties, units, tenants });
}

export default function LeasesIndex() {
  const { leases, properties, units, tenants } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPropertyId = searchParams.get('propertyId') || 'all';
  const currentUnitId = searchParams.get('unitId') || 'all';
  const currentTenantId = searchParams.get('tenantId') || 'all';

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_signature', label: 'Pending Signature' },
    { value: 'signed', label: 'Signed' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'terminated', label: 'Terminated' },
  ];

  // Filter units based on selected property
  const filteredUnits = currentPropertyId !== 'all'
    ? units.filter((u: any) => u.propertyId === currentPropertyId)
    : units;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">{leases.length} leases</div>
          <Link
            to="/admin/leases/new"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Lease
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[80px]">Status:</span>
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (value === 'all') {
                    params.delete('status');
                  } else {
                    params.set('status', value);
                  }
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  (value === 'all' && !searchParams.get('status')) || searchParams.get('status') === value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[80px]">Property:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('propertyId');
                params.delete('unitId'); // Clear unit filter when property changes
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                currentPropertyId === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {properties.map((property: any) => (
              <button
                key={property.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('propertyId', property.id);
                  params.delete('unitId'); // Clear unit filter when property changes
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  property.id === currentPropertyId
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {property.name}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Filter (only show if property is selected) */}
        {currentPropertyId !== 'all' && filteredUnits.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 min-w-[80px]">Unit:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('unitId');
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  currentUnitId === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Units
              </button>
              {filteredUnits.map((unit: any) => (
                <button
                  key={unit.id}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('unitId', unit.id);
                    setSearchParams(params);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    unit.id === currentUnitId ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {unit.unitNumber}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leases Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTableHeader column="tenant_name" label="Tenant" />
              <SortableTableHeader column="property_name" label="Property" />
              <NonSortableTableHeader label="Unit" />
              <SortableTableHeader column="start_date" label="Start Date" />
              <SortableTableHeader column="end_date" label="End Date" />
              <SortableTableHeader column="monthly_rent" label="Monthly Rent" />
              <SortableTableHeader column="status" label="Status" />
              <NonSortableTableHeader label="Actions" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leases.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                  No leases found. <Link to="/admin/leases/new" className="text-indigo-600 hover:text-indigo-700">Create your first lease</Link>
                </td>
              </tr>
            ) : (
              leases.map((lease: any) => (
                <tr key={lease.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/admin/leases/${lease.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">{lease.tenant?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lease.property?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{lease.property?.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lease.unit ? lease.unit.unitNumber : 'Entire Property'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(lease.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(lease.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(lease.monthlyRent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LeaseStatusBadge status={lease.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/leases/${lease.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaseStatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    pending_signature: 'bg-yellow-100 text-yellow-800',
    signed: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-gray-100 text-gray-800',
  };

  const labels = {
    draft: 'Draft',
    pending_signature: 'Pending Signature',
    signed: 'Signed',
    active: 'Active',
    expired: 'Expired',
    terminated: 'Terminated',
  };

  const colorClass = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
