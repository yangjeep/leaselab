/**
 * Ops API Routes (/api/ops/*)
 *
 * Used by apps/ops (admin dashboard)
 * Authentication: Internal (trust/key/context - see middleware/internal.ts)
 */
import { Hono } from 'hono';
type Bindings = {
    DB: D1Database;
    FILE_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
    WORKER_INTERNAL_KEY?: string;
};
declare const opsRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export { opsRoutes };
//# sourceMappingURL=ops.d.ts.map