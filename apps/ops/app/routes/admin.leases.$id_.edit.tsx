import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect, unstable_parseMultipartFormData } from '@remix-run/cloudflare';
import { useLoaderData, Form, useNavigation, useActionData, Link } from '@remix-run/react';
import {
  fetchLeaseByIdFromWorker,
  fetchPropertiesFromWorker,
  fetchUnitsFromWorker,
  fetchTenantsFromWorker,
  updateLeaseToWorker,
} from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { useState } from 'react';
import { generateId } from '~/shared/utils';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Edit Lease' }];
  return [{ title: `Edit Lease - ${data.lease.tenant?.firstName} ${data.lease.tenant?.lastName}` }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  const [lease, properties, tenants] = await Promise.all([
    fetchLeaseByIdFromWorker(env, siteId, leaseId),
    fetchPropertiesFromWorker(env, siteId),
    fetchTenantsFromWorker(env, siteId),
  ]);

  if (!lease) {
    throw new Response('Lease not found', { status: 404 });
  }

  // Get units for the current property
  let units: any[] = [];
  if (lease.propertyId) {
    units = await fetchUnitsFromWorker(env, siteId, lease.propertyId);
  }

  return json({ lease, properties, tenants, units });
}

export async function action({ params, context, request }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  try {
    // Parse multipart form data for file upload
    const uploadHandler = async ({ name, data, filename, contentType }: any) => {
      if (name === 'leaseDocument' && filename) {
        // Upload to R2 PRIVATE_BUCKET
        const chunks: Uint8Array[] = [];
        for await (const chunk of data) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Generate R2 key
        const timestamp = Date.now();
        const randomId = generateId('file');
        const r2Key = `leases/${leaseId}/${timestamp}-${filename}`;

        // Upload to R2
        await env.PRIVATE_BUCKET.put(r2Key, fileBuffer, {
          httpMetadata: {
            contentType: contentType || 'application/pdf',
          },
        });

        return JSON.stringify({
          r2Key,
          filename,
          fileSize: fileBuffer.length,
          mimeType: contentType || 'application/pdf',
        });
      }
      // For other fields, return the value as string
      const chunks: Uint8Array[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString('utf-8');
    };

    const formData = await unstable_parseMultipartFormData(request, uploadHandler);

    // Extract lease data
    const propertyId = formData.get('propertyId') as string;
    const unitId = (formData.get('unitId') as string) || null;
    const tenantId = formData.get('tenantId') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const monthlyRent = parseFloat(formData.get('monthlyRent') as string);
    const securityDeposit = parseFloat(formData.get('securityDeposit') as string);
    const status = formData.get('status') as string;

    // Get file upload result
    const fileDataStr = formData.get('leaseDocument') as string;

    if (!fileDataStr) {
      return json({ error: 'Lease document PDF is required' }, { status: 400 });
    }

    const fileData = JSON.parse(fileDataStr);

    // Update the lease
    await updateLeaseToWorker(env, siteId, leaseId, {
      propertyId,
      unitId,
      tenantId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      status,
    });

    // Create lease file record
    const fileId = generateId('lease_file');
    await fetch(`${env.WORKER_URL}/api/ops/leases/${leaseId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.WORKER_INTERNAL_KEY as string,
        'X-Site-Id': siteId,
      },
      body: JSON.stringify({
        leaseId,
        fileType: 'lease_document',
        fileName: fileData.filename,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        r2Key: fileData.r2Key,
      }),
    });

    return redirect(`/admin/leases/${leaseId}`);
  } catch (error) {
    console.error('Error updating lease:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to update lease' },
      { status: 400 }
    );
  }
}

export default function EditLease() {
  const { lease, properties, tenants, units: initialUnits } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [selectedPropertyId, setSelectedPropertyId] = useState(lease.propertyId);
  const [units, setUnits] = useState<any[]>(initialUnits);

  // Fetch units when property changes
  const handlePropertyChange = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      // In a real implementation, you'd fetch units here
      // For now, we'll just clear the units if property changes
      const property = properties.find((p: any) => p.id === propertyId);
      setUnits(property?.units || []);
    } else {
      setUnits([]);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          to={`/admin/leases/${lease.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block"
        >
          ← Back to Lease
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Lease</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update lease details and upload a new signed lease document
        </p>
      </div>

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{actionData.error}</p>
        </div>
      )}

      <Form method="post" encType="multipart/form-data" className="bg-white rounded-xl shadow-sm p-6">
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
              defaultValue={lease.tenantId}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
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
              defaultValue={lease.propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
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
                defaultValue={lease.unitId || ''}
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
                defaultValue={lease.startDate.split('T')[0]}
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
                defaultValue={lease.endDate.split('T')[0]}
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
                  defaultValue={lease.monthlyRent}
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
                  defaultValue={lease.securityDeposit}
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
              defaultValue={lease.status}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="pending_signature">Pending Signature</option>
              <option value="signed">Signed</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          {/* Required Lease Document Upload */}
          <div className="border-t pt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="text-yellow-400 mr-3">⚠️</div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Updated Lease Document Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You must upload a new signed lease document (PDF) when editing a lease. This ensures all
                    lease changes are properly documented.
                  </p>
                </div>
              </div>
            </div>

            <label htmlFor="leaseDocument" className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Lease Document (PDF) *
            </label>
            <input
              type="file"
              id="leaseDocument"
              name="leaseDocument"
              accept=".pdf,application/pdf"
              required
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100
                cursor-pointer"
            />
            <p className="text-sm text-gray-500 mt-2">
              Only PDF files are accepted. Maximum file size: 10MB.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating Lease...' : 'Update Lease'}
            </button>
            <Link
              to={`/admin/leases/${lease.id}`}
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
