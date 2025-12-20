import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, Form, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { requireAuth } from '~/lib/auth.server';
import {
    fetchUserFromWorker,
    fetchUserSitesFromWorker,
    grantSiteAccessToWorker,
    revokeSiteAccessToWorker,
    setSuperAdminStatusToWorker,
    updateUserRoleToWorker,
    updateUserPasswordToWorker
} from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { hashPassword } from '~/shared/utils';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
    const { id } = params;
    if (!id) throw new Response('Not found', { status: 404 });

    const siteId = getSiteId(request);
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };

    const currentUser = await requireAuth(request, workerEnv, secret, siteId);

    // Only super admins can edit users (previous policy)
    if (!currentUser.isSuperAdmin) {
        throw new Response('Unauthorized', { status: 403 });
    }

    const user = await fetchUserFromWorker(workerEnv, siteId, id);
    if (!user) {
        throw new Response('User not found', { status: 404 });
    }

    const siteAccess = await fetchUserSitesFromWorker(workerEnv, id);

    return json({ user, siteAccess, currentUser });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
    const { id } = params;
    if (!id) return json({ error: 'User ID required' }, { status: 400 });

    const siteId = getSiteId(request);
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };

    const currentUser = await requireAuth(request, workerEnv, secret, siteId);

    // Only super admins can edit users (previous policy)
    if (!currentUser.isSuperAdmin) {
        throw new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const action = formData.get('_action');

    if (action === 'toggle_super_admin') {
        const isSuperAdmin = formData.get('is_super_admin') === 'true';
        await setSuperAdminStatusToWorker(workerEnv, id, isSuperAdmin);
    } else if (action === 'update_role') {
        const role = formData.get('role') as string;
        await updateUserRoleToWorker(workerEnv, id, role);
    } else if (action === 'reset_password') {
        const password = formData.get('password') as string;

        // Password reset authorization rules:
        // - Super Admins can reset passwords for anyone
        // - Admins can reset passwords for non-admin users only
        const targetUser = await fetchUserFromWorker(workerEnv, siteId, id);

        if (!currentUser.isSuperAdmin) {
            // If current user is not super admin, check if target is admin
            if (targetUser.role === 'admin') {
                return json({ error: 'Only super admins can reset admin passwords' }, { status: 403 });
            }
        }

        const passwordHash = await hashPassword(password);
        await updateUserPasswordToWorker(workerEnv, siteId, id, passwordHash);
    } else if (action === 'grant_site_access') {
        const targetSiteId = formData.get('site_id') as string;
        // Default to 'viewer' role for least-privilege security
        const role = formData.get('access_role') as string || 'viewer';
        await grantSiteAccessToWorker(workerEnv, id, targetSiteId, role, currentUser.id);
    } else if (action === 'revoke_site_access') {
        const targetSiteId = formData.get('site_id') as string;
        await revokeSiteAccessToWorker(workerEnv, id, targetSiteId);
    }

    return redirect(`/admin/settings/users/${id}`);
}

export default function UserEdit() {
    const { user, siteAccess, currentUser } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [showPasswordReset, setShowPasswordReset] = useState(false);

    // Determine if current user can reset this user's password
    const canResetPassword = currentUser.isSuperAdmin ||
                            (user.role !== 'admin' && !user.isSuperAdmin);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
                <p className="text-gray-500">Manage user permissions and site access</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Info & Role */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm text-gray-500">Name</dt>
                            <dd className="text-sm font-medium text-gray-900">{user.name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">Email</dt>
                            <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500 mb-1">Role</dt>
                            <Form method="post" className="flex items-center gap-2">
                                <input type="hidden" name="_action" value="update_role" />
                                <select
                                    name="role"
                                    defaultValue={user.role}
                                    aria-label="User role"
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Update
                                </button>
                            </Form>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">Primary Site</dt>
                            <dd className="text-sm font-medium text-gray-900">{user.siteId}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">Created</dt>
                            <dd className="text-sm font-medium text-gray-900">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </dd>
                        </div>
                    </dl>

                    {/* Password Reset */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Password Reset</h3>
                        {canResetPassword ? (
                            !showPasswordReset ? (
                                <button
                                    onClick={() => setShowPasswordReset(true)}
                                    className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
                                >
                                    Reset Password
                                </button>
                            ) : (
                                <Form method="post" className="space-y-3">
                                    <input type="hidden" name="_action" value="reset_password" />
                                    <div>
                                        <label htmlFor="password" className="block text-sm text-gray-600 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            required
                                            minLength={8}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Resetting...' : 'Confirm Reset'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordReset(false)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </Form>
                            )
                        ) : (
                            <p className="text-sm text-gray-500">
                                Only super admins can reset admin passwords
                            </p>
                        )}
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>

                    {/* Super Admin Toggle */}
                    <Form method="post" className="mb-6">
                        <input type="hidden" name="_action" value="toggle_super_admin" />
                        <input
                            type="hidden"
                            name="is_super_admin"
                            value={user.isSuperAdmin ? 'false' : 'true'}
                        />
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">Super Admin</p>
                                <p className="text-sm text-gray-500">
                                    Can access all sites and manage other users
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${user.isSuperAdmin
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {user.isSuperAdmin ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </Form>

                    {/* Site Access */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Site Access</h3>
                        {siteAccess.length === 0 ? (
                            <p className="text-sm text-gray-500">No additional site access</p>
                        ) : (
                            <ul className="space-y-2">
                                {siteAccess.map((access) => (
                                    <li
                                        key={access.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{access.siteId}</p>
                                            <p className="text-xs text-gray-500">
                                                Granted {new Date(access.grantedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Form method="post">
                                            <input type="hidden" name="_action" value="revoke_site_access" />
                                            <input type="hidden" name="site_id" value={access.siteId} />
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                                            >
                                                Revoke
                                            </button>
                                        </Form>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Grant Access Form */}
                        <Form method="post" className="mt-4">
                            <input type="hidden" name="_action" value="grant_site_access" />
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    name="site_id"
                                    placeholder="Site ID"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                                <div className="flex gap-2">
                                    <select
                                        name="access_role"
                                        defaultValue="viewer"
                                        aria-label="Site access role"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Grant Access
                                    </button>
                                </div>
                            </div>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    );
}
