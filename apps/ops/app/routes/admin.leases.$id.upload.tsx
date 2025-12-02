import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, Link, Form, useNavigation } from '@remix-run/react';
import { fetchLeaseByIdFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { useState } from 'react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Upload Document' }];
  return [{ title: `Upload Document - ${data.lease.tenant?.firstName} ${data.lease.tenant?.lastName}` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  const lease = await fetchLeaseByIdFromWorker(workerEnv, siteId, leaseId);

  if (!lease) {
    throw new Response('Lease not found', { status: 404 });
  }

  return json({ lease });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const fileType = formData.get('fileType') as string;

  if (!file || file.size === 0) {
    return json({ error: 'Please select a file to upload' }, { status: 400 });
  }

  if (!fileType) {
    return json({ error: 'Please select a file type' }, { status: 400 });
  }

  // Create a new FormData for the worker request
  const workerFormData = new FormData();
  workerFormData.append('file', file);
  workerFormData.append('fileType', fileType);

  // Upload to worker
  const response = await fetch(`${workerEnv.WORKER_URL}/api/ops/leases/${leaseId}/files`, {
    method: 'POST',
    headers: {
      'X-Internal-Key': workerEnv.WORKER_INTERNAL_KEY,
      'X-Site-Id': siteId,
    },
    body: workerFormData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    return json({ error: error.message || 'Upload failed' }, { status: response.status });
  }

  return redirect(`/admin/leases/${leaseId}`);
}

export default function LeaseUpload() {
  const { lease } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isUploading = navigation.state === 'submitting';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/admin/leases/${lease.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block"
        >
          ← Back to Lease
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upload Lease Document</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lease for {lease.tenant?.firstName} {lease.tenant?.lastName}
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <Form method="post" encType="multipart/form-data">
          <div className="space-y-6">
            {/* File Type Selection */}
            <div>
              <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                id="fileType"
                name="fileType"
                required
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select document type...</option>
                <option value="lease_agreement">Lease Agreement</option>
                <option value="amendment">Amendment</option>
                <option value="addendum">Addendum</option>
                <option value="move_in_checklist">Move-in Checklist</option>
                <option value="move_out_checklist">Move-out Checklist</option>
                <option value="inspection_report">Inspection Report</option>
                <option value="notice">Notice</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                File *
              </label>
              <input
                type="file"
                id="file"
                name="file"
                required
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                Accepted formats: PDF, DOC, DOCX, PNG, JPG (Max 10MB)
              </p>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-700">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                to={`/admin/leases/${lease.id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
