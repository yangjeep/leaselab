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
  createTempLeadFile,
  associateFilesWithLead,
  countLeadFiles,
  addImageUrls,
  getImagesByEntityWithUrls,
  getImagesByEntityWithVerification,
} from '../lib/db';
import { FILE_UPLOAD_CONSTRAINTS } from '../../../shared/config';
import type { FileUploadResponse } from '../../../shared/types';
import { generateId } from '../../../shared/utils';

// Import shared environment types
import type { CloudflareEnv } from '../../../shared/config';

// Use shared bindings type
type Bindings = CloudflareEnv;

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

    const listings = await getPublicListings(c.env.DB, siteId, filters, c.env.R2_PUBLIC_URL, c.env.PUBLIC_BUCKET);

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
 * Fetch a single property by ID or slug with images (including URLs)
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

    // Get property images with URLs and verify they exist in R2
    const images = await getImagesByEntityWithVerification(c.env.DB, siteId, 'property', property.id, c.env.R2_PUBLIC_URL, c.env.PUBLIC_BUCKET);

    return c.json({
      success: true,
      data: {
        ...property,
        images,
      },
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
 * Returns combined gallery: property images first, then unit images
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

    // Get property images first (if property exists), then unit images
    // Verify all images exist in R2 before serving
    let propertyImages: any[] = [];
    if (unit.property) {
      propertyImages = await getImagesByEntityWithVerification(c.env.DB, siteId, 'property', unit.property.id, c.env.R2_PUBLIC_URL, c.env.PUBLIC_BUCKET);
      // Mark property images for identification
      propertyImages = propertyImages.map(img => ({ ...img, isPropertyImage: true }));
    }

    // Get unit images with verification
    const unitImages = await getImagesByEntityWithVerification(c.env.DB, siteId, 'unit', id, c.env.R2_PUBLIC_URL, c.env.PUBLIC_BUCKET);

    // Combine images: property first, then unit (as per PRD requirements)
    const allImages = [...propertyImages, ...unitImages];

    return c.json({
      success: true,
      data: {
        ...unit,
        images: allImages,
        property: unit.property ? {
          ...unit.property,
          images: propertyImages,
        } : undefined,
      },
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
 * POST /api/public/leads/files/upload
 * Upload a file for a lead application (before lead is created)
 *
 * Multi-layer validation:
 * 1. Content-Length header check
 * 2. MIME type validation
 * 3. Stream size validation during upload
 * 4. Post-upload verification
 */
publicRoutes.post('/leads/files/upload', async (c: Context) => {
  try {
    const siteId = c.get('siteId') as string;

    // Layer 1: Content-Length header validation
    const contentLength = c.req.header('content-length');
    if (!contentLength || parseInt(contentLength) > FILE_UPLOAD_CONSTRAINTS.maxFileSize) {
      return c.json({
        error: 'File too large',
        message: `File size exceeds maximum of ${FILE_UPLOAD_CONSTRAINTS.maxFileSize / 1024 / 1024}MB`,
        maxSize: FILE_UPLOAD_CONSTRAINTS.maxFileSize,
      }, 413);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return c.json({ error: 'Invalid file' }, 400);
    }
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return c.json({
        error: 'Validation error',
        message: 'No file provided',
      }, 400);
    }

    if (!fileType) {
      return c.json({
        error: 'Validation error',
        message: 'fileType is required',
      }, 400);
    }

    // Layer 2: MIME type validation
    if (!FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes.includes(file.type as any)) {
      return c.json({
        error: 'Unsupported file type',
        message: `File type ${file.type} is not allowed`,
        allowedTypes: FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes,
      }, 415);
    }

    // Layer 3: File size validation (redundant check on File object)
    if (file.size > FILE_UPLOAD_CONSTRAINTS.maxFileSize) {
      return c.json({
        error: 'File too large',
        message: `File size exceeds maximum of ${FILE_UPLOAD_CONSTRAINTS.maxFileSize / 1024 / 1024}MB`,
        maxSize: FILE_UPLOAD_CONSTRAINTS.maxFileSize,
      }, 413);
    }

    // Check file count limit (count temp files for this site)
    const currentFileCount = await countLeadFiles(c.env.DB, siteId, null);
    if (currentFileCount >= FILE_UPLOAD_CONSTRAINTS.maxFilesPerLead * 10) { // Allow some buffer for multiple applicants
      return c.json({
        error: 'Too many pending files',
        message: 'Too many temporary files. Please submit your application or wait.',
      }, 429);
    }

    // Generate R2 key for temp file
    const fileId = generateId('file');
    const r2Key = `${siteId}/leads/temp/${fileId}-${file.name}`;

    // Upload to R2 PRIVATE_BUCKET
    await c.env.PRIVATE_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Layer 4: Post-upload verification
    const uploadedObject = await c.env.PRIVATE_BUCKET.head(r2Key);
    if (!uploadedObject) {
      throw new Error('File upload failed - file not found after upload');
    }
    if (uploadedObject.size > FILE_UPLOAD_CONSTRAINTS.maxFileSize) {
      // Delete oversized file
      await c.env.PRIVATE_BUCKET.delete(r2Key);
      return c.json({
        error: 'File too large',
        message: 'File size exceeds maximum after upload',
      }, 413);
    }

    // Create temp file record in database
    const tempFile = await createTempLeadFile(c.env.DB, siteId, {
      fileType: fileType as any,
      fileName: file.name,
      fileSize: uploadedObject.size,
      mimeType: file.type,
      r2Key,
    });

    const response: FileUploadResponse = {
      fileId: tempFile.id,
      fileName: file.name,
      fileSize: uploadedObject.size,
      fileType: fileType as any,
      uploadedAt: tempFile.uploadedAt,
    };

    return c.json({
      success: true,
      data: response,
    }, 201);
  } catch (error) {
    console.error('Error uploading file:', error);
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

    // Create the lead
    const lead = await createLead(c.env.DB, siteId, body);

    // Associate uploaded files with the lead (if any)
    if (body.fileIds && Array.isArray(body.fileIds) && body.fileIds.length > 0) {
      const fileCount = await associateFilesWithLead(c.env.DB, siteId, lead.id, body.fileIds);
      console.log(`Associated ${fileCount} files with lead ${lead.id}`);

      // TODO: Move files from temp/ to leads/{leadId}/ in R2
      // This can be done in a background task or scheduled worker
    }

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
