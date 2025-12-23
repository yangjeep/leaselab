/**
 * Property Application List - Shows all applications for a specific property
 * Sorted by AI score with filtering capabilities
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { useMemo } from 'react';
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

  const orderedApplications = useMemo(() => {
    const rejected: any[] = [];
    const nonRejected: any[] = [];
    for (const application of applications) {
      if (application?.status === 'rejected') {
        rejected.push(application);
      } else {
        nonRejected.push(application);
      }
    }
    return [...nonRejected, ...rejected];
  }, [applications]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const activeView = searchParams.get('view') === 'shortlist' ? 'shortlist' : 'all';

  const visibleApplications = useMemo(() => {
    if (activeView === 'all') return orderedApplications;

    return orderedApplications.filter((app: any) => {
      if (app?.status === 'rejected') return false;
      const aiScore = typeof app?.aiScore === 'number' ? app.aiScore : null;
      const aiLabel = app?.aiLabel;
      const hasHighScore = aiScore !== null && aiScore >= 70;
      const hasGoodLabel = aiLabel === 'A' || aiLabel === 'B';
      const needsEvaluation = app?.status === 'documents_received' && (aiScore === null || aiScore === undefined);
      return hasHighScore || hasGoodLabel || needsEvaluation;
    });
  }, [activeView, orderedApplications]);

  const handleViewChange = (view: 'all' | 'shortlist') => {
    const params = new URLSearchParams(searchParams);
    if (view === 'shortlist') {
      params.set('view', 'shortlist');
    } else {
      params.delete('view');
    }
    setSearchParams(params);
  };

  const showClearFilters =
    filters.status ||
    filters.sortBy !== 'ai_score' ||
    filters.sortOrder !== 'desc';

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('status');
    params.delete('sortBy');
    params.delete('sortOrder');
    setSearchParams(params);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            to="/admin/applications"
            className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Properties
          </Link>
        </div>

        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-600 mt-1">
              {property.address}, {property.city}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {visibleApplications.length} application{visibleApplications.length !== 1 ? 's' : ''} •{' '}
              {activeView === 'shortlist' ? 'Shortlist' : 'All'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="inline-flex rounded-lg bg-gray-100 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => handleViewChange('all')}
                  className={[
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    activeView === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('shortlist')}
                  className={[
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    activeView === 'shortlist' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  Shortlist
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All</option>
                    <option value="new">New</option>
                    <option value="documents_pending">Docs Pending</option>
                    <option value="documents_received">Docs Received</option>
                    <option value="ai_evaluated">AI Evaluated</option>
                    <option value="screening">Background Check</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sort</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ai_score">AI Score</option>
                    <option value="created_at">Date Applied</option>
                    <option value="updated_at">Last Updated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="desc">High → Low</option>
                    <option value="asc">Low → High</option>
                  </select>
                </div>

                {showClearFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Applications */}
          {visibleApplications.length === 0 ? (
            <div className="text-center py-12">
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
                {filters.status || activeView === 'shortlist'
                  ? 'Try adjusting your filters'
                  : 'Applications will appear here once submitted'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Applicant</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">AI</th>
                    <th className="px-6 py-3">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleApplications.map((app: any) => (
                    <ApplicationRow key={app.id} application={app} propertyId={property.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({
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

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <Link
          to={`/admin/properties/${propertyId}/applications/${application.id}`}
          className="font-medium text-gray-900 hover:text-indigo-600"
        >
          {application.firstName} {application.lastName}
        </Link>
        <div className="text-sm text-gray-500 mt-1">{application.email}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {application.aiLabel && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${
                aiLabelColors[application.aiLabel] || 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              Grade {application.aiLabel}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${
              statusColors[application.status] || 'bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            {statusLabels[application.status] || application.status}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {application.aiScore !== null && application.aiScore !== undefined ? (
          <span className="font-medium text-gray-900">{Math.round(application.aiScore)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(application.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}
