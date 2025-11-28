/**
 * Public API Routes (/api/public/*)
 *
 * Used by apps/site (storefront)
 * Authentication: Bearer token (SITE_API_TOKEN)
 */
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
type Bindings = CloudflareEnv;
declare const publicRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export { publicRoutes };
//# sourceMappingURL=public.d.ts.map