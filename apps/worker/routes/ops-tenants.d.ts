/**
 * Tenant Operations API Routes (/api/ops/tenants/*)
 *
 * Handles:
 * - Bulk operations (export, add tags, email, document sending)
 * - CSV export generation
 * - Tag management (optional)
 * - Audit trail for all bulk actions
 */
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
type Bindings = CloudflareEnv;
declare const opsTenantsRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export default opsTenantsRoutes;
//# sourceMappingURL=ops-tenants.d.ts.map