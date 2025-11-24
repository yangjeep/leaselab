import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Outlet, Link, useLocation, useLoaderData, Form } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.server';
import { getSiteId } from '~/lib/site.server';
import { getUserAccessibleSites, type AccessibleSite } from '~/lib/db.server';
import { SiteSwitcher } from '~/components/SiteSwitcher';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const kv = context.cloudflare.env.SESSION_STORE;
  const siteId = getSiteId(request);

  const user = await requireAuth(request, db, kv, siteId);

  // Get available sites for super admins
  let availableSites: AccessibleSite[] = [];
  if (user.isSuperAdmin) {
    availableSites = await getUserAccessibleSites(db, user.id);
  }

  return json({ user, currentSite: siteId, availableSites });
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/leads', label: 'Leads', icon: '👤' },
  { path: '/admin/properties', label: 'Properties', icon: '🏠' },
  { path: '/admin/tenants', label: 'Tenants', icon: '🔑' },
  { path: '/admin/work-orders', label: 'Work Orders', icon: '🔧' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, currentSite, availableSites } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">
            Lease<span className="text-indigo-600">Lab</span>.io
          </h1>
          {/* Site switcher for super admins */}
          {user.isSuperAdmin && availableSites.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Active Site
              </label>
              <SiteSwitcher currentSite={currentSite} availableSites={availableSites} />
            </div>
          )}
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
