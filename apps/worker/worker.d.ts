/**
 * LeaseLab Worker - Backend API
 *
 * Centralized API for all database (D1) and storage (R2) operations.
 * Serves both public APIs (for apps/site) and ops APIs (for apps/ops).
 *
 * Architecture:
 * - apps/site → /api/public/* (Bearer token auth)
 * - apps/ops → /api/ops/* (Internal auth)
 * - All D1/R2 operations happen here
 */
import { Hono } from 'hono';
export interface Env {
    DB: D1Database;
    FILE_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
    WORKER_INTERNAL_KEY?: string;
    R2_PUBLIC_URL?: string;
}
declare const app: Hono<{
    Bindings: Env;
}, import("hono/types").BlankSchema, "/">;
export default app;
//# sourceMappingURL=worker.d.ts.map