import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getSiteId } from '~/lib/site.server';

/**
 * GET /api/ai-usage
 * Fetch AI evaluation usage and quota for current site
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const workerUrl = `${workerEnv.WORKER_URL}/api/ops/ai-usage?month=${month}`;
    const headers = new Headers();

    if (workerEnv.WORKER_INTERNAL_KEY) {
      headers.set('X-Internal-Key', workerEnv.WORKER_INTERNAL_KEY);
    }
    headers.set('X-Site-Id', siteId);

    const response = await fetch(workerUrl, { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch AI usage');
    }

    return json(data);
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return json(
      {
        success: false,
        error: 'Failed to fetch AI usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
