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
export declare function trustMiddleware(c: Context, next: Next): Promise<void>;
/**
 * Option 2: Validate internal API key
 * Checks X-Internal-Key header against WORKER_INTERNAL_KEY env var
 */
export declare function keyMiddleware(c: Context, next: Next): Promise<(Response & import("hono").TypedResponse<{
    error: string;
    message: string;
}, 401, "json">) | undefined>;
/**
 * Option 3: Pass user context from ops
 * Expects X-User-Id and X-Site-Id headers from ops
 */
export declare function contextMiddleware(c: Context, next: Next): Promise<(Response & import("hono").TypedResponse<{
    error: string;
    message: string;
}, 401, "json">) | undefined>;
export declare const internalAuthMiddleware: typeof trustMiddleware;
//# sourceMappingURL=internal.d.ts.map