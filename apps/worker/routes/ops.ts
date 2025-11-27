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
  getPropertyBySlug,
  getPropertyWithUnits,
  createProperty,
  updateProperty,
  deleteProperty,
  getPublicListings,
  getUnits,
  getUnitsByPropertyId,
  getUnitById,
  getUnitWithDetails,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitHistory,
  createUnitHistory,
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  getLeadFiles,
  createLeadFile,
  getAIEvaluation,
  createAIEvaluation,
  getLeadHistory,
  recordLeadHistory,
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getTenants,
  getTenantById,
  getUsers,
  getUserById,
  getUserByEmail,
  updateUserPassword,
  updateUserProfile,
  getUserSiteAccess,
  getUserAccessibleSites,
  userHasAccessToSite,
  grantSiteAccess,
  revokeSiteAccess,
  isUserSuperAdmin,
  setSuperAdminStatus,
  getImagesByEntity,
  getImageById,
  createImage,
  updateImage,
  deleteImage,
  setCoverImage,
} from '../../ops/app/lib/db.server';

// Import shared environment types
import type { CloudflareEnv } from '../../../shared/config';

// Use shared bindings type
type Bindings = CloudflareEnv;

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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
    const propertyId = c.req.query('propertyId');

    const units = await getUnits(c.env.DB, siteId, propertyId ? { propertyId } : undefined);

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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    // Extract query parameters for filtering
    const status = c.req.query('status');
    const propertyId = c.req.query('propertyId');
    const sortBy = c.req.query('sortBy');
    const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined;

    const leads = await getLeads(c.env.DB, siteId, {
      status,
      propertyId,
      sortBy,
      sortOrder,
    });

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
 * POST /api/ops/leads
 * Create a new lead
 */
