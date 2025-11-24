import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getImageById, updateImage, deleteImage } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Image ID required' }, { status: 400 });
  }

  try {
    const image = await getImageById(db, siteId, id);

    if (!image) {
      return json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
    const imageWithUrl = {
      ...image,
      url: baseUrl ? `${baseUrl}/${image.r2Key}` : `/api/images/${image.id}/file`,
    };

    return json({ success: true, data: imageWithUrl });
  } catch (error) {
    console.error('Error fetching image:', error);
    return json({ success: false, error: 'Failed to fetch image' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.FILE_BUCKET;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Image ID required' }, { status: 400 });
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    try {
      const body = await request.json();
      await updateImage(db, siteId, id, body);
      const updated = await getImageById(db, siteId, id);

      const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
      const imageWithUrl = updated ? {
        ...updated,
        url: baseUrl ? `${baseUrl}/${updated.r2Key}` : `/api/images/${updated.id}/file`,
      } : null;

      return json({ success: true, data: imageWithUrl });
    } catch (error) {
      console.error('Error updating image:', error);
      return json({ success: false, error: 'Failed to update image' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      // Get image to find R2 key
      const image = await getImageById(db, siteId, id);

      if (image && bucket) {
        // Delete from R2
        await bucket.delete(image.r2Key);
      }

      // Delete from database
      await deleteImage(db, siteId, id);

      return json({ success: true, message: 'Image deleted' });
    } catch (error) {
      console.error('Error deleting image:', error);
      return json({ success: false, error: 'Failed to delete image' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
