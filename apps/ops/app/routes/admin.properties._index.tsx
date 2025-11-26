import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { getProperties, getUnitsByPropertyId, getImagesByEntity } from '~/lib/db.server';
import type { Property, Unit, PropertyImage } from '~/shared/types';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Properties - LeaseLab.io' }];
};

type PropertyWithStats = Property & {
  units: Unit[];
  images: (PropertyImage & { url: string })[];
  unitCount: number;
  occupiedCount: number;
  vacantCount: number;
  totalRent: number;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const properties = await getProperties(db, siteId);
  const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';

  // Fetch units and images for each property
  const propertiesWithStats: PropertyWithStats[] = await Promise.all(
    properties.map(async (property) => {
      const units = await getUnitsByPropertyId(db, siteId, property.id);
      const rawImages = await getImagesByEntity(db, siteId, 'property', property.id);

      const images = rawImages.map(img => ({
        ...img,
        url: baseUrl ? `${baseUrl}/${img.r2Key}` : `/api/images/${img.id}/file`,
      }));

      const occupiedCount = units.filter(u => u.status === 'occupied').length;
      const totalRent = units.reduce((sum, u) => sum + u.rentAmount, 0);

      return {
        ...property,
        units,
        images,
        unitCount: units.length,
        occupiedCount,
        vacantCount: units.filter(u => u.status === 'available').length,
        totalRent,
      };
    })
  );

  return json({ properties: propertiesWithStats });
}

export default function PropertiesIndex() {
  const { properties } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'list'; // Default to list view

  const toggleView = (newView: 'list' | 'cards') => {
    setSearchParams({ view: newView });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} properties · {properties.reduce((sum, p) => sum + p.unitCount, 0)} total units
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => toggleView('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => toggleView('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
          <Link
            to="/admin/properties/new"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Add Property
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          No properties found. Add your first property to get started.
        </div>
      ) : view === 'list' ? (
        <ListView properties={properties} />
      ) : (
        <CardView properties={properties} />
      )}
    </div>
  );
}

function ListView({ properties }: { properties: PropertyWithStats[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Property
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Units
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Occupancy
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {properties.map((property) => (
            <tr key={property.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                    {property.images.length > 0 ? (
                      <img
                        src={property.images.find(img => img.isCover)?.url || property.images[0]?.url}
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">🏠</div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{property.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{property.city}</div>
                <div className="text-sm text-gray-500">{property.province}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <PropertyTypeBadge type={property.propertyType} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className="font-medium">{property.unitCount}</span> total
                <div className="text-xs text-gray-500">
                  {property.vacantCount} vacant
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">
                        {property.unitCount > 0
                          ? Math.round((property.occupiedCount / property.unitCount) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${property.unitCount > 0 ? (property.occupiedCount / property.unitCount) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <ActiveBadge isActive={property.isActive} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  to={`/admin/properties/${property.id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardView({ properties }: { properties: PropertyWithStats[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <Link
          key={property.id}
          to={`/admin/properties/${property.id}`}
          className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="h-40 bg-gray-200 flex items-center justify-center relative">
            {property.images.length > 0 ? (
              <img
                src={property.images.find(img => img.isCover)?.url || property.images[0]?.url}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">🏠</span>
            )}
            <div className="absolute top-2 right-2">
              <PropertyTypeBadge type={property.propertyType} />
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
              <ActiveBadge isActive={property.isActive} />
            </div>
            <p className="text-sm text-gray-500 mb-3 truncate">
              {property.address}, {property.city}, {property.province}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">
                  <span className="font-medium">{property.unitCount}</span> units
                </span>
                <span className="text-gray-400">|</span>
                <span className={property.vacantCount > 0 ? 'text-green-600' : 'text-gray-600'}>
                  <span className="font-medium">{property.vacantCount}</span> vacant
                </span>
              </div>
            </div>
            {property.unitCount > 0 && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: `${(property.occupiedCount / property.unitCount) * 100}%` }}
                />
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function PropertyTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    single_family: 'Single Family',
    multi_family: 'Multi Family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    commercial: 'Commercial',
  };

  return (
    <span className="text-xs px-2 py-1 rounded-full bg-white/90 text-gray-700 shadow-sm">
      {labels[type] || type}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
      Active
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
      Inactive
    </span>
  );
}
