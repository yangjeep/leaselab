import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { fetchWorkOrdersFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { SortableTableHeader, NonSortableTableHeader } from '~/components/SortableTableHeader';

export const meta: MetaFunction = () => {
  return [{ title: 'Work Orders - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const url = new URL(request.url);

  // Default to "open_in_progress" if no status filter specified
  const statusFilter = url.searchParams.get('status') || 'open_in_progress';
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Map filter presets to actual status values
  let statusParam: string | undefined;
  if (statusFilter === 'open_in_progress') {
    statusParam = 'open,in_progress';
  } else if (statusFilter === 'all') {
    statusParam = undefined; // No filter
  } else {
    statusParam = statusFilter; // Single status (completed, cancelled, etc.)
  }

  const workOrders = await fetchWorkOrdersFromWorker(workerEnv, siteId, {
    status: statusParam,
    sortBy,
    sortOrder,
  });

  // Fetch counts for all statuses (for filter badges)
  const allWorkOrders = await fetchWorkOrdersFromWorker(workerEnv, siteId, {});
  const counts = {
    open: allWorkOrders.filter((wo: any) => wo.status === 'open').length,
    in_progress: allWorkOrders.filter((wo: any) => wo.status === 'in_progress').length,
    completed: allWorkOrders.filter((wo: any) => wo.status === 'completed').length,
    cancelled: allWorkOrders.filter((wo: any) => wo.status === 'cancelled').length,
    all: allWorkOrders.length,
  };

  return json({ workOrders, counts, currentFilter: statusFilter });
}

export default function WorkOrdersIndex() {
  const { workOrders, counts, currentFilter } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const statuses = [
    {
      value: 'open_in_progress',
      label: 'Open & In-Progress',
      count: counts.open + counts.in_progress,
    },
    { value: 'all', label: 'All', count: counts.all },
    { value: 'completed', label: 'Completed', count: counts.completed },
    { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        <Link
          to="/admin/work-orders/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Create Work Order
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[60px]">Status:</span>
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ value, label, count }) => {
              const isActive = currentFilter === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    if (value === 'open_in_progress') {
                      // Default filter, remove param
                      params.delete('status');
                    } else {
                      params.set('status', value);
                    }
                    setSearchParams(params);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{label}</span>
                  {count !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                        isActive
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {workOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No work orders found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader column="title" label="Title" />
                <SortableTableHeader column="propertyName" label="Property" />
                <SortableTableHeader column="unitNumber" label="Unit" />
                <SortableTableHeader column="tenantName" label="Tenant" />
                <SortableTableHeader column="category" label="Category" />
                <SortableTableHeader column="priority" label="Priority" />
                <SortableTableHeader column="status" label="Status" />
                <SortableTableHeader column="createdAt" label="Created" defaultSortOrder="desc" />
                <NonSortableTableHeader label="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map((wo: any) => (
                <tr key={wo.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/admin/work-orders/${wo.id}`}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{wo.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{wo.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{wo.propertyName || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{wo.unitNumber || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    {wo.tenantName ? (
                      <Link
                        to={`/admin/tenants/${wo.tenantId}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {wo.tenantName}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{wo.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={wo.priority} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={wo.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(wo.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/work-orders/${wo.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
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
  const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    open: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Open', icon: '🟡' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: '🔵' },
    pending_parts: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pending Parts', icon: '🟠' },
    scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Scheduled', icon: '🟣' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', icon: '🟢' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled', icon: '⚫' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status, icon: '⚪' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} font-medium`}>
      <span className="text-base leading-none">{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '▪' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '▪▪' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '▪▪▪' },
    emergency: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
    urgent: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
  };
  const c = config[priority] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '▪' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} font-medium capitalize`}>
      <span className="text-base leading-none">{c.icon}</span>
      <span>{priority}</span>
    </span>
  );
}
