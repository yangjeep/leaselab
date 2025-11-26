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
 * Fetch all properties for the authenticated site
 *
 * Query params:
 * - city (optional): Filter by city
 * - status (optional): Filter by status
 */
publicRoutes.get('/properties', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;
    const city = c.req.query('city');
    const status = c.req.query('status');

    const filters: any = {};
    if (city) filters.city = city;
    if (status) filters.status = status;

    const properties = await getProperties(c.env.DB, siteId, filters);

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
 * GET /api/public/site-config
 * Fetch site configuration (branding, about page, etc.)
 */
publicRoutes.get('/site-config', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;

    // Query site_configs table
    const config = await c.env.DB.prepare(`
      SELECT
        site_id,
        site_name,
        about_title,
        about_description,
        about_stats,
        branding_logo_url,
        branding_primary_color,
        contact_email,
        contact_phone
      FROM site_configs
      WHERE site_id = ?
    `).bind(siteId).first();

    if (!config) {
      // Return default config if not found
      return c.json({
        success: true,
        data: {
          siteId,
          siteName: 'LeaseLab Property Management',
          about: {
            title: 'About Us',
            description: 'Professional property management services',
            stats: [],
          },
          branding: {
            logoUrl: null,
            primaryColor: null,
          },
          contact: {
            email: 'info@leaselab.io',
            phone: '+1-555-0100',
          },
        },
      });
    }

    // Parse JSON fields
    const stats = config.about_stats ? JSON.parse(config.about_stats as string) : [];

    return c.json({
      success: true,
      data: {
        siteId: config.site_id,
        siteName: config.site_name,
        about: {
          title: config.about_title || 'About Us',
          description: config.about_description || '',
          stats,
        },
        branding: {
          logoUrl: config.branding_logo_url,
          primaryColor: config.branding_primary_color,
        },
        contact: {
          email: config.contact_email,
          phone: config.contact_phone,
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
