import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { getProperties, getUnitsByPropertyId, getTenants } from '~/lib/db.server';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Financial Overview - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  const [properties, tenants] = await Promise.all([
    getProperties(db, siteId),
    getTenants(db, siteId),
  ]);

  // Calculate financial metrics
  let totalMonthlyRent = 0;
  let totalOccupied = 0;
  let totalUnits = 0;

  for (const property of properties) {
    const units = await getUnitsByPropertyId(db, siteId, property.id);
    totalUnits += units.length;
    for (const unit of units) {
      if (unit.status === 'occupied') {
        totalMonthlyRent += unit.rentAmount;
        totalOccupied++;
      }
    }
  }

  const occupancyRate = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;

  return json({
    totalMonthlyRent,
    totalOccupied,
    totalUnits,
    occupancyRate,
    activeTenants: tenants.length,
  });
}

export default function FinancialIndex() {
  const { totalMonthlyRent, totalOccupied, totalUnits, occupancyRate, activeTenants } = useLoaderData<typeof loader>();

  const financialSections = [
    {
      title: 'Rent Roll',
      description: 'View all properties, units, and current rent payments',
      icon: '📋',
      link: '/admin/financial/rent-roll',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Payments',
      description: 'Track rent payments, due dates, and payment history',
      icon: '💳',
      link: '/admin/financial/payments',
      color: 'bg-green-50 text-green-700',
      comingSoon: true,
    },
    {
      title: 'Invoices',
      description: 'Generate and manage rental invoices',
      icon: '🧾',
      link: '/admin/financial/invoices',
      color: 'bg-purple-50 text-purple-700',
      comingSoon: true,
    },
    {
      title: 'Reports',
      description: 'Financial reports and analytics',
      icon: '📊',
      link: '/admin/financial/reports',
      color: 'bg-orange-50 text-orange-700',
      comingSoon: true,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage rent, payments, and financial reporting
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              Monthly
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Total Rent (Occupied)</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthlyRent)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏠</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{occupancyRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{totalOccupied} of {totalUnits} units</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Active Tenants</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeTenants}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              Potential
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Revenue Potential</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalMonthlyRent / (occupancyRate / 100))}
          </p>
          <p className="text-xs text-gray-500 mt-1">At 100% occupancy</p>
        </div>
      </div>

      {/* Financial Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {financialSections.map((section) => (
          <Link
            key={section.title}
            to={section.link}
            className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ${
              section.comingSoon ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center text-2xl`}>
                {section.icon}
              </div>
              {section.comingSoon && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  Coming Soon
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
            {!section.comingSoon && (
              <div className="mt-4 flex items-center text-sm text-indigo-600 font-medium">
                View {section.title}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
