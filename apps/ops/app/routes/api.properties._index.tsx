import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getProperties, createProperty } from '~/lib/db.server';
import { CreatePropertySchema } from '@leaselab/shared-config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  try {
    const properties = await getProperties(db, siteId, { isActive: true });
    return json({ success: true, data: properties });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return json({ success: false, error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  try {
    const body = await request.json();
    const parsed = CreatePropertySchema.safeParse(body);

    if (!parsed.success) {
      return json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const property = await createProperty(db, siteId, parsed.data);
    return json({ success: true, data: property }, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return json({ success: false, error: 'Failed to create property' }, { status: 500 });
  }
}
