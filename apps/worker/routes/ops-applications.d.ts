/**
 * Application Progress Workflow API Routes (/api/ops/applications/*)
 *
 * Handles:
 * - Multi-applicant management
 * - Document management with verification
 * - Stage transitions with audit trails
 * - Internal notes
 * - Property-centric application views
 * - Shortlist management
 */
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
type Bindings = CloudflareEnv;
declare const opsApplicationsRoutes: Hono<{
    Bindings: Bindings;
}, import("hono/types").BlankSchema, "/">;
export default opsApplicationsRoutes;
//# sourceMappingURL=ops-applications.d.ts.map