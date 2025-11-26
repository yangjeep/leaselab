/**
 * Ops API Routes (/api/ops/*)
 *
 * Used by apps/ops (admin dashboard)
 * Authentication: Internal (trust/key/context - see middleware/internal.ts)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { internalAuthMiddleware } from '../middleware/internal';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  getLeads,
  getLeadById,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
} from '../../ops/app/lib/db.server';

// Define environment bindings type
type Bindings = {
  DB: D1Database;
  FILE_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  WORKER_INTERNAL_KEY?: string;
};

const opsRoutes = new Hono<{ Bindings: Bindings }>();

// Apply internal auth middleware to all ops routes
opsRoutes.use('*', internalAuthMiddleware);

// ==================== PROPERTIES ====================

/**
 * GET /api/ops/properties
 * List all properties for a site
 */
opsRoutes.get('/properties', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const properties = await getProperties(c.env.DB, siteId);

    return c.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/properties/:id
 * Get a single property by ID
 */
opsRoutes.get('/properties/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const id = c.req.param('id');

    const property = await getPropertyById(c.env.DB, siteId, id);

    if (!property) {
      return c.json({
        error: 'Not found',
        message: 'Property not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/properties
 * Create or update a property
 * - If body.id exists, update
 * - If no body.id, create new
 */
opsRoutes.post('/properties', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const body = await c.req.json();

    let result;

    if (body.id) {
      // Update existing property
      result = await updateProperty(c.env.DB, siteId, body.id, body);
    } else {
      // Create new property
      result = await createProperty(c.env.DB, siteId, body);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error saving property:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== UNITS ====================

/**
 * GET /api/ops/units
 * List all units (optionally filtered by property)
 */
opsRoutes.get('/units', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const propertyId = c.req.query('propertyId');

    const units = await getUnits(c.env.DB, siteId, propertyId);

    return c.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/units/:id
 * Get a single unit by ID
 */
opsRoutes.get('/units/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const id = c.req.param('id');

    const unit = await getUnitById(c.env.DB, siteId, id);

    if (!unit) {
      return c.json({
        error: 'Not found',
        message: 'Unit not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: unit,
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/units
 * Create or update a unit
 */
opsRoutes.post('/units', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const body = await c.req.json();

    let result;

    if (body.id) {
      result = await updateUnit(c.env.DB, siteId, body.id, body);
    } else {
      result = await createUnit(c.env.DB, siteId, body);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error saving unit:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== LEADS ====================

/**
 * GET /api/ops/leads
 * List all leads for a site
 */
opsRoutes.get('/leads', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const leads = await getLeads(c.env.DB, siteId);

    return c.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/leads/:id
 * Get a single lead by ID
 */
opsRoutes.get('/leads/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const id = c.req.param('id');

    const lead = await getLeadById(c.env.DB, siteId, id);

    if (!lead) {
      return c.json({
        error: 'Not found',
        message: 'Lead not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== WORK ORDERS ====================

/**
 * GET /api/ops/work-orders
 * List all work orders for a site
 */
opsRoutes.get('/work-orders', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const workOrders = await getWorkOrders(c.env.DB, siteId);

    return c.json({
      success: true,
      data: workOrders,
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/work-orders
 * Create or update a work order
 */
opsRoutes.post('/work-orders', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id') || 'default';
    const body = await c.req.json();

    let result;

    if (body.id) {
      result = await updateWorkOrder(c.env.DB, siteId, body.id, body);
    } else {
      result = await createWorkOrder(c.env.DB, siteId, body);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error saving work order:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== USERS ====================

/**
 * POST /api/ops/users/:id/update-login
 * Update user's last login timestamp
 */
opsRoutes.post('/users/:id/update-login', async (c: Context) => {
  try {
    const userId = c.req.param('id');
    
    await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), userId)
      .run();

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export { opsRoutes };
