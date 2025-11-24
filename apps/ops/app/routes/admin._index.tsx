import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { getLeads, getProperties, getWorkOrders, getTenants } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  const [leads, properties, workOrders, tenants] = await Promise.all([
    getLeads(db, siteId, { limit: 5 }),
    getProperties(db, siteId),
    getWorkOrders(db, siteId, { status: 'open' }),
    getTenants(db, siteId),
  ]);

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    totalProperties: properties.length,
    availableProperties: properties.filter(p => p.isActive).length,
    openWorkOrders: workOrders.length,
    totalTenants: tenants.length,
  };

  return json({ stats, recentLeads: leads.slice(0, 5) });
}

export default function AdminDashboard() {
  const { stats, recentLeads } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          subtitle={`${stats.newLeads} new`}
          color="blue"
        />
        <StatCard
          title="Properties"
          value={stats.totalProperties}
          subtitle={`${stats.availableProperties} available`}
          color="green"
        />
        <StatCard
          title="Open Work Orders"
          value={stats.openWorkOrders}
          subtitle="Pending resolution"
          color="yellow"
        />
        <StatCard
          title="Active Tenants"
          value={stats.totalTenants}
          subtitle="Currently renting"
          color="purple"
        />
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
          <Link
            to="/admin/leads"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-gray-500 text-sm">No leads yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">AI Score</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="py-3">
                      <Link
                        to={`/admin/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {lead.firstName} {lead.lastName}
                      </Link>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{lead.email}</td>
                    <td className="py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3">
                      {lead.aiScore !== undefined ? (
                        <span className={`font-medium ${getScoreColor(lead.aiScore)}`}>
                          {lead.aiScore}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
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

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${colorClasses[color]}`}>
        {subtitle}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    documents_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Docs Pending' },
    documents_received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Docs Received' },
    ai_evaluating: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'AI Evaluating' },
    ai_evaluated: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'AI Evaluated' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}
