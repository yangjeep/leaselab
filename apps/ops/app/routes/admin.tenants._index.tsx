import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { fetchTenantsFromWorker, fetchPropertiesFromWorker, fetchUnitsFromWorker } from '~/lib/worker-client';
import { formatPhoneNumber } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { SortableTableHeader, NonSortableTableHeader } from '~/components/SortableTableHeader';

export const meta: MetaFunction = () => {
  return [{ title: 'Tenants - LeaseLab.io' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const url = new URL(request.url);

  const status = url.searchParams.get('status') || undefined;
  const propertyId = url.searchParams.get('propertyId') || undefined;
  const unitId = url.searchParams.get('unitId') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const [tenants, properties, units] = await Promise.all([
    fetchTenantsFromWorker(env, siteId, { status, propertyId, sortBy, sortOrder }),
    fetchPropertiesFromWorker(env, siteId),
    fetchUnitsFromWorker(env, siteId, propertyId),
  ]);

  return json({ tenants, properties, units });
}

export default function TenantsIndex() {
  const { tenants, properties, units } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPropertyId = searchParams.get('propertyId') || 'all';
  const currentUnitId = searchParams.get('unitId') || 'all';

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'moving_in', label: 'Moving In' },
    { value: 'active', label: 'Active' },
    { value: 'lease_up', label: 'Lease Up' },
    { value: 'renewing', label: 'Renewing' },
    { value: 'moving_out', label: 'Moving Out' },
    { value: 'pending_n11', label: 'Pending N11' },
    { value: 'terminated', label: 'Terminated' },
  ];

  // Filter units based on selected property
  const filteredUnits = currentPropertyId !== 'all'
    ? units.filter(u => u.propertyId === currentPropertyId)
    : units;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <div className="text-sm text-gray-500">{tenants.length} tenants</div>
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
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${(value === 'all' && !searchParams.get('status')) || searchParams.get('status') === value
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
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPropertyId === 'all'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All Properties
            </button>
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('propertyId', property.id);
                  params.delete('unitId'); // Clear unit filter when property changes
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${searchParams.get('propertyId') === property.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {property.name}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Filter - Only show if property is selected */}
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
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentUnitId === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                All Units
              </button>
              {filteredUnits.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('unitId', unit.id);
                    setSearchParams(params);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${searchParams.get('unitId') === unit.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {unit.unitNumber}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tenants found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader column="firstName" label="Name" />
                <SortableTableHeader column="propertyName" label="Property / Unit" />
                <SortableTableHeader column="email" label="Contact" />
                <SortableTableHeader column="status" label="Status" />
                <SortableTableHeader column="activeWorkOrderCount" label="Work Orders" defaultSortOrder="desc" />
                <SortableTableHeader column="createdAt" label="Since" defaultSortOrder="desc" />
                <NonSortableTableHeader label="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => {
                const hasActiveWorkOrders = tenant.activeWorkOrderCount && tenant.activeWorkOrderCount > 0;
                return (
                  <tr
                    key={tenant.id}
                    className={`hover:bg-gray-50 ${hasActiveWorkOrders ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {tenant.firstName} {tenant.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {tenant.property?.name || '—'}
                      </p>
                      {tenant.unit && (
                        <p className="text-sm text-gray-500">
                          Unit {tenant.unit.unitNumber}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{tenant.email}</p>
                      <p className="text-sm text-gray-500">{formatPhoneNumber(tenant.phone)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-6 py-4">
                      {hasActiveWorkOrders ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {tenant.activeWorkOrderCount} active
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/tenants/${tenant.id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
    evicted: { bg: 'bg-red-100', text: 'text-red-700', label: 'Evicted' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
