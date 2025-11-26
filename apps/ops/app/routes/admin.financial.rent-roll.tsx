import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { getProperties, getUnitsByPropertyId, getTenants } from '~/lib/db.server';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Rent Roll - LeaseLab.io' }];
};

interface RentRollUnit {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  status: string;
  rentAmount: number;
  tenantName?: string;
  tenantId?: string;
  leaseStart?: string;
  leaseEnd?: string;
  squareFeet?: number;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  const [properties, tenants] = await Promise.all([
    getProperties(db, siteId),
    getTenants(db, siteId),
  ]);

  // Build comprehensive rent roll data
  const rentRoll: RentRollUnit[] = [];

  for (const property of properties) {
    const units = await getUnitsByPropertyId(db, siteId, property.id);

    for (const unit of units) {
      const tenant = tenants.find(t => t.unitId === unit.id);

      rentRoll.push({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        propertyId: property.id,
        propertyName: property.name,
        propertyAddress: `${property.address}, ${property.city}`,
        status: unit.status,
        rentAmount: unit.rentAmount,
        tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : undefined,
        tenantId: tenant?.id,
        leaseStart: tenant?.leaseStartDate,
        leaseEnd: tenant?.leaseEndDate,
        squareFeet: unit.squareFeet,
      });
    }
  }

  // Calculate totals
  const totalUnits = rentRoll.length;
  const occupiedUnits = rentRoll.filter(u => u.status === 'occupied').length;
  const vacantUnits = rentRoll.filter(u => u.status === 'available').length;
  const totalRent = rentRoll
    .filter(u => u.status === 'occupied')
    .reduce((sum, u) => sum + u.rentAmount, 0);
  const potentialRent = rentRoll.reduce((sum, u) => sum + u.rentAmount, 0);
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  return json({
    rentRoll,
    summary: {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      totalRent,
      potentialRent,
      occupancyRate,
    },
  });
}

export default function RentRoll() {
  const { rentRoll, summary } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          to="/admin/financial"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Financial
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Rent Roll</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete overview of all properties, units, and rent payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏢</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Total Units</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalUnits}</p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.occupiedUnits} occupied, {summary.vacantUnits} vacant
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              Current
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Total Monthly Rent</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalRent)}</p>
          <p className="text-xs text-gray-500 mt-1">From occupied units</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.occupancyRate.toFixed(1)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${summary.occupancyRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              Potential
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Potential Monthly Rent</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.potentialRent)}</p>
          <p className="text-xs text-gray-500 mt-1">At 100% occupancy</p>
        </div>
      </div>

      {/* Rent Roll Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lease Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sq Ft
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rentRoll.map((unit) => (
                <tr key={unit.unitId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/properties/${unit.propertyId}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {unit.propertyName}
                    </Link>
                    <p className="text-xs text-gray-500">{unit.propertyAddress}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{unit.unitNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    {unit.tenantId ? (
                      <Link
                        to={`/admin/tenants/${unit.tenantId}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        {unit.tenantName}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={unit.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(unit.rentAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {unit.leaseStart && unit.leaseEnd ? (
                      <div className="text-xs text-gray-500">
                        <div>{new Date(unit.leaseStart).toLocaleDateString()}</div>
                        <div>to {new Date(unit.leaseEnd).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {unit.squareFeet ? (
                      <span className="text-sm text-gray-600">{unit.squareFeet.toLocaleString()}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rentRoll.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No units found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    occupied: { bg: 'bg-green-100', text: 'text-green-700', label: 'Occupied' },
    available: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Available' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Maintenance' },
    reserved: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Reserved' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
