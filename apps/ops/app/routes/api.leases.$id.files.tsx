import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { fetchLeaseByIdFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { id: leaseId } = params;
  if (!leaseId) {
    return json({ error: 'Lease ID required' }, { status: 400 });
  }

  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };

  try {
    // Verify lease exists
    const lease = await fetchLeaseByIdFromWorker(workerEnv, siteId, leaseId);
    if (!lease) {
      return json({ error: 'Lease not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string;

    console.log('Lease file upload API:', { leaseId, fileName: file?.name, fileType });

    if (!file || typeof file === 'string') {
      return json({ error: 'Invalid or missing file' }, { status: 400 });
    }

    if (!fileType) {
      return json({ error: 'File type is required' }, { status: 400 });
    }

    // Forward to worker API
    console.log('Forwarding to worker:', `${workerEnv.WORKER_URL}/api/ops/leases/${leaseId}/files`);
    
    const workerFormData = new FormData();
    workerFormData.append('file', file);
    workerFormData.append('fileType', fileType);

    const workerResponse = await fetch(`${workerEnv.WORKER_URL}/api/ops/leases/${leaseId}/files`, {
      method: 'POST',
      headers: {
        'X-Internal-Key': workerEnv.WORKER_INTERNAL_KEY as string,
        'X-Site-Id': siteId,
      },
      body: workerFormData,
    });

    if (!workerResponse.ok) {
      const error = await workerResponse.json().catch(() => ({ error: 'Upload failed' })) as { error?: string };
      console.error('Worker upload failed:', error);
      return json(
        { error: error.error || 'Failed to upload file to worker' },
        { status: workerResponse.status }
      );
    }

    const result = await workerResponse.json() as any;
    console.log('Worker upload success:', result);

    return json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error('Lease file upload error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