opsRoutes.post('/leads', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
    const body = await c.req.json();

    const lead = await createLead(c.env.DB, siteId, body);

    return c.json({
      success: true,
      data: lead,
    }, 201);
  } catch (error) {
    console.error('Error creating lead:', error);
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
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

/**
 * GET /api/ops/leads/:id/history
 * Get history records for a lead
 */
opsRoutes.get('/leads/:id/history', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
    const id = c.req.param('id');

    const history = await getLeadHistory(c.env.DB, siteId, id);

    return c.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching lead history:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/leads/:id/notes
 * Update landlord and application notes for a lead
 */
opsRoutes.post('/leads/:id/notes', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }
    const id = c.req.param('id');
    const body = await c.req.json();

    // Update lead with notes (will automatically record history)
    await updateLead(c.env.DB, siteId, id, {
      landlordNote: body.landlordNote,
    });

    // Fetch updated lead
    const updatedLead = await getLeadById(c.env.DB, siteId, id);

    return c.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead notes:', error);
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
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
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
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
 * GET /api/ops/users
 * List all users (super admin only)
 */
opsRoutes.get('/users', async (c: Context) => {
  try {
    const users = await getUsers(c.env.DB);

    return c.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/users/:id
 * Get a single user by ID
 */
opsRoutes.get('/users/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const user = await getUserById(c.env.DB, siteId, id);

    if (!user) {
      return c.json({
        error: 'Not found',
        message: 'User not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/users/email/:email
 * Get a user by email (used for login)
 */
opsRoutes.get('/users/email/:email', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const email = c.req.param('email');

    const user = await getUserByEmail(c.env.DB, siteId, email);

    if (!user) {
      return c.json({
        error: 'Not found',
        message: 'User not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

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

/**
 * PUT /api/ops/users/:id/password
 * Update user password
 */
opsRoutes.put('/users/:id/password', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const userId = c.req.param('id');
    const body = await c.req.json();

    await updateUserPassword(c.env.DB, siteId, userId, body.passwordHash);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PUT /api/ops/users/:id/profile
 * Update user profile (name, email)
 */
opsRoutes.put('/users/:id/profile', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');
    const body = await c.req.json();

    await updateUserProfile(c.env.DB, siteId, id, body);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PUT /api/ops/users/:id/super-admin
 * Toggle super admin status
 */
opsRoutes.put('/users/:id/super-admin', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const isSuperAdmin = body.isSuperAdmin === true;

    await setSuperAdminStatus(c.env.DB, id, isSuperAdmin);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating super admin status:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/users/:id/sites
 * Get accessible sites for a user
 */
opsRoutes.get('/users/:id/sites', async (c: Context) => {
  try {
    const userId = c.req.param('id');
    const sites = await getUserAccessibleSites(c.env.DB, userId);
    return c.json({ success: true, data: sites });
  } catch (error) {
    console.error('Error fetching user sites:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Single-site access check endpoint
opsRoutes.get('/users/:id/sites/:siteId', async (c: Context) => {
  try {
    const userId = c.req.param('id');
    const siteId = c.req.param('siteId');
    const hasAccess = await userHasAccessToSite(c.env.DB, userId, siteId);
    return c.json({ success: true, data: { hasAccess } });
  } catch (error) {
    console.error('Error checking user site access:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/**
 * POST /api/ops/users/:id/site-access
 * Grant site access to a user
 */
opsRoutes.post('/users/:id/site-access', async (c: Context) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();

    await grantSiteAccess(c.env.DB, userId, body.siteId, body.role || 'admin');

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error granting site access:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/users/:id/site-access/:siteId
 * Revoke site access from a user
 */
opsRoutes.delete('/users/:id/site-access/:siteId', async (c: Context) => {
  try {
    const userId = c.req.param('id');
    const siteId = c.req.param('siteId');

    await revokeSiteAccess(c.env.DB, userId, siteId);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error revoking site access:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== TENANTS ====================

/**
 * GET /api/ops/tenants
 * List all tenants for a site
 */
opsRoutes.get('/tenants', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const status = c.req.query('status');
    const propertyId = c.req.query('propertyId');

    const tenants = await getTenants(c.env.DB, siteId, { status, propertyId });

    return c.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/tenants/:id
 * Get a single tenant by ID
 */
opsRoutes.get('/tenants/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const tenant = await getTenantById(c.env.DB, siteId, id);

    if (!tenant) {
      return c.json({
        error: 'Not found',
        message: 'Tenant not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PUT /api/ops/tenants/:id
 * Update tenant status
 */
opsRoutes.put('/tenants/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');
    const body = await c.req.json();

    if (body.status) {
      const now = new Date().toISOString();
      const stmt = c.env.DB.prepare('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ? AND site_id = ?');
      await stmt.bind(body.status, now, id, siteId).run();
    }

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== IMAGES ====================

/**
 * GET /api/ops/images
 * Get images for a property or unit
 */
opsRoutes.get('/images', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const entityType = c.req.query('entityType') as 'property' | 'unit';
    const entityId = c.req.query('entityId');

    if (!entityType || !entityId) {
      return c.json({
        error: 'Bad request',
        message: 'entityType and entityId are required',
      }, 400);
    }

    const images = await getImagesByEntity(c.env.DB, siteId, entityType, entityId);

    return c.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/images/:id
 * Get a single image by ID
 */
opsRoutes.get('/images/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const image = await getImageById(c.env.DB, siteId, id);

    if (!image) {
      return c.json({
        error: 'Not found',
        message: 'Image not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/images
 * Create a new image record
 */
opsRoutes.post('/images', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const body = await c.req.json();

    const image = await createImage(c.env.DB, siteId, body);

    return c.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Error creating image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PUT /api/ops/images/:id
 * Update an image record
 */
opsRoutes.put('/images/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');
    const body = await c.req.json();

    await updateImage(c.env.DB, siteId, id, body);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/images/:id
 * Delete an image record
 */
opsRoutes.delete('/images/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    await deleteImage(c.env.DB, siteId, id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/images/:id/set-cover
 * Set an image as the cover image
 */
opsRoutes.post('/images/:id/set-cover', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');
    const body = await c.req.json();

    await setCoverImage(c.env.DB, siteId, body.entityType, body.entityId, id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error setting cover image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/images/:id/serve
 * Serve an image file from R2
 */
opsRoutes.get('/images/:id/serve', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const image = await getImageById(c.env.DB, siteId, id);

    if (!image) {
      return c.json({
        error: 'Not found',
        message: 'Image not found',
      }, 404);
    }

    const object = await c.env.PUBLIC_BUCKET.get(image.r2Key);

    if (!object) {
      return c.json({
        error: 'Not found',
        message: 'Image file not found in storage',
      }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', image.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error serving image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/images/presign
 * Generate a presigned URL for uploading an image to R2
 */
opsRoutes.post('/images/presign', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { key, contentType } = body;

    if (!key) {
      return c.json({
        error: 'Bad request',
        message: 'key is required',
      }, 400);
    }

    // Generate presigned URL for upload
    // Note: R2 doesn't support presigned URLs directly like S3
    // We'll use a different approach: return an upload URL that the client can POST to
    const uploadUrl = `/api/ops/images/upload`;

    return c.json({
      success: true,
      data: {
        uploadUrl,
        key,
        method: 'POST',
      },
    });
  } catch (error) {
    console.error('Error generating presign URL:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/images/upload
 * Upload an image to R2
 */
opsRoutes.post('/images/upload', async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!file || !key) {
      return c.json({
        error: 'Bad request',
        message: 'file and key are required',
      }, 400);
    }

    // Upload to R2
    await c.env.PUBLIC_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return c.json({
      success: true,
      data: { key },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PUT /api/ops/images/reorder
 * Reorder images for a property or unit
 */
opsRoutes.put('/images/reorder', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const body = await c.req.json();
    const { imageIds } = body;

    if (!Array.isArray(imageIds)) {
      return c.json({
        error: 'Bad request',
        message: 'imageIds must be an array',
      }, 400);
    }

    // Update display order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await updateImage(c.env.DB, siteId, imageIds[i], { sortOrder: i });
    }

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error reordering images:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== LEAD FILES ====================

/**
 * GET /api/ops/leads/:id/files
 * Get files for a lead
 */
opsRoutes.get('/leads/:id/files', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');

    const files = await getLeadFiles(c.env.DB, siteId, leadId);

    return c.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Error fetching lead files:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/leads/:id/files
 * Upload a file for a lead
 */
opsRoutes.post('/leads/:id/files', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return c.json({
        error: 'Bad request',
        message: 'file is required',
      }, 400);
    }

    // Generate R2 key
    const timestamp = Date.now();
    const r2Key = `leads/${leadId}/${timestamp}-${file.name}`;

    // Upload to R2 private bucket
    await c.env.PRIVATE_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Create file record
    const leadFile = await createLeadFile(c.env.DB, siteId, {
      leadId,
      fileName: file.name,
      fileType: (fileType as any) || 'other',
      r2Key,
      fileSize: file.size,
      mimeType: file.type,
    });

    return c.json({
      success: true,
      data: leadFile,
    });
  } catch (error) {
    console.error('Error uploading lead file:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== AI EVALUATION ====================

/**
 * POST /api/ops/leads/:id/ai-evaluate
 * Run AI evaluation on a lead
 */
opsRoutes.post('/leads/:id/ai-evaluate', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');
    const body = await c.req.json();

    // Create AI evaluation record
    const evaluation = await createAIEvaluation(c.env.DB, siteId, {
      leadId,
      score: body.score,
      label: body.label,
      summary: body.summary || body.reasoning,
      riskFlags: body.riskFlags || body.flags || [],
      recommendation: body.recommendation,
      fraudSignals: body.fraudSignals || [],
      modelVersion: body.modelVersion || '1.0',
    });

    // Update lead with AI score and label
    await updateLead(c.env.DB, siteId, leadId, {
      aiScore: body.score,
      aiLabel: body.label,
    });

    return c.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error('Error running AI evaluation:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/leads/:id/ai-evaluation
 * Get AI evaluation for a lead
 */
opsRoutes.get('/leads/:id/ai-evaluation', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');

    const evaluation = await getAIEvaluation(c.env.DB, siteId, leadId);

    return c.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error('Error fetching AI evaluation:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== ADDITIONAL ENDPOINTS ====================

/**
 * DELETE /api/ops/properties/:id
 * Delete a property
 */
opsRoutes.delete('/properties/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    await deleteProperty(c.env.DB, siteId, id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/units/:id
 * Delete a unit
 */
opsRoutes.delete('/units/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    await deleteUnit(c.env.DB, siteId, id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/units/:id/with-details
 * Get unit with full details (property, images, tenants)
 */
opsRoutes.get('/units/:id/with-details', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const unit = await getUnitWithDetails(c.env.DB, siteId, id);

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
    console.error('Error fetching unit details:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/units/:id/history
 * Get unit history
 */
opsRoutes.get('/units/:id/history', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const unitId = c.req.param('id');

    const history = await getUnitHistory(c.env.DB, siteId, unitId);

    return c.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching unit history:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/units/:id/history
 * Create unit history event
 */
opsRoutes.post('/units/:id/history', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const unitId = c.req.param('id');
    const body = await c.req.json();

    await createUnitHistory(c.env.DB, siteId, {
      unitId,
      eventType: body.eventType,
      eventData: {
        eventDate: body.eventDate,
        tenantId: body.tenantId,
        notes: body.notes,
      },
    });

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error creating unit history:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/work-orders/:id
 * Get a single work order
 */
opsRoutes.get('/work-orders/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const workOrder = await getWorkOrderById(c.env.DB, siteId, id);

    if (!workOrder) {
      return c.json({
        error: 'Not found',
        message: 'Work order not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/work-orders/:id
 * Delete a work order
 */
opsRoutes.delete('/work-orders/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    await deleteWorkOrder(c.env.DB, siteId, id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/properties/:id/with-units
 * Get property with all units
 */
opsRoutes.get('/properties/:id/with-units', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');

    const property = await getPropertyWithUnits(c.env.DB, siteId, id);

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
    console.error('Error fetching property with units:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/properties/slug/:slug
 * Get property by URL slug
 */
opsRoutes.get('/properties/slug/:slug', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const slug = c.req.param('slug');

    const property = await getPropertyBySlug(c.env.DB, siteId, slug);

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
    console.error('Error fetching property by slug:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/leads/:id
 * Update a lead
 */
opsRoutes.post('/leads/:id', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const id = c.req.param('id');
    const body = await c.req.json();

    await updateLead(c.env.DB, siteId, id, body);

    const updatedLead = await getLeadById(c.env.DB, siteId, id);

    return c.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/leads/:id/history
 * Record a history event for a lead
 */
opsRoutes.post('/leads/:id/history', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');
    const body = await c.req.json();

    await recordLeadHistory(c.env.DB, siteId, leadId, body.eventType, body.eventData);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error recording lead history:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/leads/:id/files
 * Create a lead file record (for metadata only, actual upload happens separately)
 */
opsRoutes.post('/leads/:id/files', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) { return c.json({ error: 'Missing X-Site-Id header' }, 400); }
    const leadId = c.req.param('id');
    const body = await c.req.json();

    const file = await createLeadFile(c.env.DB, siteId, {
      leadId,
      fileType: body.fileType,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      r2Key: body.r2Key,
    });

    return c.json({
      success: true,
      data: file,
    }, 201);
  } catch (error) {
    console.error('Error creating lead file:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export { opsRoutes };
