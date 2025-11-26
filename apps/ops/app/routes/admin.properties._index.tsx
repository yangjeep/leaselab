import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} properties · {properties.reduce((sum, p) => sum + p.unitCount, 0)} total units
          </p>
        </div>
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
                  {property.address}, {property.city}, {property.state}
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
      )}
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
