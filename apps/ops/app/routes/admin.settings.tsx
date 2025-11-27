import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useActionData, Form } from '@remix-run/react';
import { requireAuth, getOptionalUser, hashPassword, verifyPassword } from '~/lib/auth.server';
import {
  fetchUserByEmailFromWorker,
  updateUserPasswordToWorker,
  updateUserProfileToWorker,
  fetchSiteApiTokensFromWorker,
  createSiteApiTokenToWorker,
  updateSiteApiTokenToWorker,
  deleteSiteApiTokenToWorker,
} from '~/lib/worker-client';
import { useState } from 'react';
import { getSiteId } from '~/lib/site.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };
    const siteId = getSiteId(request);
    // Settings should be accessible to any logged-in user regardless of hostname site context
    const user = await getOptionalUser(request, workerEnv, secret, siteId);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch site API tokens
    const tokens = await fetchSiteApiTokensFromWorker(workerEnv, siteId);

    return json({ user, tokens });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const secret = context.cloudflare.env.SESSION_SECRET as string;
    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };
    const siteId = getSiteId(request);
    const user = await requireAuth(request, workerEnv, secret, siteId);
    const formData = await request.formData();
    const formAction = formData.get('_action') as string;

    // Handle profile update
    if (formAction === 'updateProfile') {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;

        // Validation
        if (!name || name.trim().length === 0) {
            return json({ error: 'Name is required' }, { status: 400 });
        }

        if (!email || !email.includes('@')) {
            return json({ error: 'Valid email is required' }, { status: 400 });
        }

        try {
            await updateUserProfileToWorker(workerEnv, siteId, user.id, { name: name.trim(), email: email.trim() });
            return json({ success: 'Profile updated successfully' });
        } catch (error) {
            return json({ error: (error as Error).message || 'Failed to update profile' }, { status: 400 });
        }
    }

    // Handle password update
    if (formAction === 'updatePassword') {
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return json({ error: 'All password fields are required' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return json({ error: 'New passwords do not match' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        // Get user with password hash
        const userWithPassword = await fetchUserByEmailFromWorker(workerEnv, siteId, user.email);
        if (!userWithPassword) {
            return json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        const isValidPassword = await verifyPassword(currentPassword, userWithPassword.passwordHash);
        if (!isValidPassword) {
            return json({ error: 'Current password is incorrect' }, { status: 401 });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password in database
        await updateUserPasswordToWorker(workerEnv, siteId, user.id, newPasswordHash);

        return json({ success: 'Password updated successfully' });
    }

    // Handle API token creation
    if (formAction === 'createToken') {
        const description = formData.get('description') as string;

        if (!description || description.trim().length === 0) {
            return json({ error: 'Token description is required' }, { status: 400 });
        }

        try {
            const result = await createSiteApiTokenToWorker(workerEnv, siteId, {
                description: description.trim(),
            });

            return json({
                success: 'API token created successfully',
                newToken: result.token,
                tokenRecord: result.record,
            });
        } catch (error) {
            return json({ error: (error as Error).message || 'Failed to create token' }, { status: 400 });
        }
    }

    // Handle API token toggle (activate/deactivate)
    if (formAction === 'toggleToken') {
        const tokenId = formData.get('tokenId') as string;
        const isActive = formData.get('isActive') === 'true';

        try {
            await updateSiteApiTokenToWorker(workerEnv, siteId, tokenId, {
                isActive: !isActive,
            });

            return json({ success: `Token ${isActive ? 'deactivated' : 'activated'} successfully` });
        } catch (error) {
            return json({ error: (error as Error).message || 'Failed to update token' }, { status: 400 });
        }
    }

    // Handle API token deletion
    if (formAction === 'deleteToken') {
        const tokenId = formData.get('tokenId') as string;

        try {
            await deleteSiteApiTokenToWorker(workerEnv, siteId, tokenId);

            return json({ success: 'Token revoked successfully' });
        } catch (error) {
            return json({ error: (error as Error).message || 'Failed to revoke token' }, { status: 400 });
        }
    }

    return json({ error: 'Invalid action' }, { status: 400 });
}

export default function SettingsPage() {
    const { user, tokens } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showNewTokenModal, setShowNewTokenModal] = useState(false);
    const [newTokenDescription, setNewTokenDescription] = useState('');

    // Extract new token from action data
    const newToken = actionData && 'newToken' in actionData ? actionData.newToken : null;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="p-8">
            <div className="max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
                <p className="text-gray-600 mb-8">Manage your account settings and preferences</p>

                {/* Account Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>

                    {actionData?.error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{actionData.error}</p>
                        </div>
                    )}

                    {actionData?.success && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">{actionData.success}</p>
                        </div>
                    )}

                    <Form method="post" className="space-y-4">
                        <input type="hidden" name="_action" value="updateProfile" />

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                defaultValue={user.name}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                defaultValue={user.email}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <p className="text-gray-900 capitalize px-4 py-2 bg-gray-50 rounded-lg">{user.role}</p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </Form>
                </div>

                {/* Password Reset Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>

                    <Form method="post" className="space-y-4" onSubmit={() => setIsSubmitting(true)}>
                        <input type="hidden" name="_action" value="updatePassword" />

                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                name="currentPassword"
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </Form>
                </div>

                {/* Site API Tokens Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Site API Tokens</h2>
                            <p className="text-sm text-gray-600 mt-1">Manage API tokens for your storefront</p>
                        </div>
                        <button
                            onClick={() => setShowNewTokenModal(true)}
                            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                        >
                            + New Token
                        </button>
                    </div>

                    {tokens.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No API tokens yet. Create one to enable your storefront.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                                        <th className="pb-2">Description</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2">Created</th>
                                        <th className="pb-2">Last Used</th>
                                        <th className="pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {tokens.map((token: any) => (
                                        <tr key={token.id} className="text-sm">
                                            <td className="py-3">
                                                <div className="font-medium">{token.description}</div>
                                                <div className="text-xs text-gray-500 font-mono">{token.id}</div>
                                            </td>
                                            <td className="py-3">
                                                {token.isActive ? (
                                                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-gray-600">{formatDate(token.createdAt)}</td>
                                            <td className="py-3 text-gray-600">{formatDate(token.lastUsedAt)}</td>
                                            <td className="py-3 text-right space-x-2">
                                                <Form method="post" className="inline">
                                                    <input type="hidden" name="_action" value="toggleToken" />
                                                    <input type="hidden" name="tokenId" value={token.id} />
                                                    <input type="hidden" name="isActive" value={token.isActive ? 'true' : 'false'} />
                                                    <button type="submit" className="text-indigo-600 hover:text-indigo-700">
                                                        {token.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </Form>
                                                <Form
                                                    method="post"
                                                    className="inline"
                                                    onSubmit={(e) => {
                                                        if (!confirm('Revoke this token? This cannot be undone.')) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                >
                                                    <input type="hidden" name="_action" value="deleteToken" />
                                                    <input type="hidden" name="tokenId" value={token.id} />
                                                    <button type="submit" className="text-red-600 hover:text-red-700">
                                                        Revoke
                                                    </button>
                                                </Form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* New Token Modal */}
                {showNewTokenModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4">Create New API Token</h3>
                            <Form method="post" onSubmit={() => setShowNewTokenModal(false)}>
                                <input type="hidden" name="_action" value="createToken" />
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={newTokenDescription}
                                        onChange={(e) => setNewTokenDescription(e.target.value)}
                                        placeholder="e.g., Production Site"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewTokenModal(false);
                                            setNewTokenDescription('');
                                        }}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Create Token
                                    </button>
                                </div>
                            </Form>
                        </div>
                    </div>
                )}

                {/* New Token Display Modal */}
                {newToken && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4">Token Created Successfully!</h3>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                                <p className="text-sm text-yellow-800 font-medium mb-2">
                                    ⚠️ Save this token now - you won't see it again!
                                </p>
                                <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                                    {newToken}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded p-4 mb-4">
                                <p className="text-sm font-medium mb-2">Set this as an environment variable:</p>
                                <code className="block text-xs bg-white p-2 rounded border">
                                    SITE_API_TOKEN={newToken}
                                </code>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newToken);
                                        alert('Token copied!');
                                    }}
                                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Copy Token
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
