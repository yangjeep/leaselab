/**
 * Lease Operations API Routes (/api/ops/leases/*)
 *
 * Handles:
 * - Bulk operations (status updates, export, email, document generation)
 * - Status transition validation
 * - CSV export generation
 * - Audit trail for all bulk actions
 */
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
type Bindings = CloudflareEnv;
declare const opsLeasesRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export default opsLeasesRoutes;
//# sourceMappingURL=ops-leases.d.ts.map