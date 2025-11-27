import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { UpdateWorkOrderSchema } from '~/shared/config';
import { fetchWorkOrderFromWorker, saveWorkOrderToWorker, deleteWorkOrderToWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

// GET /api/work-orders/:id
export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return json({ success: false, error: 'Work order ID required' }, { status: 400 });
  }

  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);

  try {
    const workOrder = await fetchWorkOrderFromWorker(workerEnv, siteId, id);
    if (!workOrder) {
      return json({ success: false, error: 'Work order not found' }, { status: 404 });
    }
    return json({ success: true, data: workOrder });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT/DELETE /api/work-orders/:id
export async function action({ request, params, context }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    return json({ success: false, error: 'Work order ID required' }, { status: 400 });
  }

  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const siteId = getSiteId(request);

  try {
    // Check if work order exists
    const existing = await fetchWorkOrderFromWorker(workerEnv, siteId, id);
    if (!existing) {
      return json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // DELETE
    if (request.method === 'DELETE') {
      await deleteWorkOrderToWorker(workerEnv, siteId, id);
      return json({ success: true, message: 'Work order deleted' });
    }

    // PUT
    if (request.method === 'PUT') {
      const body = await request.json();
      const validationResult = UpdateWorkOrderSchema.safeParse(body);

      if (!validationResult.success) {
        return json(
          { success: false, error: 'Validation failed', details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      await saveWorkOrderToWorker(workerEnv, siteId, { id, ...validationResult.data });
      const updated = await fetchWorkOrderFromWorker(workerEnv, siteId, id);
      return json({ success: true, data: updated });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error updating work order:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
