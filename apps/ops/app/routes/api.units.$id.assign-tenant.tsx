import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getUnitById, updateUnit, createUnitHistory, getTenantById } from '~/lib/db.server';
import { AssignTenantSchema } from '~/shared/config';
import { getSiteId } from '~/lib/site.server';

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = AssignTenantSchema.safeParse(body);

    if (!parsed.success) {
      return json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const { tenantId, moveInDate } = parsed.data;

    // Verify unit exists
    const unit = await getUnitById(db, siteId, id);
    if (!unit) {
      return json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Verify tenant exists
    const tenant = await getTenantById(db, siteId, tenantId);
    if (!tenant) {
      return json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Update unit with tenant and status
    await updateUnit(db, siteId, id, {
      currentTenantId: tenantId,
      status: 'occupied',
    });

    // Create history record
    await createUnitHistory(db, siteId, {
      unitId: id,
      eventType: 'tenant_move_in',
      eventData: {
        tenantId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        moveInDate: moveInDate || new Date().toISOString().split('T')[0],
        previousStatus: unit.status,
      },
    });

    return json({ success: true, message: 'Tenant assigned successfully' });
  } catch (error) {
    console.error('Error assigning tenant:', error);
    return json({ success: false, error: 'Failed to assign tenant' }, { status: 500 });
  }
}
