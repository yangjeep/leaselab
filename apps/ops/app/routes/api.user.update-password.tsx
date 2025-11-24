import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireAuth, hashPassword, verifyPassword } from '~/lib/auth.server';
import { getUserByEmail, updateUserPassword } from '~/lib/db.server';

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const db = context.cloudflare.env.DB;
    const kv = context.cloudflare.env.SESSION_KV;

    // Ensure user is authenticated
    const user = await requireAuth(request, db, kv);

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
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

    return json({ success: true, message: 'Password updated successfully' });
}
