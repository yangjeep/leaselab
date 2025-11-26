import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { extractBearerToken, validateApiToken } from '~/lib/api-auth.server';
import type { IDatabase } from '@leaselab/storage-core';

/**
 * Public API endpoint for fetching site configuration
 * Requires Bearer token authentication
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
    const db = context.cloudflare.env.DB;

    // Extract and validate token
    const token = extractBearerToken(request);
    if (!token) {
        return json(
            { success: false, error: 'Missing authorization token' },
            {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            }
        );
    }

    const siteId = await validateApiToken(token, db);
    if (!siteId) {
        return json(
            { success: false, error: 'Invalid or expired token' },
            {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            }
        );
    }

    try {
        // Fetch site configuration
        const config = await getSiteConfig(db, siteId);

        if (!config) {
            return json(
                { success: false, error: 'Site configuration not found' },
                {
                    status: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                }
            );
        }

        return json(
            {
                success: true,
                data: config,
            },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                },
            }
        );
    } catch (error) {
        console.error('Error fetching site config:', error);
        return json(
            { success: false, error: 'Internal server error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            }
        );
    }
}

// Handle CORS preflight
export async function action({ request }: LoaderFunctionArgs) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

/**
 * Fetch site configuration from database
 */
async function getSiteConfig(db: D1Database, siteId: string) {
    const result = await db
        .prepare(
            `SELECT 
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
      WHERE site_id = ?`
        )
        .bind(siteId)
        .first();

    if (!result) return null;

    return {
        siteId: result.site_id,
        siteName: result.site_name,
        about: {
            title: result.about_title,
            description: result.about_description,
            stats: result.about_stats ? JSON.parse(result.about_stats as string) : [],
        },
        branding: {
            logoUrl: result.branding_logo_url,
            primaryColor: result.branding_primary_color,
        },
        contact: {
            email: result.contact_email,
            phone: result.contact_phone,
        },
    };
}
