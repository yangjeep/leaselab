import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { setActiveSite } from '~/lib/auth.server';
import { userHasAccessToSite, getUserAccessibleSites } from '~/lib/db.server';
import { getSessionIdFromCookie, getSession } from '~/lib/auth.server';

/**
 * API route for super admins to switch their active site
 */
export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const db = context.cloudflare.env.DB;
    const kv = context.cloudflare.env.SESSION_STORE;

    try {
        // Get current user from session
        const sessionId = getSessionIdFromCookie(request);
        if (!sessionId) {
            return json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const session = await getSession(kv, sessionId);
        if (!session) {
            return json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get requested site from body
        const body = await request.json();
        const { siteId } = body;

        if (!siteId || typeof siteId !== 'string') {
            return json({ success: false, error: 'siteId is required' }, { status: 400 });
        }

        // Verify user has access to this site
        const hasAccess = await userHasAccessToSite(db, session.userId, siteId);
        if (!hasAccess) {
            return json({
                success: false,
                error: 'You do not have access to this site'
            }, { status: 403 });
        }

        // Set active site in session
        await setActiveSite(request, kv, siteId);

        // Return available sites for UI update
        const accessibleSites = await getUserAccessibleSites(db, session.userId);

        return json({
            success: true,
            activeSite: siteId,
            availableSites: accessibleSites
        });
    } catch (error) {
        console.error('Error switching site:', error);
        return json({ success: false, error: 'Failed to switch site' }, { status: 500 });
    }
}
