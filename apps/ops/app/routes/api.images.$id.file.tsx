import type { LoaderFunctionArgs } from '@remix-run/node';
import { getImageById } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.FILE_BUCKET;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return new Response('Image ID required', { status: 400 });
  }

  if (!bucket) {
    return new Response('Storage not configured', { status: 500 });
  }

  try {
    const image = await getImageById(db, siteId, id);

    if (!image) {
      return new Response('Image not found', { status: 404 });
    }

    // Get from R2
    const object = await bucket.get(image.r2Key);

    if (!object) {
      return new Response('File not found in storage', { status: 404 });
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
    console.error('Error serving image:', error);
    return new Response('Failed to serve image', { status: 500 });
  }
}
