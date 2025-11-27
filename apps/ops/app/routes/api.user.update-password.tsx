import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { requireAuth, hashPassword, verifyPassword } from '~/lib/auth.server';
import { fetchUserByEmailFromWorker, updateUserPasswordToWorker } from '~/lib/worker-client';

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

        const secret = context.cloudflare.env.SESSION_SECRET as string;
        const workerEnv = {
            WORKER_URL: context.cloudflare.env.WORKER_URL,
            WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
        };
        const siteId = (new URL(request.url)).hostname || 'default';

    // Ensure user is authenticated
        const user = await requireAuth(request, workerEnv, secret, siteId);

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
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

    return json({ success: true, message: 'Password updated successfully' });
}
