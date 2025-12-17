/**
 * Ops API Routes (/api/ops/*)
 *
 * Used by apps/ops (admin dashboard)
 * Authentication: Internal (trust/key/context - see middleware/internal.ts)
 */
import { Hono } from 'hono';
import { internalAuthMiddleware } from '../middleware/internal';
import { getProperties, getPropertyById, getPropertyBySlug, getPropertyWithUnits, createProperty, updateProperty, deleteProperty, getUnits, getUnitById, getUnitWithDetails, createUnit, updateUnit, deleteUnit, getUnitHistory, createUnitHistory, getLeads, getLeadById, createLead, updateLead, archiveLead, restoreLead, getLeadFiles, createLeadFile, getAIEvaluation, createAIEvaluation, getLeadHistory, recordLeadHistory, getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrder, deleteWorkOrder, getTenants, getTenantById, createTenant, updateTenant, deleteTenant, getUsers, getUserById, getUserByEmail, createUser, updateUserPassword, updateUserProfile, updateUserRole, getUserAccessibleSites, userHasAccessToSite, grantSiteAccess, revokeSiteAccess, setSuperAdminStatus, getImagesByEntity, getImageById, createImage, updateImage, deleteImage, setCoverImage, getSiteApiTokens, getSiteApiTokenById, createSiteApiToken, updateSiteApiToken, deleteSiteApiToken, getLeases, getLeaseById, createLease, updateLease, deleteLease, getLeaseFiles, getLeaseFileById, createLeaseFile, deleteLeaseFile, } from '../lib/db';
const opsRoutes = new Hono();
// Apply internal auth middleware to all ops routes
opsRoutes.use('*', internalAuthMiddleware);
// ==================== PROPERTIES ====================
/**
 * GET /api/ops/properties
 * List all properties for a site
 */
