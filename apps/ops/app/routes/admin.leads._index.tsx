import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { fetchLeadsFromWorker, fetchPropertiesFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { SortableTableHeader, NonSortableTableHeader } from '~/components/SortableTableHeader';

export const meta: MetaFunction = () => {
  return [{ title: 'Rental Applications - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const url = new URL(request.url);

  const status = url.searchParams.get('status') || undefined;
  const propertyId = url.searchParams.get('propertyId') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'aiScore';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const [leads, properties] = await Promise.all([
    fetchLeadsFromWorker(env, siteId, {
      status,
      propertyId,
      sortBy,
      sortOrder,
    }),
    fetchPropertiesFromWorker(env, siteId),
  ]);

  return json({ leads, properties });
}

export default function LeadsIndex() {
  const { leads, properties } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPropertyId = searchParams.get('propertyId') || 'all';

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'ai_evaluated', label: 'AI Evaluated' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Create property map for quick lookup
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rental Applications</h1>
        <div className="text-sm text-gray-500">{leads.length} applications</div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[80px]">Status:</span>
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (value === 'all') {
                    params.delete('status');
                  } else {
                    params.set('status', value);
                  }
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${(value === 'all' && !searchParams.get('status')) || searchParams.get('status') === value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[80px]">Property:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('propertyId');
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPropertyId === 'all'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All Properties
            </button>
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('propertyId', property.id);
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${searchParams.get('propertyId') === property.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {property.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No applications found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader column="firstName" label="Applicant" />
                <SortableTableHeader column="propertyName" label="Property" />
                <SortableTableHeader column="email" label="Contact" />
                <NonSortableTableHeader label="Notes" />
                <SortableTableHeader column="status" label="Status" />
                <SortableTableHeader column="aiScore" label="AI Score" defaultSortOrder="desc" />
                <SortableTableHeader column="createdAt" label="Date" defaultSortOrder="desc" />
                <NonSortableTableHeader label="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const property = propertyMap.get(lead.propertyId);
                const isOccupied = lead.isUnitOccupied;
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 ${isOccupied ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{lead.employmentStatus}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{property?.name || '—'}</p>
                        {isOccupied && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                            Currently Occupied
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{lead.email}</p>
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {lead.landlordNote ? lead.landlordNote : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4">
                      {lead.aiScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(lead.aiScore)}`}>
                            {lead.aiScore}
                          </span>
                          {lead.aiLabel && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getLabelColor(lead.aiLabel)}`}>
                              {lead.aiLabel}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/leads/${lead.id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    documents_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Docs Pending' },
    documents_received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Docs Received' },
    ai_evaluating: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'AI Evaluating' },
    ai_evaluated: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'AI Evaluated' },
    screening: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Screening' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  };

  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getLabelColor(label: string): string {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-red-100 text-red-700',
  };
  return colors[label] || 'bg-gray-100 text-gray-700';
}
