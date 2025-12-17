import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, Form, useNavigation, useActionData, Link } from '@remix-run/react';
import {
  fetchPropertiesFromWorker,
  fetchUnitsFromWorker,
  fetchTenantsFromWorker,
  createLeaseToWorker,
} from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [{ title: 'Create New Lease - LeaseLab.io' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  const [properties, tenants] = await Promise.all([
    fetchPropertiesFromWorker(env, siteId),
    fetchTenantsFromWorker(env, siteId),
  ]);

  return json({ properties, tenants });
}

export async function action({ context, request }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const formData = await request.formData();

  const propertyId = formData.get('propertyId') as string;
  const unitId = (formData.get('unitId') as string) || undefined;
  const tenantId = formData.get('tenantId') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const monthlyRent = parseFloat(formData.get('monthlyRent') as string);
  const securityDeposit = parseFloat(formData.get('securityDeposit') as string);
  const status = (formData.get('status') as string) || 'draft';

  try {
    const lease = await createLeaseToWorker(env, siteId, {
      propertyId,
      unitId,
      tenantId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      status,
    });

    return redirect(`/admin/leases/${lease.id}`);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to create lease' }, { status: 400 });
  }
}

export default function NewLease() {
  const { properties, tenants } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [units, setUnits] = useState<any[]>([]);

  // Fetch units when property is selected
  const handlePropertyChange = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      // You'll need to add this to worker-client or fetch here
      // For now, filter from property data
      const property = properties.find((p: any) => p.id === propertyId);
      setUnits(property?.units || []);
    } else {
      setUnits([]);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/admin/leases" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to Leases
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Lease</h1>
      </div>

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{actionData.error}</p>
        </div>
      )}

      <Form method="post" className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-6">
          {/* Tenant Selection */}
          <div>
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant *
            </label>
            <select
              id="tenantId"
              name="tenantId"
              required
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select a tenant</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.firstName} {tenant.lastName} - {tenant.email}
                </option>
              ))}
            </select>
          </div>

          {/* Property Selection */}
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-2">
              Property *
            </label>
            <select
              id="propertyId"
              name="propertyId"
              required
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select a property</option>
              {properties.map((property: any) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Selection (Optional) */}
          {selectedPropertyId && units.length > 0 && (
            <div>
              <label htmlFor="unitId" className="block text-sm font-medium text-gray-700 mb-2">
                Unit (Optional)
              </label>
              <select
                id="unitId"
                name="unitId"
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Entire Property</option>
                {units.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitNumber} - {unit.bedrooms} bed, {unit.bathrooms} bath
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                required
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                required
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Rent *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="monthlyRent"
                  name="monthlyRent"
                  required
                  min="0"
                  step="0.01"
                  className="block w-full pl-8 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="securityDeposit"
                  name="securityDeposit"
                  required
                  min="0"
                  step="0.01"
                  className="block w-full pl-8 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="draft"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="pending_signature">Pending Signature</option>
              <option value="signed">Signed</option>
              <option value="active">Active</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Lease'}
            </button>
            <Link
              to="/admin/leases"
              className="px-6 py-2 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100"
            >
              Cancel
            </Link>
          </div>
        </div>
      </Form>
    </div>
  );
}
