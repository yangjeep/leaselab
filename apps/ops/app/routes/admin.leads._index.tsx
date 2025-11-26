import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { getLeads } from '~/lib/db.server';
import { formatCurrency } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Leads - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const url = new URL(request.url);

  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'aiScore';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const leads = await getLeads(db, siteId, { status, sortBy, sortOrder });

  return json({ leads });
}

export default function LeadsIndex() {
  const { leads } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'ai_evaluated', label: 'AI Evaluated' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
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

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leads found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Applicant</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Income</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">AI Score</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{lead.employmentStatus}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{lead.email}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(lead.monthlyIncome)}/mo
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
              ))}
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
