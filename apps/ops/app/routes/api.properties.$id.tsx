import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getPropertyWithUnits, updateProperty, deleteProperty } from '~/lib/db.server';
import { UpdatePropertySchema } from '@leaselab/shared-config';

export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Property ID required' }, { status: 400 });
  }

  try {
    const property = await getPropertyWithUnits(db, id);

    if (!property) {
      return json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    return json({ success: true, data: property });
  } catch (error) {
    console.error('Error fetching property:', error);
    return json({ success: false, error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Property ID required' }, { status: 400 });
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    try {
      const body = await request.json();
      const parsed = UpdatePropertySchema.safeParse(body);

      if (!parsed.success) {
        return json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten()
        }, { status: 400 });
      }

      await updateProperty(db, id, parsed.data);
      const updated = await getPropertyWithUnits(db, id);

      return json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating property:', error);
      return json({ success: false, error: 'Failed to update property' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      await deleteProperty(db, id);
      return json({ success: true, message: 'Property deleted' });
    } catch (error) {
      console.error('Error deleting property:', error);
      return json({ success: false, error: 'Failed to delete property' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
