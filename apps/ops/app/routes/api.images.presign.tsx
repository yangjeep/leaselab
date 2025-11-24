import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { ImageUploadPresignSchema } from '@leaselab/shared-config';
import { generateId } from '@leaselab/shared-utils';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const parsed = ImageUploadPresignSchema.safeParse(body);

    if (!parsed.success) {
      return json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const { entityType, entityId, filename, contentType, sizeBytes } = parsed.data;

    // Generate unique R2 key
    const timestamp = Date.now();
    const uniqueId = generateId('img');
    const ext = filename.split('.').pop() || 'bin';
    const r2Key = `${entityType}/${entityId}/${timestamp}-${uniqueId}.${ext}`;

    // Get the R2 bucket
    const bucket = context.cloudflare.env.FILE_BUCKET;

    if (!bucket) {
      return json({ success: false, error: 'Storage not configured' }, { status: 500 });
    }

    // For Cloudflare Workers, we'll use a custom upload approach
    // Return the key and a temporary upload endpoint
    return json({
      success: true,
      data: {
        r2Key,
        uploadUrl: `/api/images/upload?key=${encodeURIComponent(r2Key)}&contentType=${encodeURIComponent(contentType)}`,
        // For direct client-side uploads, you would use:
        // uploadUrl: await bucket.createMultipartUpload(r2Key).then(upload => upload.uploadId)
      }
    });
  } catch (error) {
    console.error('Error creating presigned URL:', error);
    return json({ success: false, error: 'Failed to create upload URL' }, { status: 500 });
  }
}
