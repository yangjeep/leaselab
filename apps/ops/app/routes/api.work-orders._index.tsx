import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { CreateWorkOrderSchema } from '~/shared/config';
import { fetchWorkOrdersFromWorker, saveWorkOrderToWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';

// GET /api/work-orders
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const url = new URL(request.url);

  const status = url.searchParams.get('status') || undefined;
  const propertyId = url.searchParams.get('propertyId') || undefined;

  try {
    const workOrders = await fetchWorkOrdersFromWorker(env, siteId);
    return json({ success: true, data: workOrders });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/work-orders
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  try {
    const body = await request.json();
    const validationResult = CreateWorkOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return json(
        { success: false, error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const workOrder = await saveWorkOrderToWorker(env, siteId, {
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      scheduledDate: data.scheduledDate,
    });

    return json({ success: true, data: workOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
