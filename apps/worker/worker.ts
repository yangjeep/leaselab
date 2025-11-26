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
import { cors } from 'hono/cors';
import { publicRoutes } from './routes/public';
import { opsRoutes } from './routes/ops';

// Environment bindings interface
export interface Env {
  DB: D1Database;
  FILE_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  WORKER_INTERNAL_KEY?: string;
}

// Create Hono app with typed bindings
const app = new Hono<{ Bindings: Env }>();

// ==================== MIDDLEWARE ====================

// Global CORS
app.use('*', cors({
  origin: '*', // TODO: Restrict to specific origins in production
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', 'X-User-Id', 'X-Internal-Key'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// ==================== ROUTES ====================

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'leaselab-worker',
    version: '1.0.0',
    endpoints: {
      public: '/api/public/*',
      ops: '/api/ops/*',
    },
  });
});

// Mount public API routes (for apps/site)
app.route('/api/public', publicRoutes);

// Mount ops API routes (for apps/ops)
app.route('/api/ops', opsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500);
});

// Export the app as a Cloudflare Worker
export default app;
