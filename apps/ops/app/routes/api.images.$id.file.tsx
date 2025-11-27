import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { fetchImageFromWorker, getImageServeUrl } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { generateImageResizingUrl } from '~/shared/utils';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return new Response('Image ID required', { status: 400 });
  }

  try {
    const image = await fetchImageFromWorker(workerEnv, siteId, id);

    if (!image) {
      return new Response('Image not found in database', { status: 404 });
    }

    // Check for resizing parameters
    const url = new URL(request.url);
    const width = url.searchParams.get('width');
    const height = url.searchParams.get('height');
    const quality = url.searchParams.get('quality');
    const fit = url.searchParams.get('fit');
    const format = url.searchParams.get('format');

    // If we have resizing parameters and a public URL is configured, redirect to Cloudflare Image Resizing
    const publicUrl = context.cloudflare.env.R2_PUBLIC_URL;
    if (publicUrl && (width || height || quality || fit || format)) {
      const resizingUrl = generateImageResizingUrl(
        publicUrl,
        image.r2Key,
        {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          quality: quality ? parseInt(quality) : undefined,
          fit: fit as any,
          format: format as any,
        }
      );
      return redirect(resizingUrl, { status: 302 });
    }

    // Redirect to worker serve endpoint
    const serveUrl = getImageServeUrl(workerEnv, id);
    return redirect(serveUrl, { status: 302 });
  } catch (error) {
    return new Response('Failed to serve image', { status: 500 });
  }
}
