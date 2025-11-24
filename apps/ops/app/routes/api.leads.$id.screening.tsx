import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getLeadById, updateLead } from '~/lib/db.server';
import { generateId } from '@leaselab/shared-utils';

// Placeholder for Certn/SingleKey screening integration
export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const { id: leadId } = params;
  if (!leadId) {
    return json({ success: false, error: 'Lead ID required' }, { status: 400 });
  }

  const db = context.cloudflare.env.DB;

  try {
    // Verify lead exists
    const lead = await getLeadById(db, leadId);
    if (!lead) {
      return json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Update status
    await updateLead(db, leadId, { status: 'screening' });

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
