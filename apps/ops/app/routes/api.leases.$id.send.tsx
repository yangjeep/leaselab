import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { generateId } from '@rental/shared-utils';

// Placeholder for DocuSign integration
export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const { id: leaseId } = params;
  if (!leaseId) {
    return json({ success: false, error: 'Lease ID required' }, { status: 400 });
  }

  try {
    // Placeholder response - in production, this would integrate with DocuSign
    const envelopeId = generateId('env');

    return json({
      success: true,
      data: {
        envelopeId,
        status: 'sent',
        message: 'Lease sent for signature. DocuSign integration pending.',
        signers: [
          {
            email: 'tenant@example.com',
            name: 'Tenant Name',
            status: 'sent',
          },
        ],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending lease:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
