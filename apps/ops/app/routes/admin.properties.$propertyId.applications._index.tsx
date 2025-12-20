/**
 * Property Application List - Shows all applications for a specific property
 * Sorted by AI score with filtering capabilities
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams, useNavigate } from '@remix-run/react';
import { getSiteId } from '~/lib/site.server';
import { requireAuth } from '~/lib/auth.server';
import {
  fetchPropertyFromWorker,
  fetchPropertyApplicationsFromWorker,
} from '~/lib/worker-client';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const workerEnv = {
    WORKER_URL: env.WORKER_URL,
    WORKER_INTERNAL_KEY: env.WORKER_INTERNAL_KEY,
  };
  const secret = env.SESSION_SECRET as string;
  const hostnameSiteId = getSiteId(request);
  const user = await requireAuth(request, workerEnv, secret, hostnameSiteId);
  const siteId = user.siteId;
  const { propertyId } = params;

  if (!propertyId) {
    throw new Response('Property ID required', { status: 400 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'ai_score';
  const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  const [property, applications] = await Promise.all([
    fetchPropertyFromWorker(env, siteId, propertyId),
    fetchPropertyApplicationsFromWorker(env, siteId, propertyId, {
      status,
      sortBy,
      sortOrder,
    }),
  ]);

  return json({
    property,
    applications,
    filters: { status, sortBy, sortOrder },
  });
}

export default function PropertyApplicationList() {
  const { property, applications, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Filters Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="mb-6">
          <Link
            to="/admin/applications"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Properties
          </Link>
        </div>

        <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>

        <div className="space-y-4">
          {/* Stage Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              <option value="new">New</option>
              <option value="documents_pending">Documents Pending</option>
              <option value="documents_received">Documents Received</option>
              <option value="ai_evaluated">AI Evaluated</option>
              <option value="screening">Background Check</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ai_score">AI Score</option>
              <option value="created_at">Date Applied</option>
              <option value="updated_at">Last Updated</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.status || filters.sortBy !== 'ai_score' || filters.sortOrder !== 'desc') && (
          <button
            onClick={() => setSearchParams({})}
            className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </aside>

      {/* Application List */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-600 mt-1">
              {property.address}, {property.city}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Applications */}
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No applications found
              </h3>
              <p className="text-gray-500">
                {filters.status
                  ? 'Try adjusting your filters'
                  : 'Applications will appear here once submitted'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => (
                <ApplicationListItem
                  key={app.id}
                  application={app}
                  propertyId={property.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ApplicationListItem({
  application,
  propertyId,
}: {
  application: any;
  propertyId: string;
}) {
  const aiLabelColors: Record<string, string> = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    D: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    new: 'New',
    documents_pending: 'Docs Pending',
    documents_received: 'Docs Received',
    ai_evaluated: 'AI Evaluated',
    screening: 'Background Check',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <Link
      to={`/admin/properties/${propertyId}/applications/${application.id}`}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Name and Badges */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {application.firstName} {application.lastName}
            </h3>

            {application.aiLabel && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  aiLabelColors[application.aiLabel] || 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                Grade {application.aiLabel}
              </span>
            )}

            <span className="px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded text-xs font-medium">
              {statusLabels[application.status] || application.status}
            </span>
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {application.email}
            </span>

            {application.phone && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {application.phone}
              </span>
            )}

            <span className="text-gray-400">
              Applied {new Date(application.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* AI Score */}
        {application.aiScore !== null && application.aiScore !== undefined && (
          <div className="ml-4 text-right">
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(application.aiScore)}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">AI Score</div>
          </div>
        )}
      </div>
    </Link>
  );
}
