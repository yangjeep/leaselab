import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { getProperties } from '~/lib/db.server';
import { formatCurrency } from '@leaselab/shared-utils';

export const meta: MetaFunction = () => {
  return [{ title: 'Properties - LeaseLab.io' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const properties = await getProperties(db);
  return json({ properties });
}

export default function PropertiesIndex() {
  const { properties } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <Link
          to="/admin/properties/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Add Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          No properties found. Add your first property to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link
              key={property.id}
              to={`/admin/properties/${property.id}`}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gray-200 flex items-center justify-center">
                {property.images[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🏠</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{property.name}</h3>
                  <StatusBadge status={property.status} />
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {property.address}, {property.city}, {property.state}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-indigo-600">
                    {formatCurrency(property.rent)}/mo
                  </span>
                  <span className="text-gray-500">
                    {property.bedrooms}bd / {property.bathrooms}ba
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-green-100', text: 'text-green-700' },
    rented: { bg: 'bg-blue-100', text: 'text-blue-700' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} capitalize`}>
      {status}
    </span>
  );
}
