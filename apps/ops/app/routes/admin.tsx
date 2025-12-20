import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Outlet, Link, useLocation, useLoaderData, Form, useNavigate, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.server';
import { getSiteId } from '~/lib/site.server';
import { fetchUserSitesFromWorker } from '~/lib/worker-client';
import { SiteSwitcher } from '~/components/SiteSwitcher';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const secret = context.cloudflare.env.SESSION_SECRET as string;
  const siteId = getSiteId(request);

  const user = await requireAuth(request, workerEnv, secret, siteId);

  // Get available sites for this user (used by the sidebar switcher)
  let availableSites: any[] = [];
  try {
    availableSites = await fetchUserSitesFromWorker(workerEnv, user.id);
  } catch {
    availableSites = [];
  }

  return json({ user, currentSite: siteId, availableSites });
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/applications', label: 'Applications', icon: '📝' },
  { path: '/admin/properties', label: 'Properties', icon: '🏠' },
  { path: '/admin/tenants', label: 'Tenants', icon: '🔑' },
  { path: '/admin/leases', label: 'Leases', icon: '📋' },
  { path: '/admin/financial', label: 'Financial', icon: '💰' },
  { path: '/admin/work-orders', label: 'Work Orders', icon: '🔧' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, currentSite, availableSites } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <div className="flex flex-1 min-h-0 bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-white shadow-sm self-stretch border-r border-gray-200/70">
        <div className="p-6 border-b border-gray-200/70 flex-shrink-0">
          <Link to="/admin" className="block">
            <h1 className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors cursor-pointer">
              Lease<span className="text-indigo-600">Lab</span>.io
            </h1>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Active Site
            </label>
            <SiteSwitcher currentSite={currentSite} availableSites={availableSites} />
          </div>
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

        <div className="mt-auto flex-shrink-0 border-t border-gray-200/70 p-4" data-testid="sidebar-user-profile">
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
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorStatus = 500;
  let errorTitle = 'Something went wrong';
  let errorMessage = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.data?.message || error.statusText;

    if (errorStatus === 404) {
      errorTitle = 'Page Not Found';
      errorMessage = 'The page you\'re looking for doesn\'t exist or hasn\'t been created yet.';
    } else if (errorStatus === 403) {
      errorTitle = 'Access Denied';
      errorMessage = 'You don\'t have permission to access this page.';
    } else if (errorStatus === 500) {
      errorTitle = 'Server Error';
      errorMessage = 'Something went wrong on our end. Please try again later.';
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="flex flex-1 min-h-0 bg-gray-100">
      {/* Sidebar - minimal version */}
      <aside className="flex w-64 flex-col bg-white shadow-sm self-stretch border-r border-gray-200/70">
        <div className="p-6 border-b border-gray-200/70">
          <Link to="/admin">
            <h1 className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors cursor-pointer">
              Lease<span className="text-indigo-600">Lab</span>.io
            </h1>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Error content */}
      <main className="flex-1 min-h-0 overflow-auto flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {errorStatus === 404 ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                )}
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{errorStatus}</h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{errorTitle}</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Go Back
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
