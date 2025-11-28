/**
 * Ops API Routes (/api/ops/*)
 *
 * Used by apps/ops (admin dashboard)
 * Authentication: Internal (trust/key/context - see middleware/internal.ts)
 */
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
type Bindings = CloudflareEnv;
declare const opsRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export { opsRoutes };
//# sourceMappingURL=ops.d.ts.map