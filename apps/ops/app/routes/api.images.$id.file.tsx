import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { getImageById } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';
import { generateImageResizingUrl } from '@leaselab/shared-utils';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.FILE_BUCKET;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return new Response('Image ID required', { status: 400 });
  }

  if (!bucket) {
    console.error('Storage bucket (FILE_BUCKET) not configured in environment');
    return new Response('Storage not configured', { status: 500 });
  }

  try {
    const image = await getImageById(db, siteId, id);

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

    // Otherwise, serve directly from R2
    const object = await bucket.get(image.r2Key);

    if (!object) {
      // Return a 1x1 transparent PNG as placeholder
      // 1x1 transparent PNG bytes
      const transparentPng = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0,
        0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1,
        13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
      ]);

      const headers = new Headers();
      headers.set('Content-Type', 'image/png');
      headers.set('Cache-Control', 'no-cache');
      headers.set('X-Image-Missing', 'true');
      return new Response(transparentPng, {
        status: 200,
        headers
      });
    }

    // Return the file with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', image.contentType);
    headers.set('Content-Length', image.sizeBytes.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    if (image.filename) {
      headers.set('Content-Disposition', `inline; filename="${image.filename}"`);
    }

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response('Failed to serve image', { status: 500 });
  }
}
