import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { getTenants } from '~/lib/db.server';
import { formatPhoneNumber } from '@leaselab/shared-utils';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Tenants - LeaseLab.io' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const tenants = await getTenants(db, siteId);
  return json({ tenants });
}

export default function TenantsIndex() {
  const { tenants } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tenants found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Since</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {tenant.firstName} {tenant.lastName}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{tenant.email}</p>
                    <p className="text-sm text-gray-500">{formatPhoneNumber(tenant.phone)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/tenants/${tenant.id}`}
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
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-700' },
    evicted: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} capitalize`}>
      {status}
    </span>
  );
}
