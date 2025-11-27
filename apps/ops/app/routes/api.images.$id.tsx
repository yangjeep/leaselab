import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { fetchImageFromWorker, updateImageToWorker, deleteImageToWorker, getImageServeUrl } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Image ID required' }, { status: 400 });
  }

  try {
    const image = await fetchImageFromWorker(workerEnv, siteId, id);

    if (!image) {
      return json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
    const imageWithUrl = {
      ...image,
      url: baseUrl ? `${baseUrl}/${image.r2Key}` : getImageServeUrl(workerEnv, image.id),
    };

    return json({ success: true, data: imageWithUrl });
  } catch (error) {
    console.error('Error fetching image:', error);
    return json({ success: false, error: 'Failed to fetch image' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Image ID required' }, { status: 400 });
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    try {
      const body = await request.json();
      await updateImageToWorker(workerEnv, siteId, id, body);
      const updated = await fetchImageFromWorker(workerEnv, siteId, id);

      const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
      const imageWithUrl = updated ? {
        ...updated,
        url: baseUrl ? `${baseUrl}/${updated.r2Key}` : getImageServeUrl(workerEnv, updated.id),
      } : null;

      return json({ success: true, data: imageWithUrl });
    } catch (error) {
      console.error('Error updating image:', error);
      return json({ success: false, error: 'Failed to update image' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      // Delete via worker (handles both R2 and database)
      await deleteImageToWorker(workerEnv, siteId, id);

      return json({ success: true, message: 'Image deleted' });
    } catch (error) {
      console.error('Error deleting image:', error);
      return json({ success: false, error: 'Failed to delete image' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
