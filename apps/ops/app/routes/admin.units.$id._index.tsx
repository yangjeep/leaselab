import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useRouteLoaderData, Link, Form, useNavigation } from '@remix-run/react';
import { fetchUnitWithDetailsFromWorker, saveUnitToWorker, deleteUnitToWorker, fetchUnitHistoryFromWorker, fetchImagesFromWorker, createUnitHistoryToWorker } from '~/lib/worker-client';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import { canDelete } from '~/lib/permissions';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.unit ? `Unit ${data.unit.unitNumber} - LeaseLab.io` : 'Unit - LeaseLab.io' }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const { id } = params;

  if (!id) {
    throw new Response('Unit ID required', { status: 400 });
  }

  const unit = await fetchUnitWithDetailsFromWorker(workerEnv, siteId, id);

  if (!unit) {
    throw new Response('Unit not found', { status: 404 });
  }

  const history = await fetchUnitHistoryFromWorker(workerEnv, siteId, id);
  const images = await fetchImagesFromWorker(workerEnv, siteId, 'unit', id);

  return json({ unit, history, images });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const secret = context.cloudflare.env.SESSION_SECRET as string;
  const { id } = params;

  if (!id) {
    return json({ error: 'Unit ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    // Check permissions
    const user = await requireAuth(request, workerEnv, secret, siteId);
    if (!canDelete(user)) {
      return json({ error: 'Insufficient permissions to delete units' }, { status: 403 });
    }

    const unit = await fetchUnitWithDetailsFromWorker(workerEnv, siteId, id);
    await deleteUnitToWorker(workerEnv, siteId, id);
    return redirect(`/admin/properties/${unit?.propertyId}`);
  }

  if (intent === 'update') {
    const featuresStr = formData.get('features') as string;
    const features = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(Boolean) : [];

    const currentUnit = await fetchUnitWithDetailsFromWorker(workerEnv, siteId, id);
    const newStatus = formData.get('status') as string;
    const newRentAmount = parseFloat(formData.get('rentAmount') as string);

    // Track status change
    if (currentUnit && newStatus && newStatus !== currentUnit.status) {
      await createUnitHistoryToWorker(workerEnv, siteId, id, {
        eventType: 'status_change',
        eventData: {
          previousStatus: currentUnit.status,
          newStatus: newStatus,
        },
      });
    }

    // Track rent change
    if (currentUnit && newRentAmount && newRentAmount !== currentUnit.rentAmount) {
      await createUnitHistoryToWorker(workerEnv, siteId, id, {
        eventType: 'rent_change',
        eventData: {
          previousRent: currentUnit.rentAmount,
          newRent: newRentAmount,
        },
      });
    }

    await saveUnitToWorker(workerEnv, siteId, {
      id,
      unitNumber: formData.get('unitNumber') as string,
      name: formData.get('name') as string || undefined,
      bedrooms: parseInt(formData.get('bedrooms') as string),
      bathrooms: parseFloat(formData.get('bathrooms') as string),
      sqft: formData.get('sqft') ? parseInt(formData.get('sqft') as string) : undefined,
      rentAmount: newRentAmount,
      depositAmount: formData.get('depositAmount') ? parseFloat(formData.get('depositAmount') as string) : undefined,
      status: newStatus as 'available' | 'occupied' | 'maintenance' | 'pending',
      floor: formData.get('floor') ? parseInt(formData.get('floor') as string) : undefined,
      features,
      availableDate: formData.get('availableDate') as string || undefined,
      isActive: formData.get('isActive') === 'true',
    });

    return json({ success: true });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

export default function UnitDetail() {
  const { unit, history, images } = useLoaderData<typeof loader>();
  const adminData = useRouteLoaderData<typeof import('./admin').loader>('routes/admin');
  const user = adminData?.user || null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const userCanDelete = canDelete(user);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/admin/properties/${unit.propertyId}`} className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
            ← Back to {unit.property?.name || 'Property'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Unit {unit.unitNumber}</h1>
          {unit.name && <p className="text-sm text-gray-500">{unit.name}</p>}
        </div>
        <div>
          <StatusBadge status={unit.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Details Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Unit Details</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    name="unitNumber"
                    defaultValue={unit.unitNumber}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={unit.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    defaultValue={unit.bedrooms}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    defaultValue={unit.bathrooms}
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                  <input
                    type="number"
                    name="sqft"
                    defaultValue={unit.sqft || ''}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                  <input
                    type="number"
                    name="rentAmount"
                    defaultValue={unit.rentAmount}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit</label>
                  <input
                    type="number"
                    name="depositAmount"
                    defaultValue={unit.depositAmount || ''}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={unit.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <input
                    type="number"
                    name="floor"
                    defaultValue={unit.floor || ''}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
                  <input
                    type="date"
                    name="availableDate"
                    defaultValue={unit.availableDate || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
                <input
                  type="text"
                  name="features"
                  defaultValue={unit.features.join(', ')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={unit.isActive}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Active</label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                {userCanDelete ? (
                  <Form method="post" onSubmit={(e) => {
                    if (!confirm('Are you sure you want to delete this unit?')) {
                      e.preventDefault();
                    }
                  }}>
                    <input type="hidden" name="intent" value="delete" />
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Delete Unit
                    </button>
                  </Form>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                    title="Admin permission required"
                  >
                    Delete Unit
                  </button>
                )}
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
          {/* Current Tenant */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Tenant</h3>
            {unit.currentTenant ? (
              <div>
                <p className="font-medium text-gray-900">
                  {unit.currentTenant.firstName} {unit.currentTenant.lastName}
                </p>
                <p className="text-sm text-gray-500">{unit.currentTenant.email}</p>
                <p className="text-sm text-gray-500">{unit.currentTenant.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No tenant assigned</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Monthly Rent</span>
                <span className="font-medium">{formatCurrency(unit.rentAmount)}</span>
              </div>
              {unit.depositAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Deposit</span>
                  <span className="font-medium">{formatCurrency(unit.depositAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Size</span>
                <span className="font-medium">{unit.bedrooms}bd / {unit.bathrooms}ba</span>
              </div>
              {unit.sqft && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sq Ft</span>
                  <span className="font-medium">{unit.sqft.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Images</h3>
              <Link to={`/admin/units/${unit.id}/images`} className="text-xs text-indigo-600 hover:text-indigo-700">
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

      {/* Unit History */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No history records</p>
        ) : (
          <div className="space-y-3">
            {history.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {formatEventType(event.eventType)}
                  </p>
                  <p className="text-gray-500">
                    {formatEventData(event.eventType, event.eventData)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-green-100', text: 'text-green-700' },
    occupied: { bg: 'bg-blue-100', text: 'text-blue-700' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`text-sm px-3 py-1 rounded-full ${c.bg} ${c.text} capitalize`}>
      {status}
    </span>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    tenant_move_in: 'Tenant Moved In',
    tenant_move_out: 'Tenant Moved Out',
    rent_change: 'Rent Changed',
    status_change: 'Status Changed',
  };
  return labels[type] || type;
}

function formatEventData(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'tenant_move_in':
      return `${data.tenantName} moved in on ${data.moveInDate}`;
    case 'tenant_move_out':
      return `${data.tenantName} moved out on ${data.moveOutDate}`;
    case 'rent_change':
      return `Rent changed from $${data.previousRent} to $${data.newRent}`;
    case 'status_change':
      return `Status changed from ${data.previousStatus} to ${data.newStatus}`;
    default:
      return JSON.stringify(data);
  }
}
