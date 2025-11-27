import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { extractBearerToken, validateApiToken } from '~/lib/api-auth.server';
import { fetchPropertyFromWorker } from '~/lib/worker-client';

/**
 * Public API endpoint for fetching a single property by ID
 * Requires Bearer token authentication
 */
export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const { id } = params;

  if (!id) {
    return json(
      { success: false, error: 'Property ID is required' },
      { status: 400 }
    );
  }

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
    // Fetch property
    const property = await fetchPropertyFromWorker(workerEnv, siteId, id);

    if (!property) {
      return json(
        { success: false, error: 'Property not found' },
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

    // Map to public API format
    const listing = {
      id: property.id,
      title: property.name,
      slug: property.id,
      price: property.rent || 0,
      city: property.city,
      address: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
      status: mapStatus(property.status),
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      description: property.description,
      images: property.images?.map((img) => img.url) || [],
      imageUrl: property.images?.[0]?.url,
      pets: 'Conditional',
      parking: 'Available',
    };

    return json(
      {
        success: true,
        data: listing,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching property:', error);
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
export async function action({ request }: ActionFunctionArgs) {
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
 * Map database status to public-facing status
 */
function mapStatus(status?: string): string {
  const statusMap: Record<string, string> = {
    available: 'Available',
    rented: 'Rented',
    maintenance: 'Pending',
    inactive: 'Rented',
  };
  return statusMap[status || 'available'] || 'Available';
}
