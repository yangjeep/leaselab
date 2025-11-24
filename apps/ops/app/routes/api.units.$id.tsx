import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { getUnitWithDetails, updateUnit, deleteUnit, createUnitHistory } from '~/lib/db.server';
import { UpdateUnitSchema, AssignTenantSchema } from '@leaselab/shared-config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  try {
    const unit = await getUnitWithDetails(db, siteId, id);

    if (!unit) {
      return json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    return json({ success: true, data: unit });
  } catch (error) {
    console.error('Error fetching unit:', error);
    return json({ success: false, error: 'Failed to fetch unit' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    try {
      const body = await request.json();
      const parsed = UpdateUnitSchema.safeParse(body);

      if (!parsed.success) {
        return json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten()
        }, { status: 400 });
      }

      // Track status changes
      const currentUnit = await getUnitWithDetails(db, siteId, id);
      if (currentUnit && parsed.data.status && parsed.data.status !== currentUnit.status) {
        await createUnitHistory(db, siteId, {
          unitId: id,
          eventType: 'status_change',
          eventData: {
            previousStatus: currentUnit.status,
            newStatus: parsed.data.status,
          },
        });
      }

      // Track rent changes
      if (currentUnit && parsed.data.rentAmount && parsed.data.rentAmount !== currentUnit.rentAmount) {
        await createUnitHistory(db, siteId, {
          unitId: id,
          eventType: 'rent_change',
          eventData: {
            previousRent: currentUnit.rentAmount,
            newRent: parsed.data.rentAmount,
          },
        });
      }

      await updateUnit(db, siteId, id, parsed.data);
      const updated = await getUnitWithDetails(db, siteId, id);

      return json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating unit:', error);
      return json({ success: false, error: 'Failed to update unit' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      await deleteUnit(db, siteId, id);
      return json({ success: true, message: 'Unit deleted' });
    } catch (error) {
      console.error('Error deleting unit:', error);
      return json({ success: false, error: 'Failed to delete unit' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
