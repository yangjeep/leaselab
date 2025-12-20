import { NavLink, Outlet, useMatches } from '@remix-run/react';

function useIsSuperAdmin() {
  const matches = useMatches();
  const adminMatch = matches.find((match) => match.id === 'routes/admin');
  const user = (adminMatch?.data as any)?.user as { isSuperAdmin?: boolean } | undefined;
  return Boolean(user?.isSuperAdmin);
}

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium',
    isActive
      ? 'border-indigo-600 text-indigo-700'
      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
  ].join(' ');

export default function SettingsLayout() {
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <div className="flex flex-col min-h-0">
      <div className="border-b border-gray-200 bg-white px-8">
        <nav className="flex gap-6" aria-label="Settings Tabs">
          <NavLink to="/admin/settings/profile" className={tabClassName}>
            Profile
          </NavLink>
          {isSuperAdmin && (
            <NavLink to="/admin/settings/users" className={tabClassName}>
              Users
            </NavLink>
          )}
          <NavLink to="/admin/settings/storefront-theme" className={tabClassName}>
            Storefront Theme
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

