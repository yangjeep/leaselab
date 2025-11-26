import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST' && request.method !== 'PUT') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(request.url);
  const r2Key = url.searchParams.get('key');
  const contentType = url.searchParams.get('contentType');

  if (!r2Key) {
    return json({ success: false, error: 'Missing key parameter' }, { status: 400 });
  }

  const bucket = context.cloudflare.env.FILE_BUCKET;

  if (!bucket) {
    return json({ success: false, error: 'Storage not configured' }, { status: 500 });
  }

  try {
    // Use request.body (ReadableStream) directly for streaming upload
    // This avoids buffering the entire file in memory
    if (!request.body) {
      throw new Error('No request body found');
    }

    // Upload to R2
    const object = await bucket.put(r2Key, request.body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });

    return json({
      success: true,
      data: {
        r2Key,
        // size: fileData.byteLength, // Size is not easily available with streaming without reading it
      }
    });
  } catch (error) {
    console.error('[Upload] Error uploading to R2:', error);
    return json({
      success: false,
      error: 'Failed to upload file',
    }, { status: 500 });
  }
}
