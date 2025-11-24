import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useActionData, Form } from '@remix-run/react';
import { requireAuth, hashPassword, verifyPassword } from '~/lib/auth.server';
import { getUserByEmail, updateUserPassword, updateUserProfile } from '~/lib/db.server';
import { useState } from 'react';

export async function loader({ request, context }: LoaderFunctionArgs) {
    const db = context.cloudflare.env.DB;
    const kv = context.cloudflare.env.SESSION_KV;

    const user = await requireAuth(request, db, kv);

    return json({ user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const db = context.cloudflare.env.DB;
    const kv = context.cloudflare.env.SESSION_KV;

    const user = await requireAuth(request, db, kv);
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
            await updateUserProfile(db, user.id, { name: name.trim(), email: email.trim() });
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
        const userWithPassword = await getUserByEmail(db, user.email);
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
        await updateUserPassword(db, user.id, newPasswordHash);

        return json({ success: 'Password updated successfully' });
    }

    return json({ error: 'Invalid action' }, { status: 400 });
}

export default function SettingsPage() {
    const { user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            </div>
        </div>
    );
}
