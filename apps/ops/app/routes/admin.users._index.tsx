import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, Link, Form, useNavigation, useActionData, useSearchParams } from '@remix-run/react';
import { useState, useMemo } from 'react';
import { requireAuth } from '~/lib/auth.server';
import { fetchUsersFromWorker, createUserToWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { SortableTableHeader, NonSortableTableHeader } from '~/components/SortableTableHeader';

export async function loader({ request, context }: LoaderFunctionArgs) {
    const siteId = getSiteId(request);
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };

    const currentUser = await requireAuth(request, workerEnv, secret, siteId);

    // Only super admins can view user list
    if (!currentUser.isSuperAdmin) {
        throw new Response('Unauthorized', { status: 403 });
    }

    try {
        const users = await fetchUsersFromWorker(workerEnv);
        return json({ users, currentSiteId: siteId });
    } catch (error) {
        console.error('Admin Users Loader - Error fetching users:', error);
        throw new Response('Unexpected Server Error', { status: 500 });
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    const siteId = getSiteId(request);
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };

    const currentUser = await requireAuth(request, workerEnv, secret, siteId);

    // Only super admins can create users
    if (!currentUser.isSuperAdmin) {
        throw new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const action = formData.get('_action');

    if (action === 'create_user') {
        const email = formData.get('email') as string;
        const name = formData.get('name') as string;
        const password = formData.get('password') as string;
        const role = formData.get('role') as string;
        const userSiteId = formData.get('siteId') as string;
        const isSuperAdmin = formData.get('isSuperAdmin') === 'true';

        // Validate inputs
        if (!email || !name || !password || !role || !userSiteId) {
            return json({ error: 'All fields are required' }, { status: 400 });
        }

        try {
            // Send plain password to worker - it will be hashed server-side
            // This prevents hash interception attacks
            await createUserToWorker(workerEnv, {
                email,
                name,
                password,
                role,
                siteId: userSiteId,
                isSuperAdmin,
            });

            return redirect('/admin/settings/users');
        } catch (error) {
            console.error('Error creating user:', error);
            return json({
                error: error instanceof Error ? error.message : 'Failed to create user'
            }, { status: 500 });
        }
    }

    return json({ error: 'Invalid action' }, { status: 400 });
}

export default function UsersIndex() {
    const { users, currentSiteId } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchParams] = useSearchParams();

    const sortedUsers = useMemo(() => {
        const sortBy = searchParams.get('sortBy') || 'name';
        const sortOrder = searchParams.get('sortOrder') || 'asc';

        const sorted = [...users].sort((a: any, b: any) => {
            let aVal: any;
            let bVal: any;

            switch (sortBy) {
                case 'name':
                    aVal = a.name?.toLowerCase() || '';
                    bVal = b.name?.toLowerCase() || '';
                    break;
                case 'email':
                    aVal = a.email?.toLowerCase() || '';
                    bVal = b.email?.toLowerCase() || '';
                    break;
                case 'role':
                    aVal = a.role?.toLowerCase() || '';
                    bVal = b.role?.toLowerCase() || '';
                    break;
                case 'siteId':
                    aVal = a.siteId?.toLowerCase() || '';
                    bVal = b.siteId?.toLowerCase() || '';
                    break;
                default:
                    aVal = a.name?.toLowerCase() || '';
                    bVal = b.name?.toLowerCase() || '';
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [users, searchParams]);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Create User
                </button>
            </div>

            {actionData?.error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {actionData.error}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No users found
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableTableHeader column="name" label="Name" />
                                <SortableTableHeader column="email" label="Email" />
                                <SortableTableHeader column="role" label="Role" />
                                <SortableTableHeader column="siteId" label="Site" />
                                <NonSortableTableHeader label="Status" />
                                <NonSortableTableHeader label="" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.siteId}</td>
                                    <td className="px-6 py-4">
                                        {user.isSuperAdmin && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Super Admin
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            to={`/admin/settings/users/${user.id}`}
                                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                        >
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <Form method="post" className="space-y-4">
                            <input type="hidden" name="_action" value="create_user" />

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="siteId" className="block text-sm font-medium text-gray-700 mb-1">
                                    Site ID
                                </label>
                                <input
                                    type="text"
                                    id="siteId"
                                    name="siteId"
                                    defaultValue={currentSiteId}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isSuperAdmin"
                                    name="isSuperAdmin"
                                    value="true"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isSuperAdmin" className="ml-2 block text-sm text-gray-700">
                                    Super Admin (can access all sites)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </Form>
                    </div>
                </div>
            )}
        </div>
    );
}
