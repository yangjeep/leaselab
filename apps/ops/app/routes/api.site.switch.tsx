import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { setActiveSite, getOptionalUser } from '~/lib/auth.server';
import { fetchUserHasAccessToSiteFromWorker, fetchUserAccessibleSitesFromWorker } from '~/lib/worker-client';

/**
 * API route for super admins to switch their active site
 */
export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const workerEnv = {
        WORKER_URL: context.cloudflare.env.WORKER_URL,
        WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
    };
    const secret = context.cloudflare.env.SESSION_SECRET as string;

    try {
        // Get current user from session
        const formData = await request.formData();
        const siteIdFromReq = formData.get('siteId') as string | null;
        const user = await getOptionalUser(request, workerEnv, secret, siteIdFromReq || '');
        if (!user) {
            return json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get requested site from body
        const siteId = siteIdFromReq;

        if (!siteId || typeof siteId !== 'string') {
            return json({ success: false, error: 'siteId is required' }, { status: 400 });
        }

        // Verify user has access to this site
        const hasAccess = await fetchUserHasAccessToSiteFromWorker(workerEnv, user.id, siteId);
        if (!hasAccess) {
            return json({
                success: false,
                error: 'You do not have access to this site'
            }, { status: 403 });
        }

        // Set active site in session (reissues cookie)
        const setCookieHeader = await setActiveSite(request, secret, siteId);

        // Return available sites for UI update
        const accessibleSites = await fetchUserAccessibleSitesFromWorker(workerEnv, user.id);

        return json({
            success: true,
            activeSite: siteId,
            availableSites: accessibleSites
        }, { headers: { 'Set-Cookie': setCookieHeader } });
    } catch (error) {
        console.error('Error switching site:', error);
        return json({ success: false, error: 'Failed to switch site' }, { status: 500 });
    }
}
