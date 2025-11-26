/**
 * Bearer Token Authentication Middleware
 *
 * Validates API tokens for public endpoints (/api/public/*)
 * Used by apps/site to authenticate requests
 */
import type { Context, Next } from 'hono';
export declare function authMiddleware(c: Context, next: Next): Promise<(Response & import("hono").TypedResponse<{
    error: string;
    message: string;
}, 401, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 500, "json">) | undefined>;
//# sourceMappingURL=auth.d.ts.map