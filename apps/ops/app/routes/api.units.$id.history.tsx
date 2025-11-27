import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { fetchUnitHistoryFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  try {
    const history = await fetchUnitHistoryFromWorker(workerEnv, siteId, id);
    return json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching unit history:', error);
    return json({ success: false, error: 'Failed to fetch unit history' }, { status: 500 });
  }
}
