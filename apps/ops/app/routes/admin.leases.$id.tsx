import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useRouteLoaderData, Link, useSubmit, Form } from '@remix-run/react';
import {
  fetchLeaseByIdFromWorker,
  fetchLeaseFilesFromWorker,
  updateLeaseToWorker,
  deleteLeaseToWorker,
  deleteLeaseFileToWorker,
} from '~/lib/worker-client';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import { canDelete } from '~/lib/permissions';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Lease Not Found' }];
  return [{ title: `Lease - ${data.lease.tenant?.firstName} ${data.lease.tenant?.lastName}` }];
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

  const [lease, files] = await Promise.all([
    fetchLeaseByIdFromWorker(workerEnv, siteId, leaseId),
    fetchLeaseFilesFromWorker(workerEnv, siteId, leaseId),
  ]);

  if (!lease) {
    throw new Response('Lease not found', { status: 404 });
  }

  return json({ lease, files });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const secret = context.cloudflare.env.SESSION_SECRET as string;
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'delete') {
    const user = await requireAuth(request, workerEnv, secret, siteId);
    if (!canDelete(user)) {
      return json({ error: 'Insufficient permissions to delete leases' }, { status: 403 });
    }
    await deleteLeaseToWorker(workerEnv, siteId, leaseId);
    return redirect('/admin/leases');
  }

  if (action === 'updateStatus') {
    const status = formData.get('status') as string;
    await updateLeaseToWorker(workerEnv, siteId, leaseId, { status });
    return json({ success: true });
  }

  if (action === 'deleteFile') {
    const fileId = formData.get('fileId') as string;
    await deleteLeaseFileToWorker(workerEnv, siteId, leaseId, fileId);
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function LeaseDetail() {
  const { lease, files } = useLoaderData<typeof loader>();
  const adminData = useRouteLoaderData<typeof import('./admin').loader>('routes/admin');
  const user = adminData?.user || null;
  const submit = useSubmit();
  const userCanDelete = canDelete(user);

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData();
    formData.append('_action', 'updateStatus');
    formData.append('status', newStatus);
    submit(formData, { method: 'post' });
  };

  const handleFileDelete = (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    const formData = new FormData();
    formData.append('_action', 'deleteFile');
    formData.append('fileId', fileId);
    submit(formData, { method: 'post' });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/leases" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to Leases
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lease: {lease.tenant?.firstName} {lease.tenant?.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Lease ID: {lease.id}</p>
          </div>
          <Link
            to={`/admin/leases/${lease.id}/edit`}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Edit Lease
          </Link>
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Status</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-700">Current Status:</span>
          <LeaseStatusBadge status={lease.status} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Update Status:</label>
          <select
            onChange={(e) => handleStatusChange(e.target.value)}
            value={lease.status}
            className="block w-full max-w-xs rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="draft">Draft</option>
            <option value="pending_signature">Pending Signature</option>
            <option value="signed">Signed</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Details</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Property</dt>
              <dd className="text-sm text-gray-900 mt-1">{lease.property?.name || 'N/A'}</dd>
              <dd className="text-sm text-gray-500">{lease.property?.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Unit</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {lease.unit ? lease.unit.unitNumber : 'Entire Property'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900 mt-1">{new Date(lease.startDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="text-sm text-gray-900 mt-1">{new Date(lease.endDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
              <dd className="text-sm text-gray-900 mt-1">{formatCurrency(lease.monthlyRent)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
              <dd className="text-sm text-gray-900 mt-1">{formatCurrency(lease.securityDeposit)}</dd>
            </div>
          </dl>
        </div>

        {/* Tenant Information */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {lease.tenant?.firstName} {lease.tenant?.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`mailto:${lease.tenant?.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {lease.tenant?.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <a href={`tel:${lease.tenant?.phone}`} className="text-indigo-600 hover:text-indigo-700">
                  {lease.tenant?.phone}
                </a>
              </dd>
            </div>
            <div>
              <Link
                to={`/admin/tenants/${lease.tenant?.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View Tenant Details →
              </Link>
            </div>
          </dl>
        </div>
      </div>

      {/* Lease Files */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lease Documents</h2>
          <Link
            to={`/admin/leases/${lease.id}/upload`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Upload Document
          </Link>
        </div>
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No documents uploaded yet.{' '}
            <Link to={`/admin/leases/${lease.id}/upload`} className="text-indigo-600 hover:text-indigo-700">
              Upload your first document
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file: any) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">📄</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {file.fileType.replace(/_/g, ' ')} • {(file.fileSize / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFileDelete(file.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Lease */}
      {userCanDelete && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Deleting a lease is permanent and cannot be undone. All associated files will also be deleted.
          </p>
          <Form method="post" onSubmit={(e) => !confirm('Are you sure you want to delete this lease?') && e.preventDefault()}>
            <input type="hidden" name="_action" value="delete" />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              Delete Lease
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}

function LeaseStatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    pending_signature: 'bg-yellow-100 text-yellow-800',
    signed: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-gray-100 text-gray-800',
  };

  const labels = {
    draft: 'Draft',
    pending_signature: 'Pending Signature',
    signed: 'Signed',
    active: 'Active',
    expired: 'Expired',
    terminated: 'Terminated',
  };

  const colorClass = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
