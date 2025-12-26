/**
 * Work Order Operations API Routes (/api/ops/work-orders/*)
 *
 * Handles:
 * - Work order counts by status
 * - Work order list endpoints
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { getWorkOrders } from '../lib/db/work-orders';
import type { CloudflareEnv } from '../../../shared/config';

type Bindings = CloudflareEnv;

const opsWorkOrdersRoutes = new Hono<{ Bindings: Bindings }>();

// ==================== WORK ORDER COUNTS ====================

/**
 * GET /api/ops/work-orders/counts
 * Get counts of work orders by status
 *
 * Response:
 * {
 *   open: number,
 *   in_progress: number,
 *   completed: number,
 *   cancelled: number,
 *   urgent: number (emergency or urgent priority, not completed),
 *   total_actionable: number (open + in_progress)
 * }
 */
opsWorkOrdersRoutes.get('/work-orders/counts', async (c: Context) => {
  try {
    const siteId = c.get('siteId');

    if (!siteId) {
      return c.json({ error: 'Missing siteId' }, 401);
    }

    // Fetch all work orders for this site
    const allWorkOrders = await getWorkOrders(c.env.DB, siteId, {});

    // Calculate counts
    const counts = {
      open: allWorkOrders.filter((wo) => wo.status === 'open').length,
      in_progress: allWorkOrders.filter((wo) => wo.status === 'in_progress').length,
      completed: allWorkOrders.filter((wo) => wo.status === 'completed').length,
      cancelled: allWorkOrders.filter((wo) => wo.status === 'cancelled').length,
      pending_parts: allWorkOrders.filter((wo) => wo.status === 'pending_parts').length,
      scheduled: allWorkOrders.filter((wo) => wo.status === 'scheduled').length,
      urgent: allWorkOrders.filter(
        (wo) =>
          (wo.priority === 'emergency' || wo.priority === 'urgent') &&
          wo.status !== 'completed' &&
          wo.status !== 'cancelled'
      ).length,
      total_actionable: allWorkOrders.filter(
        (wo) => wo.status === 'open' || wo.status === 'in_progress'
      ).length,
    };

    return c.json(counts);
  } catch (error) {
    console.error('Error fetching work order counts:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default opsWorkOrdersRoutes;
