import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { LeadSubmissionSchema } from '@rental/shared-config';
import { createLead, getPropertyById } from '~/lib/db.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const db = context.cloudflare.env.DB;

  try {
    const body = await request.json();
    const validationResult = LeadSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return json(
        { success: false, error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify property exists
    const property = await getPropertyById(db, data.propertyId);
    if (!property) {
      return json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Create the lead
    const lead = await createLead(db, {
      propertyId: data.propertyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      currentAddress: data.currentAddress,
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome,
      moveInDate: data.moveInDate,
      message: data.message,
    });

    return json({
      success: true,
      data: {
        leadId: lead.id,
        message: 'Lead submitted successfully',
      },
    }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function loader({ request }: ActionFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
