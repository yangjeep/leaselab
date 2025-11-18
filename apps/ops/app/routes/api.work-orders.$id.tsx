import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { UpdateWorkOrderSchema } from '@leaselab/shared-config';
import { getWorkOrderById, updateWorkOrder, deleteWorkOrder } from '~/lib/db.server';

// GET /api/work-orders/:id
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return json({ success: false, error: 'Work order ID required' }, { status: 400 });
  }

  const db = context.cloudflare.env.DB;

  try {
    const workOrder = await getWorkOrderById(db, id);
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

  const db = context.cloudflare.env.DB;

  try {
    // Check if work order exists
    const existing = await getWorkOrderById(db, id);
    if (!existing) {
      return json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // DELETE
    if (request.method === 'DELETE') {
      await deleteWorkOrder(db, id);
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

      await updateWorkOrder(db, id, validationResult.data);
      const updated = await getWorkOrderById(db, id);
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
