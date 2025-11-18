import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getUnitById, updateUnit, createUnitHistory, getTenantById } from '~/lib/db.server';

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  try {
    // Verify unit exists
    const unit = await getUnitById(db, id);
    if (!unit) {
      return json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    if (!unit.currentTenantId) {
      return json({ success: false, error: 'Unit has no tenant assigned' }, { status: 400 });
    }

    // Get tenant info for history
    const tenant = await getTenantById(db, unit.currentTenantId);
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown';

    // Update unit to remove tenant
    await updateUnit(db, id, {
      currentTenantId: null,
      status: 'available',
    });

    // Create history record
    await createUnitHistory(db, {
      unitId: id,
      eventType: 'tenant_move_out',
      eventData: {
        tenantId: unit.currentTenantId,
        tenantName,
        moveOutDate: new Date().toISOString().split('T')[0],
      },
    });

    return json({ success: true, message: 'Tenant removed successfully' });
  } catch (error) {
    console.error('Error removing tenant:', error);
    return json({ success: false, error: 'Failed to remove tenant' }, { status: 500 });
  }
}
