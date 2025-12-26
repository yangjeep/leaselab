import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { fetchLeadsFromWorker, fetchPropertiesFromWorker, fetchWorkOrdersFromWorker, fetchTenantsFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  const [leads, properties, workOrders, tenants] = await Promise.all([
    fetchLeadsFromWorker(env, siteId),
    fetchPropertiesFromWorker(env, siteId),
    fetchWorkOrdersFromWorker(env, siteId),
    fetchTenantsFromWorker(env, siteId),
  ]);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const upcomingMoveIns = leads
    .filter((lead: any) => {
      if (!lead?.moveInDate) return false;
      if (lead.status === 'rejected') return false;
      const moveInTime = new Date(lead.moveInDate).getTime();
      if (Number.isNaN(moveInTime)) return false;
      return moveInTime >= now && moveInTime <= now + 14 * dayMs;
    })
    .sort((a: any, b: any) => new Date(a.moveInDate).getTime() - new Date(b.moveInDate).getTime())
    .slice(0, 5);

  const urgentWorkOrders = workOrders
    .filter((wo: any) => wo?.status !== 'completed' && wo?.status !== 'cancelled')
    .filter((wo: any) => wo?.priority === 'emergency' || wo?.priority === 'high')
    .sort((a: any, b: any) => {
      const priorityRank = (p: string) => (p === 'emergency' ? 0 : p === 'high' ? 1 : 2);
      const pr = priorityRank(a?.priority) - priorityRank(b?.priority);
      if (pr !== 0) return pr;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  const upcomingMoveOuts = tenants
    .filter((tenant: any) => {
      if (tenant?.status === 'moving_out') return true;
      const endDate = tenant?.currentLease?.endDate;
      if (!endDate) return false;
      const endTime = new Date(endDate).getTime();
      if (Number.isNaN(endTime)) return false;
      return endTime >= now && endTime <= now + 30 * dayMs;
    })
    .sort((a: any, b: any) => {
      const aTime = new Date(a?.currentLease?.endDate || a?.updatedAt || a?.createdAt).getTime();
      const bTime = new Date(b?.currentLease?.endDate || b?.updatedAt || b?.createdAt).getTime();
      return aTime - bTime;
    })
    .slice(0, 5);

  const vacancyProperties = properties
    .map((p: any) => {
      const computedVacant =
        typeof p?.vacantCount === 'number'
          ? p.vacantCount
          : Array.isArray(p?.units)
          ? p.units.filter((u: any) => u?.isActive !== false && u?.status === 'available').length
          : 0;
      return { ...p, _computedVacantCount: computedVacant };
    })
    .filter((p: any) => p._computedVacantCount > 0)
    .sort((a: any, b: any) => b._computedVacantCount - a._computedVacantCount)
    .slice(0, 5);

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    totalProperties: properties.length,
    availableProperties: properties.filter(p => p.isActive).length,
    openWorkOrders: workOrders.length,
    totalTenants: tenants.length,
  };

  return json({
    stats,
    recentLeads: leads.slice(0, 5),
    outstanding: {
      upcomingMoveIns,
      urgentWorkOrders,
      upcomingMoveOuts,
      vacancyProperties,
    },
  });
}

export default function AdminDashboard() {
  const { stats, recentLeads, outstanding } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Rental Applications"
          value={stats.totalLeads}
          subtitle={`${stats.newLeads} new`}
          color="blue"
          to="/admin/applications"
        />
        <StatCard
          title="Properties"
          value={stats.totalProperties}
          subtitle={`${stats.availableProperties} available`}
          color="green"
          to="/admin/properties"
        />
        <StatCard
          title="Open Work Orders"
          value={stats.openWorkOrders}
          subtitle="Pending resolution"
          color="yellow"
          to="/admin/work-orders"
        />
        <StatCard
          title="Active Tenants"
          value={stats.totalTenants}
          subtitle="Currently renting"
          color="purple"
          to="/admin/tenants"
        />
      </div>

      {/* Outstanding Priority Work */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <OutstandingCard
          title="Urgent Work Orders"
          subtitle="High & emergency priority"
          emptyText="No urgent work orders"
          to="/admin/work-orders?status=open"
          items={outstanding.urgentWorkOrders.map((wo: any) => ({
            key: wo.id,
            title: wo.title,
            meta: `${wo.priority} • ${wo.status}`,
            to: `/admin/work-orders/${wo.id}`,
          }))}
        />
        <OutstandingCard
          title="Upcoming Move-Ins"
          subtitle="Next 14 days"
          emptyText="No upcoming move-ins"
          to="/admin/applications"
          items={outstanding.upcomingMoveIns.map((lead: any) => ({
            key: lead.id,
            title: `${lead.firstName} ${lead.lastName}`.trim() || 'Applicant',
            meta: `${new Date(lead.moveInDate).toLocaleDateString()} • ${lead.status}`,
            to: lead.propertyId ? `/admin/properties/${lead.propertyId}/applications/${lead.id}` : '/admin/applications',
          }))}
        />
        <OutstandingCard
          title="Vacancies / Move-Outs"
          subtitle="Vacancies + upcoming lease ends"
          emptyText="No vacancies or move-outs"
          to="/admin/properties"
          items={[
            ...outstanding.vacancyProperties.map((p: any) => ({
              key: `vacancy:${p.id}`,
              title: p.name,
              meta: `${p._computedVacantCount} vacant`,
              to: `/admin/properties/${p.id}`,
            })),
            ...outstanding.upcomingMoveOuts.map((t: any) => ({
              key: `moveout:${t.id}`,
              title: `${t.firstName} ${t.lastName}`.trim() || 'Tenant',
              meta: t.currentLease?.endDate
                ? `Lease ends ${new Date(t.currentLease.endDate).toLocaleDateString()}`
                : 'Moving out',
              to: `/admin/tenants/${t.id}`,
            })),
          ].slice(0, 5)}
        />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
          <Link
            to="/admin/applications"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-gray-500 text-sm">No applications yet</p>
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
                        to={lead.propertyId ? `/admin/properties/${lead.propertyId}/applications/${lead.id}` : `/admin/applications`}
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
  to,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  to: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <Link
      to={to}
      className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${colorClasses[color]}`}>
        {subtitle}
      </p>
    </Link>
  );
}

function OutstandingCard({
  title,
  subtitle,
  items,
  emptyText,
  to,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  to: string;
  items: Array<{ key: string; title: string; meta: string; to: string }>;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <Link to={to} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="block rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.meta}</p>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
