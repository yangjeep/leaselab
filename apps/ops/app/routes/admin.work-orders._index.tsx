import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { getWorkOrders } from '~/lib/db.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Work Orders - LeaseLab.io' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;

  const workOrders = await getWorkOrders(db, { status });
  return json({ workOrders });
}

export default function WorkOrdersIndex() {
  const { workOrders } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
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
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                (value === 'all' && !searchParams.get('status')) || searchParams.get('status') === value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
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
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{wo.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{wo.description}</p>
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
    open: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Open' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
    pending_parts: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pending Parts' },
    scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Scheduled' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700' },
    emergency: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[priority] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} capitalize`}>
      {priority}
    </span>
  );
}
