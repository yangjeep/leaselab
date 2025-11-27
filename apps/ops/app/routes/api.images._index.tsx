import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createImageToWorker, fetchImagesFromWorker, getImageServeUrl } from '~/lib/worker-client';
import { RegisterImageSchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entityType') as 'property' | 'unit';
  const entityId = url.searchParams.get('entityId');

  if (!entityType || !entityId) {
    return json({ success: false, error: 'entityType and entityId required' }, { status: 400 });
  }

  try {
    const images = await fetchImagesFromWorker(workerEnv, siteId, entityType, entityId);

    // Generate URLs for images
    const imagesWithUrls = images.map((img: any) => {
      const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
      return {
        ...img,
        url: baseUrl ? `${baseUrl}/${img.r2Key}` : getImageServeUrl(workerEnv, img.id),
      };
    });

    return json({ success: true, data: imagesWithUrls });
  } catch (error) {
    console.error('Error fetching images:', error);
    return json({ success: false, error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const parsed = RegisterImageSchema.safeParse(body);

      if (!parsed.success) {
        return json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten()
        }, { status: 400 });
      }

      const image = await createImageToWorker(workerEnv, siteId, parsed.data);

      // Generate URL for the new image
      const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
      const imageWithUrl = {
        ...image,
        url: baseUrl ? `${baseUrl}/${image.r2Key}` : getImageServeUrl(workerEnv, image.id),
      };

      return json({ success: true, data: imageWithUrl }, { status: 201 });
    } catch (error) {
      console.error('Error registering image:', error);
      return json({ success: false, error: 'Failed to register image' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
