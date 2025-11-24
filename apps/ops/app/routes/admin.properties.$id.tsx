import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link, Form, useNavigation } from '@remix-run/react';
import { getPropertyWithUnits, updateProperty, deleteProperty, getImagesByEntity } from '~/lib/db.server';
import { formatCurrency } from '@leaselab/shared-utils';
import type { Property, Unit, PropertyImage } from '@leaselab/shared-types';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.property ? `${data.property.name} - LeaseLab.io` : 'Property - LeaseLab.io' }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    throw new Response('Property ID required', { status: 400 });
  }

  const property = await getPropertyWithUnits(db, siteId, id);

  if (!property) {
    throw new Response('Property not found', { status: 404 });
  }

  return json({ property });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ error: 'Property ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await deleteProperty(db, siteId, id);
    return redirect('/admin/properties');
  }

  if (intent === 'update') {
    const amenitiesStr = formData.get('amenities') as string;
    const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()).filter(Boolean) : [];

    await updateProperty(db, siteId, id, {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      propertyType: formData.get('propertyType') as string,
      description: formData.get('description') as string || undefined,
      yearBuilt: formData.get('yearBuilt') ? parseInt(formData.get('yearBuilt') as string) : undefined,
      lotSize: formData.get('lotSize') ? parseFloat(formData.get('lotSize') as string) : undefined,
      amenities,
      isActive: formData.get('isActive') === 'true',
    });

    return json({ success: true });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

export default function PropertyDetail() {
  const { property } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const units = property.units || [];
  const images = property.images || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/properties" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
            ← Back to Properties
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <p className="text-sm text-gray-500">{property.address}, {property.city}, {property.state} {property.zipCode}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/properties/${property.id}/units/new`}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Add Unit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property Details Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={property.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    name="propertyType"
                    defaultValue={property.propertyType}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="single_family">Single Family</option>
                    <option value="multi_family">Multi Family</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={property.address}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={property.city}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    defaultValue={property.state}
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    defaultValue={property.zipCode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={property.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                  <input
                    type="number"
                    name="yearBuilt"
                    defaultValue={property.yearBuilt || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lot Size (sq ft)</label>
                  <input
                    type="number"
                    name="lotSize"
                    defaultValue={property.lotSize || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  name="amenities"
                  defaultValue={property.amenities.join(', ')}
                  placeholder="Pool, Gym, Parking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={property.isActive}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Active</label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Form method="post" onSubmit={(e) => {
                  if (!confirm('Are you sure you want to delete this property?')) {
                    e.preventDefault();
                  }
                }}>
                  <input type="hidden" name="intent" value="delete" />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Delete Property
                  </button>
                </Form>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </Form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Units</span>
                <span className="text-sm font-medium">{units.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Occupied</span>
                <span className="text-sm font-medium">{units.filter(u => u.status === 'occupied').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Vacant</span>
                <span className="text-sm font-medium text-green-600">{units.filter(u => u.status === 'available').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Monthly Rent</span>
                <span className="text-sm font-medium">{formatCurrency(units.reduce((sum, u) => sum + u.rentAmount, 0))}</span>
              </div>
            </div>
          </div>

          {/* Images Preview */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Images</h3>
              <Link to={`/admin/properties/${property.id}/images`} className="text-xs text-indigo-600 hover:text-indigo-700">
                Manage
              </Link>
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, 6).map((image) => (
                  <div key={image.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No images uploaded</p>
            )}
          </div>
        </div>
      </div>

      {/* Units List */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Units</h2>
          <Link
            to={`/admin/properties/${property.id}/units/new`}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            + Add Unit
          </Link>
        </div>

        {units.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No units added yet. Add your first unit to start tracking tenants and rent.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <th className="pb-3 pr-4">Unit</th>
                  <th className="pb-3 pr-4">Beds/Baths</th>
                  <th className="pb-3 pr-4">Sq Ft</th>
                  <th className="pb-3 pr-4">Rent</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{unit.unitNumber}</div>
                      {unit.name && <div className="text-xs text-gray-500">{unit.name}</div>}
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-600">
                      {unit.bedrooms}bd / {unit.bathrooms}ba
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-600">
                      {unit.sqft ? `${unit.sqft.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">
                      {formatCurrency(unit.rentAmount)}
                    </td>
                    <td className="py-3 pr-4">
                      <UnitStatusBadge status={unit.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/units/${unit.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UnitStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-green-100', text: 'text-green-700' },
    occupied: { bg: 'bg-blue-100', text: 'text-blue-700' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} capitalize`}>
      {status}
    </span>
  );
}
