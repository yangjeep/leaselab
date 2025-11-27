import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { FileUploadSchema } from '~/shared/config';
import { fetchLeadFromWorker, updateLeadToWorker, createLeadFileToWorker } from '~/lib/worker-client';
import { generateId } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const { id: leadId } = params;
  if (!leadId) {
    return json({ success: false, error: 'Lead ID required' }, { status: 400 });
  }

  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const bucket = context.cloudflare.env.PRIVATE_BUCKET; // Use private bucket for application files

  try {
    // Verify lead exists
    const lead = await fetchLeadFromWorker(workerEnv, siteId, leadId);
    if (!lead) {
      return json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = FileUploadSchema.safeParse(body);

    if (!validationResult.success) {
      return json(
        { success: false, error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate R2 key
    const r2Key = `leads/${leadId}/${generateId()}/${data.fileName}`;

    // Create file record via worker
    const file = await createLeadFileToWorker(workerEnv, siteId, leadId, {
      fileType: data.fileType,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      r2Key,
    });

    // Update lead status if this is the first file
    if (lead.status === 'new') {
      await updateLeadToWorker(workerEnv, siteId, leadId, { status: 'documents_pending' });
    }

    // Generate presigned upload URL
    // Note: In production, use proper presigned URL generation for R2
    const uploadUrl = `https://upload.example.com/${r2Key}`;

    return json({
      success: true,
      data: {
        fileId: file.id,
        r2Key,
        uploadUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering file:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
