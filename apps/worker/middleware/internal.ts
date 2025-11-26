/**
 * Internal Authentication Middleware
 *
 * Validates requests from apps/ops to worker (/api/ops/*)
 * Three options available - currently using Option 1 (trust)
 */

import type { Context, Next } from 'hono';

/**
 * Option 1: Trust all requests (simplest, recommended for internal services)
 * No authentication - assumes ops app is trusted
 */
export async function trustMiddleware(c: Context, next: Next) {
  await next();
}

/**
 * Option 2: Validate internal API key
 * Checks X-Internal-Key header against WORKER_INTERNAL_KEY env var
 */
export async function keyMiddleware(c: Context, next: Next) {
  const key = c.req.header('X-Internal-Key');

  if (!key || key !== c.env.WORKER_INTERNAL_KEY) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing internal key' }, 401);
  }

  await next();
}

/**
 * Option 3: Pass user context from ops
 * Expects X-User-Id and X-Site-Id headers from ops
 */
export async function contextMiddleware(c: Context, next: Next) {
  const userId = c.req.header('X-User-Id');
  const siteId = c.req.header('X-Site-Id');

  if (!userId || !siteId) {
    return c.json({
      error: 'Unauthorized',
      message: 'Missing user context (X-User-Id or X-Site-Id)'
    }, 401);
  }

  c.set('userId', userId);
  c.set('siteId', siteId);

  await next();
}

// Export the chosen option (default: trust)
export const internalAuthMiddleware = trustMiddleware;

// To switch to another option, change the export above:
// export const internalAuthMiddleware = keyMiddleware;
// export const internalAuthMiddleware = contextMiddleware;
