import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getUnits, createUnit } from '~/lib/db.server';
import { CreateUnitSchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const url = new URL(request.url);
  const propertyId = url.searchParams.get('propertyId') || undefined;
  const status = url.searchParams.get('status') as 'available' | 'occupied' | 'maintenance' | 'pending' | undefined;

  try {
    const units = await getUnits(db, siteId, { propertyId, status, isActive: true });
    return json({ success: true, data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return json({ success: false, error: 'Failed to fetch units' }, { status: 500 });
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

    // Extract propertyId from body since it's required
    const { propertyId, ...unitData } = body;

    if (!propertyId) {
      return json({ success: false, error: 'propertyId is required' }, { status: 400 });
    }

    const parsed = CreateUnitSchema.safeParse(unitData);

    if (!parsed.success) {
      return json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const unit = await createUnit(db, siteId, { propertyId, ...parsed.data });
    return json({ success: true, data: unit }, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return json({ success: false, error: 'Failed to create unit' }, { status: 500 });
  }
}
