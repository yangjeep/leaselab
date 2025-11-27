import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { fetchPropertyWithUnitsFromWorker, savePropertyToWorker, deletePropertyToWorker } from '~/lib/worker-client';
import { UpdatePropertySchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Property ID required' }, { status: 400 });
  }

  try {
    const property = await fetchPropertyWithUnitsFromWorker(env, siteId, id);

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
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
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

      await savePropertyToWorker(env, siteId, { id, ...parsed.data });
      const updated = await fetchPropertyWithUnitsFromWorker(env, siteId, id);

      return json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating property:', error);
      return json({ success: false, error: 'Failed to update property' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      await deletePropertyToWorker(env, siteId, id);
      return json({ success: true, message: 'Property deleted' });
    } catch (error) {
      console.error('Error deleting property:', error);
      return json({ success: false, error: 'Failed to delete property' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
