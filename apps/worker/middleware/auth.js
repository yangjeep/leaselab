/**
 * Bearer Token Authentication Middleware
 *
 * Validates API tokens for public endpoints (/api/public/*)
 * Used by apps/site to authenticate requests
 */
import { validateApiToken } from '../lib/auth';
export async function authMiddleware(c, next) {
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
    }
    const token = auth.replace('Bearer ', '');
    try {
        const siteId = await validateApiToken(token, c.env.DB);
        if (!siteId) {
            return c.json({ error: 'Unauthorized', message: 'Invalid API token' }, 401);
        }
        // Store siteId in context for route handlers
        c.set('siteId', siteId);
        await next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
}
