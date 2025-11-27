import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { reorderImagesToWorker } from '~/lib/worker-client';
import { ReorderImagesSchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);

  try {
    const body = await request.json();
    const parsed = ReorderImagesSchema.safeParse(body);

    if (!parsed.success) {
      return json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const { imageIds } = parsed.data;

    // Reorder via worker API
    await reorderImagesToWorker(workerEnv, siteId, imageIds);

    return json({ success: true, message: 'Images reordered' });
  } catch (error) {
    console.error('Error reordering images:', error);
    return json({ success: false, error: 'Failed to reorder images' }, { status: 500 });
  }
}
