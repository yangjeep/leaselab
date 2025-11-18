import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { updateImage } from '~/lib/db.server';
import { ReorderImagesSchema } from '@leaselab/shared-config';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const db = context.cloudflare.env.DB;

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

    // Update sort order for each image
    await Promise.all(
      imageIds.map((imageId, index) =>
        updateImage(db, imageId, { sortOrder: index })
      )
    );

    return json({ success: true, message: 'Images reordered' });
  } catch (error) {
    console.error('Error reordering images:', error);
    return json({ success: false, error: 'Failed to reorder images' }, { status: 500 });
  }
}
