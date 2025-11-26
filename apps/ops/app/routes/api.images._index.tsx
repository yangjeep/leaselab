import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createImage, getImagesByEntity, updateImage, deleteImage } from '~/lib/db.server';
import { RegisterImageSchema, ReorderImagesSchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.FILE_BUCKET;
  const siteId = getSiteId(request);
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entityType') as 'property' | 'unit';
  const entityId = url.searchParams.get('entityId');

  if (!entityType || !entityId) {
    return json({ success: false, error: 'entityType and entityId required' }, { status: 400 });
  }

  try {
    const images = await getImagesByEntity(db, siteId, entityType, entityId);

    // Generate URLs for images
    const imagesWithUrls = await Promise.all(
      images.map(async (img) => {
        // For R2, we can generate a public URL or use a signed URL
        // This assumes you have a public bucket or custom domain configured
        const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
        return {
          ...img,
          url: baseUrl ? `${baseUrl}/${img.r2Key}` : `/api/images/${img.id}/file`,
        };
      })
    );

    return json({ success: true, data: imagesWithUrls });
  } catch (error) {
    console.error('Error fetching images:', error);
    return json({ success: false, error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
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

      const image = await createImage(db, siteId, parsed.data);

      // Generate URL for the new image
      const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
      const imageWithUrl = {
        ...image,
        url: baseUrl ? `${baseUrl}/${image.r2Key}` : `/api/images/${image.id}/file`,
      };

      return json({ success: true, data: imageWithUrl }, { status: 201 });
    } catch (error) {
      console.error('Error registering image:', error);
      return json({ success: false, error: 'Failed to register image' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
