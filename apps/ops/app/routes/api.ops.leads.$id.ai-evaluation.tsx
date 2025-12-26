import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getSiteId } from '~/lib/site.server';
import { getSessionCookie, verifySessionCookie } from '~/lib/session-cookie.server';

/**
 * POST /api/ops/leads/:id/ai-evaluation
 * Forwards the evaluation job request to the worker API.
 */
export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'MethodNotAllowed' }, { status: 405 });
  }

  const leadId = params.id;
  if (!leadId) {
    return json({ success: false, error: 'LeadIdRequired' }, { status: 400 });
  }

  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const sessionSecret = env.SESSION_SECRET as string;

  const cookie = getSessionCookie(request);
  if (!cookie) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookie, sessionSecret);
  if (!session) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const forceRefresh = formData.get('force_refresh') === 'true';
  const reason = formData.get('reason');

  const payload: Record<string, unknown> = {
    force_refresh: forceRefresh,
  };

  if (typeof reason === 'string' && reason.trim().length > 0) {
    payload.reason = reason.trim();
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('X-Site-Id', siteId);
  headers.set('X-User-Id', session.userId);

  if (env.WORKER_INTERNAL_KEY) {
    headers.set('X-Internal-Key', env.WORKER_INTERNAL_KEY);
  }

  const workerUrl = `${env.WORKER_URL}/api/ops/leads/${leadId}/ai-evaluation`;

  try {
    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseBody = await workerResponse.text();
    let jsonBody: any;

    try {
      jsonBody = JSON.parse(responseBody);
    } catch {
      jsonBody = {
        success: workerResponse.ok,
        error: 'InvalidWorkerResponse',
        message: responseBody || 'Worker returned non-JSON response',
      };
    }

    return json(jsonBody, { status: workerResponse.status });
  } catch (error) {
    console.error('Failed to run AI evaluation:', error);
    return json(
      { success: false, error: 'InternalError', message: 'Failed to create AI evaluation job' },
      { status: 500 }
    );
  }
}