opsRoutes.get('/properties', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.get('/properties/:id', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.post('/properties', async (c) => {
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
        }
        else {
            // Create new property
            result = await createProperty(c.env.DB, siteId, body);
        }
        return c.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
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
opsRoutes.get('/units', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.get('/units/:id', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.post('/units', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        let result;
        if (body.id) {
            result = await updateUnit(c.env.DB, siteId, body.id, body);
        }
        else {
            result = await createUnit(c.env.DB, siteId, body);
        }
        return c.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
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
opsRoutes.get('/leads', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        // Extract query parameters for filtering
        const status = c.req.query('status');
        const propertyId = c.req.query('propertyId');
        const sortBy = c.req.query('sortBy');
        const sortOrder = c.req.query('sortOrder');
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
    }
    catch (error) {
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
opsRoutes.post('/leads', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.get('/leads/:id', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.get('/leads/:id/history', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.post('/leads/:id/notes', async (c) => {
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
    }
    catch (error) {
        console.error('Error updating lead notes:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leads/:id/archive
 * Archive a lead (soft delete)
 */
opsRoutes.post('/leads/:id/archive', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await archiveLead(c.env.DB, siteId, id);
        return c.json({
            success: true,
            message: 'Lead archived successfully',
        });
    }
    catch (error) {
        console.error('Error archiving lead:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leads/:id/restore
 * Restore an archived lead
 */
opsRoutes.post('/leads/:id/restore', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await restoreLead(c.env.DB, siteId, id);
        return c.json({
            success: true,
            message: 'Lead restored successfully',
        });
    }
    catch (error) {
        console.error('Error restoring lead:', error);
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
opsRoutes.get('/work-orders', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        // Get query parameters
        const status = c.req.query('status');
        const propertyId = c.req.query('propertyId');
        const sortBy = c.req.query('sortBy');
        const sortOrder = c.req.query('sortOrder');
        const workOrders = await getWorkOrders(c.env.DB, siteId, {
            status,
            propertyId,
            sortBy,
            sortOrder,
        });
        return c.json({
            success: true,
            data: workOrders,
        });
    }
    catch (error) {
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
opsRoutes.post('/work-orders', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        let result;
        if (body.id) {
            result = await updateWorkOrder(c.env.DB, siteId, body.id, body);
        }
        else {
            result = await createWorkOrder(c.env.DB, siteId, body);
        }
        return c.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
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
opsRoutes.get('/users', async (c) => {
    try {
        const users = await getUsers(c.env.DB);
        return c.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/users
 * Create a new user
 */
opsRoutes.post('/users', async (c) => {
    try {
        const body = await c.req.json();
        // Validate required fields
        if (!body.email || !body.name || !body.password || !body.role || !body.siteId) {
            return c.json({
                error: 'Bad request',
                message: 'Missing required fields: email, name, password, role, siteId',
            }, 400);
        }
        // Import hashPassword from shared utils
        const { hashPassword } = await import('../../../shared/utils/crypto');
        // Hash password server-side to prevent hash interception attacks
        const passwordHash = await hashPassword(body.password);
        const user = await createUser(c.env.DB, {
            email: body.email,
            name: body.name,
            passwordHash,
            role: body.role,
            siteId: body.siteId,
            isSuperAdmin: body.isSuperAdmin || false,
        });
        return c.json({
            success: true,
            data: user,
        }, 201);
    }
    catch (error) {
        console.error('Error creating user:', error);
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
opsRoutes.get('/users/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.get('/users/email/:email', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.post('/users/:id/update-login', async (c) => {
    try {
        const userId = c.req.param('id');
        await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
            .bind(new Date().toISOString(), userId)
            .run();
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating last login:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/users/:id/password
 * Update user password
 */
opsRoutes.post('/users/:id/password', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const userId = c.req.param('id');
        const body = await c.req.json();
        await updateUserPassword(c.env.DB, siteId, userId, body.passwordHash);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating password:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/users/:id/profile
 * Update user profile (name, email)
 */
opsRoutes.post('/users/:id/profile', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await updateUserProfile(c.env.DB, siteId, id, body);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/users/:id/super-admin
 * Toggle super admin status
 */
opsRoutes.post('/users/:id/super-admin', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const isSuperAdmin = body.isSuperAdmin === true;
        await setSuperAdminStatus(c.env.DB, id, isSuperAdmin);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating super admin status:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * PUT /api/ops/users/:id/role
 * Update user role
 */
opsRoutes.put('/users/:id/role', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        if (!body.role) {
            return c.json({
                error: 'Bad request',
                message: 'Missing required field: role',
            }, 400);
        }
        await updateUserRole(c.env.DB, siteId, id, body.role);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating user role:', error);
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
opsRoutes.get('/users/:id/sites', async (c) => {
    try {
        const userId = c.req.param('id');
        const sites = await getUserAccessibleSites(c.env.DB, userId);
        return c.json({ success: true, data: sites });
    }
    catch (error) {
        console.error('Error fetching user sites:', error);
        return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});
// Single-site access check endpoint
opsRoutes.get('/users/:id/sites/:siteId', async (c) => {
    try {
        const userId = c.req.param('id');
        const siteId = c.req.param('siteId');
        const hasAccess = await userHasAccessToSite(c.env.DB, userId, siteId);
        return c.json({ success: true, data: { hasAccess } });
    }
    catch (error) {
        console.error('Error checking user site access:', error);
        return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});
/**
 * POST /api/ops/users/:id/site-access
 * Grant site access to a user
 */
opsRoutes.post('/users/:id/site-access', async (c) => {
    try {
        const userId = c.req.param('id');
        const body = await c.req.json();
        await grantSiteAccess(c.env.DB, userId, body.siteId, body.role || 'admin');
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error granting site access:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/users/:id/site-access/:siteId/delete
 * Revoke site access from a user
 */
opsRoutes.post('/users/:id/site-access/:siteId/delete', async (c) => {
    try {
        const userId = c.req.param('id');
        const siteId = c.req.param('siteId');
        await revokeSiteAccess(c.env.DB, userId, siteId);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.get('/tenants', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        // Get query parameters
        const status = c.req.query('status');
        const propertyId = c.req.query('propertyId');
        const sortBy = c.req.query('sortBy');
        const sortOrder = c.req.query('sortOrder');
        const tenants = await getTenants(c.env.DB, siteId, {
            status,
            propertyId,
            sortBy,
            sortOrder,
        });
        return c.json({
            success: true,
            data: tenants,
        });
    }
    catch (error) {
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
opsRoutes.get('/tenants/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
        console.error('Error fetching tenant:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/tenants
 * Create a new tenant
 */
opsRoutes.post('/tenants', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        const tenant = await createTenant(c.env.DB, siteId, body);
        return c.json({
            success: true,
            data: tenant,
        }, 201);
    }
    catch (error) {
        console.error('Error creating tenant:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * PATCH /api/ops/tenants/:id
 * Update tenant information
 */
opsRoutes.patch('/tenants/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await updateTenant(c.env.DB, siteId, id, body);
        // Fetch updated tenant
        const updatedTenant = await getTenantById(c.env.DB, siteId, id);
        return c.json({
            success: true,
            data: updatedTenant,
        });
    }
    catch (error) {
        console.error('Error updating tenant:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
opsRoutes.delete('/tenants/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteTenant(c.env.DB, siteId, id);
        return c.json({
            success: true,
            message: 'Tenant deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting tenant:', error);
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
opsRoutes.get('/images', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const entityType = c.req.query('entityType');
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
    }
    catch (error) {
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
opsRoutes.get('/images/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.post('/images', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        const image = await createImage(c.env.DB, siteId, body);
        return c.json({
            success: true,
            data: image,
        });
    }
    catch (error) {
        console.error('Error creating image:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/images/:id
 * Update an image record
 */
opsRoutes.post('/images/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await updateImage(c.env.DB, siteId, id, body);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating image:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/images/:id/delete
 * Delete an image record and R2 file
 */
opsRoutes.post('/images/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        // First, fetch the image to get the R2 key
        const image = await getImageById(c.env.DB, siteId, id);
        if (!image) {
            return c.json({
                error: 'Not found',
                message: 'Image not found',
            }, 404);
        }
        // Delete from R2 first (fail fast if storage deletion fails)
        try {
            await c.env.PUBLIC_BUCKET.delete(image.r2Key);
        }
        catch (r2Error) {
            console.error('Error deleting from R2:', r2Error);
            // Continue anyway - the file might already be deleted
            // We don't want to block DB cleanup if R2 file is missing
        }
        // Then delete from database
        await deleteImage(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.post('/images/:id/set-cover', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await setCoverImage(c.env.DB, siteId, body.entityType, body.entityId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.get('/images/:id/serve', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.post('/images/presign', async (c) => {
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
    }
    catch (error) {
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
opsRoutes.post('/images/upload', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return c.json({ error: 'Invalid file' }, 400);
        }
        const key = formData.get('key');
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
    }
    catch (error) {
        console.error('Error uploading image:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/images/reorder
 * Reorder images for a property or unit
 */
opsRoutes.post('/images/reorder', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
 * Get files for a lead with signed URLs for downloading (valid for 24 hours)
 */
opsRoutes.get('/leads/:id/files', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leadId = c.req.param('id');
        const files = await getLeadFiles(c.env.DB, siteId, leadId);
        // Generate signed URLs for each file (valid for 24 hours)
        const filesWithUrls = await Promise.all(files.map(async (file) => {
            // Generate signed URL using R2's built-in signing
            const signedUrl = await c.env.PRIVATE_BUCKET.sign(file.r2Key, {
                expiresIn: 24 * 60 * 60, // 24 hours in seconds
            });
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            return {
                ...file,
                signedUrl,
                expiresAt,
            };
        }));
        return c.json({
            success: true,
            data: filesWithUrls,
        });
    }
    catch (error) {
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
opsRoutes.post('/leads/:id/files', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leadId = c.req.param('id');
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return c.json({ error: 'Invalid file' }, 400);
        }
        const fileType = formData.get('fileType');
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
            fileType: fileType || 'other',
            r2Key,
            fileSize: file.size,
            mimeType: file.type,
        });
        return c.json({
            success: true,
            data: leadFile,
        });
    }
    catch (error) {
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
opsRoutes.post('/leads/:id/ai-evaluate', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.get('/leads/:id/ai-evaluation', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leadId = c.req.param('id');
        const evaluation = await getAIEvaluation(c.env.DB, siteId, leadId);
        return c.json({
            success: true,
            data: evaluation,
        });
    }
    catch (error) {
        console.error('Error fetching AI evaluation:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
// ==================== ADDITIONAL ENDPOINTS ====================
/**
 * POST /api/ops/properties/:id/delete
 * Delete a property
 */
opsRoutes.post('/properties/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteProperty(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error deleting property:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/units/:id/delete
 * Delete a unit
 */
opsRoutes.post('/units/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteUnit(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.get('/units/:id/with-details', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.get('/units/:id/history', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const unitId = c.req.param('id');
        const history = await getUnitHistory(c.env.DB, siteId, unitId);
        return c.json({
            success: true,
            data: history,
        });
    }
    catch (error) {
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
opsRoutes.post('/units/:id/history', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.get('/work-orders/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
        console.error('Error fetching work order:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/work-orders/:id/delete
 * Delete a work order
 */
opsRoutes.post('/work-orders/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteWorkOrder(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.get('/properties/:id/with-units', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.get('/properties/slug/:slug', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
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
opsRoutes.post('/leads/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await updateLead(c.env.DB, siteId, id, body);
        const updatedLead = await getLeadById(c.env.DB, siteId, id);
        return c.json({
            success: true,
            data: updatedLead,
        });
    }
    catch (error) {
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
opsRoutes.post('/leads/:id/history', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leadId = c.req.param('id');
        const body = await c.req.json();
        await recordLeadHistory(c.env.DB, siteId, leadId, body.eventType, body.eventData);
        return c.json({
            success: true,
        });
    }
    catch (error) {
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
opsRoutes.post('/leads/:id/files', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
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
    }
    catch (error) {
        console.error('Error creating lead file:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
// ==================== SITE API TOKENS ====================
/**
 * GET /api/ops/site-api-tokens
 * List all API tokens for a site
 */
opsRoutes.get('/site-api-tokens', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const tokens = await getSiteApiTokens(c.env.DB, siteId);
        return c.json({
            success: true,
            data: tokens,
        });
    }
    catch (error) {
        console.error('Error fetching site API tokens:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * GET /api/ops/site-api-tokens/:id
 * Get a single API token by ID
 */
opsRoutes.get('/site-api-tokens/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const token = await getSiteApiTokenById(c.env.DB, siteId, id);
        if (!token) {
            return c.json({
                error: 'Not found',
                message: 'API token not found',
            }, 404);
        }
        return c.json({
            success: true,
            data: token,
        });
    }
    catch (error) {
        console.error('Error fetching site API token:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/site-api-tokens
 * Create a new API token
 */
opsRoutes.post('/site-api-tokens', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        const { description, expiresAt } = body;
        if (!description) {
            return c.json({
                error: 'Bad request',
                message: 'description is required',
            }, 400);
        }
        const result = await createSiteApiToken(c.env.DB, siteId, {
            description,
            expiresAt: expiresAt || null,
        });
        return c.json({
            success: true,
            data: {
                token: result.token, // Plain-text token (only shown once!)
                record: result.record,
            },
        }, 201);
    }
    catch (error) {
        console.error('Error creating site API token:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/site-api-tokens/:id
 * Update an API token (activate/deactivate or change description)
 */
opsRoutes.post('/site-api-tokens/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        const { description, isActive } = body;
        await updateSiteApiToken(c.env.DB, siteId, id, {
            description,
            isActive,
        });
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating site API token:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/site-api-tokens/:id/delete
 * Delete (revoke) an API token
 */
opsRoutes.post('/site-api-tokens/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteSiteApiToken(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error deleting site API token:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
// ==================== LEASES ====================
/**
 * GET /api/ops/leases
 * List all leases for a site
 */
opsRoutes.get('/leases', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        // Get query parameters
        const status = c.req.query('status');
        const propertyId = c.req.query('propertyId');
        const unitId = c.req.query('unitId');
        const tenantId = c.req.query('tenantId');
        const sortBy = c.req.query('sortBy');
        const sortOrder = c.req.query('sortOrder');
        const leases = await getLeases(c.env.DB, siteId, {
            status,
            propertyId,
            unitId,
            tenantId,
            sortBy,
            sortOrder,
        });
        return c.json({
            success: true,
            data: leases,
        });
    }
    catch (error) {
        console.error('Error fetching leases:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * GET /api/ops/leases/:id
 * Get a single lease by ID
 */
opsRoutes.get('/leases/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const lease = await getLeaseById(c.env.DB, siteId, id);
        if (!lease) {
            return c.json({
                error: 'Not found',
                message: 'Lease not found',
            }, 404);
        }
        return c.json({
            success: true,
            data: lease,
        });
    }
    catch (error) {
        console.error('Error fetching lease:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leases
 * Create a new lease
 */
opsRoutes.post('/leases', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const body = await c.req.json();
        const { propertyId, unitId, tenantId, startDate, endDate, monthlyRent, securityDeposit, status, docuSignEnvelopeId, signedAt, } = body;
        const lease = await createLease(c.env.DB, siteId, {
            propertyId,
            unitId,
            tenantId,
            startDate,
            endDate,
            monthlyRent,
            securityDeposit,
            status: status || 'draft',
            docuSignEnvelopeId,
            signedAt,
        });
        return c.json({
            success: true,
            data: lease,
        }, 201);
    }
    catch (error) {
        console.error('Error creating lease:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leases/:id
 * Update a lease
 */
opsRoutes.post('/leases/:id', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        const body = await c.req.json();
        await updateLease(c.env.DB, siteId, id, body);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error updating lease:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leases/:id/delete
 * Delete a lease
 */
opsRoutes.post('/leases/:id/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const id = c.req.param('id');
        await deleteLease(c.env.DB, siteId, id);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error deleting lease:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * GET /api/ops/leases/:id/files
 * Get all files for a lease
 */
opsRoutes.get('/leases/:id/files', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leaseId = c.req.param('id');
        const files = await getLeaseFiles(c.env.DB, siteId, leaseId);
        // Generate signed URLs for each file (valid for 1 hour)
        const filesWithUrls = await Promise.all(files.map(async (file) => {
            try {
                const signedUrl = await c.env.PRIVATE_BUCKET.get(file.r2Key, {
                    range: { offset: 0, length: 1 },
                });
                if (!signedUrl) {
                    return { ...file, signedUrl: null };
                }
                // For now, return the file without signed URL - will implement proper URL generation
                return file;
            }
            catch (error) {
                console.error('Error generating signed URL for file:', file.id, error);
                return file;
            }
        }));
        return c.json({
            success: true,
            data: filesWithUrls,
        });
    }
    catch (error) {
        console.error('Error fetching lease files:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leases/:id/files
 * Upload a file for a lease
 */
opsRoutes.post('/leases/:id/files', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const leaseId = c.req.param('id');
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return c.json({ error: 'Invalid file' }, 400);
        }
        const fileType = formData.get('fileType');
        if (!file) {
            return c.json({
                error: 'Bad request',
                message: 'file is required',
            }, 400);
        }
        // Generate R2 key
        const timestamp = Date.now();
        const r2Key = `leases/${leaseId}/${timestamp}-${file.name}`;
        // Upload to R2 private bucket
        await c.env.PRIVATE_BUCKET.put(r2Key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        });
        // Create file record
        const leaseFile = await createLeaseFile(c.env.DB, siteId, {
            leaseId,
            fileName: file.name,
            fileType: fileType || 'other',
            r2Key,
            fileSize: file.size,
            mimeType: file.type,
        });
        return c.json({
            success: true,
            data: leaseFile,
        }, 201);
    }
    catch (error) {
        console.error('Error uploading lease file:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
/**
 * POST /api/ops/leases/:leaseId/files/:fileId/delete
 * Delete a lease file
 */
opsRoutes.post('/leases/:leaseId/files/:fileId/delete', async (c) => {
    try {
        const siteId = c.req.header('X-Site-Id');
        if (!siteId) {
            return c.json({ error: 'Missing X-Site-Id header' }, 400);
        }
        const fileId = c.req.param('fileId');
        // Get the file first to retrieve R2 key
        const file = await getLeaseFileById(c.env.DB, siteId, fileId);
        if (!file) {
            return c.json({
                error: 'Not found',
                message: 'File not found',
            }, 404);
        }
        // Delete from R2
        await c.env.PRIVATE_BUCKET.delete(file.r2Key);
        // Delete from database
        await deleteLeaseFile(c.env.DB, siteId, fileId);
        return c.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Error deleting lease file:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
export { opsRoutes };
