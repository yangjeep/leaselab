/**
 * Public API Routes (/api/public/*)
 *
 * Used by apps/site (storefront)
 * Authentication: Bearer token (SITE_API_TOKEN)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  getProperties,
  getPropertyById,
  createLead,
  getPublicListings,
  getUnitWithDetails,
} from '../../ops/app/lib/db.server';

// Define environment bindings type
type Bindings = {
  DB: D1Database;
  FILE_BUCKET: R2Bucket;
};

const publicRoutes = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all public routes
publicRoutes.use('*', authMiddleware);

/**
 * GET /api/public/properties
 * Fetch all available listings (units with property data) for the authenticated site
 *
 * Query params:
 * - city (optional): Filter by city
 * - status (optional): Filter by unit status
 */
publicRoutes.get('/properties', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;
    const city = c.req.query('city');
    const status = c.req.query('status');

    const filters: any = {};
    if (city) filters.city = city;
    if (status) filters.status = status;

    const listings = await getPublicListings(c.env.DB, siteId, filters);

    return c.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/public/properties/:id
 * Fetch a single property by ID or slug
 */
publicRoutes.get('/properties/:id', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;
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
 * GET /api/public/units/:id
 * Fetch a single unit by ID including property details and images
 */
publicRoutes.get('/units/:id', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;
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
    console.error('Error fetching unit:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/public/site-config
 * Fetch site configuration (branding, about page, etc.)
 * TODO: Create site_configs table and migrate data
 */
publicRoutes.get('/site-config', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;

    // Return default config (site_configs table doesn't exist yet)
    return c.json({
      success: true,
      data: {
        siteId,
        siteName: 'LeaseLab Property Management',
        about: {
          title: 'About Us',
          description: 'Professional property management services for quality rentals.',
          stats: [
            { label: 'Years Experience', value: '10+' },
            { label: 'Properties', value: '50+' },
            { label: 'Happy Tenants', value: '500+' }
          ],
        },
        branding: {
          logoUrl: null,
          primaryColor: '#3B82F6',
        },
        contact: {
          email: 'info@leaselab.io',
          phone: '+1-555-0100',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching site config:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/public/leads
 * Submit a tenant application
 */
publicRoutes.post('/leads', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;
    const body = await c.req.json();

    // Validate required fields
    const requiredFields = ['propertyId', 'firstName', 'lastName', 'email', 'phone'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json({
          error: 'Validation error',
          message: `Missing required field: ${field}`,
        }, 400);
      }
    }

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

export { publicRoutes };
