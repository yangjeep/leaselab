import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getLeadById, getLeadFiles, getPropertyById, getUnitsByPropertyId, createAIEvaluation, updateLead } from '~/lib/db.server';
import { runLeadAIEvaluation, generateSignedUrls } from '~/lib/ai.server';
import { getSiteId } from '~/lib/site.server';

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const { id: leadId } = params;
  if (!leadId) {
    return json({ success: false, error: 'Lead ID required' }, { status: 400 });
  }

  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.FILE_BUCKET;
  const openaiApiKey = context.cloudflare.env.OPENAI_API_KEY;
  const siteId = getSiteId(request);

  if (!openaiApiKey) {
    return json(
      { success: false, error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch lead
    const lead = await getLeadById(db, siteId, leadId);
    if (!lead) {
      return json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Fetch property for context
    const property = await getPropertyById(db, siteId, lead.propertyId);
    if (!property) {
      return json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Get units for the property to determine rent amount
    const units = await getUnitsByPropertyId(db, siteId, lead.propertyId);
    const rentAmount = units.length > 0 ? units[0].rentAmount : 0; // Use first unit's rent as typical

    // Fetch files
    const files = await getLeadFiles(db, siteId, leadId);

    // Update status to evaluating
    await updateLead(db, siteId, leadId, { status: 'ai_evaluating' });

    // Generate signed URLs for files
    const signedUrls = await generateSignedUrls(bucket, files);

    // Run AI evaluation
    const result = await runLeadAIEvaluation(openaiApiKey, {
      lead,
      files,
      propertyRent: rentAmount,
      signedUrls,
    });

    // Save evaluation
    const evaluation = await createAIEvaluation(db, siteId, {
      leadId,
      score: result.score,
      label: result.label,
      summary: result.summary,
      riskFlags: result.risk_flags,
      recommendation: result.recommendation,
      fraudSignals: result.fraud_signals,
      modelVersion: result.model_version,
    });

    // Update lead with AI results
    await updateLead(db, siteId, leadId, {
      status: 'ai_evaluated',
      aiScore: result.score,
      aiLabel: result.label,
    });

    return json({
      success: true,
      data: {
        evaluationId: evaluation.id,
        score: result.score,
        label: result.label,
        summary: result.summary,
        recommendation: result.recommendation,
      },
    });
  } catch (error) {
    console.error('Error running AI evaluation:', error);

    // Reset status on failure
    await updateLead(db, siteId, leadId, { status: 'documents_received' });

    return json(
      { success: false, error: 'AI evaluation failed' },
      { status: 500 }
    );
  }
}
