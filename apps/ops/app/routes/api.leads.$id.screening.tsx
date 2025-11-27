import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { fetchLeadFromWorker, updateLeadToWorker } from '~/lib/worker-client';
import { generateId } from '~/shared/utils';
import { getSiteId } from '~/lib/site.server';

// Placeholder for Certn/SingleKey screening integration
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

  try {
    // Verify lead exists
    const lead = await fetchLeadFromWorker(workerEnv, siteId, leadId);
    if (!lead) {
      return json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Update status
    await updateLeadToWorker(workerEnv, siteId, leadId, { status: 'screening' });

    // Placeholder response - in production, this would integrate with Certn/SingleKey
    const screeningId = generateId('scr');

    return json({
      success: true,
      data: {
        screeningId,
        provider: 'placeholder',
        status: 'pending',
        message: 'Screening request submitted. Integration with Certn/SingleKey pending.',
        estimatedCompletion: '24-48 hours',
      },
    });
  } catch (error) {
    console.error('Error initiating screening:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
