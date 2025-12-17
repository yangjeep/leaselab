import { normalizeDb } from './helpers';
import { generateId } from '../../../../shared/utils';
// Mapper functions
function mapTenantFromDb(row) {
    const r = row;
    return {
        id: r.id,
        leadId: r.lead_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        emergencyContact: r.emergency_contact,
        emergencyPhone: r.emergency_phone,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapTenantWithLeaseFromDb(row) {
    const r = row;
    const tenant = mapTenantFromDb(row);
    // Add computed fields from joins
    if (r.lease_id) {
        tenant.currentLease = {
            id: r.lease_id,
            propertyId: r.property_id,
            unitId: r.unit_id,
            tenantId: tenant.id,
            startDate: r.lease_start_date,
            endDate: r.lease_end_date,
            monthlyRent: r.monthly_rent,
            securityDeposit: 0, // Not included in this query
            status: r.lease_status,
            createdAt: '',
            updatedAt: '',
        };
    }
    if (r.property_name) {
        tenant.property = {
            id: r.property_id,
            name: r.property_name,
            slug: '',
            address: '',
            city: '',
            province: '',
            postalCode: '',
            propertyType: 'single_family',
            amenities: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
        };
    }
    if (r.unit_number) {
        tenant.unit = {
            id: r.unit_id,
            propertyId: r.property_id,
            unitNumber: r.unit_number,
            name: r.unit_name,
            bedrooms: 0,
            bathrooms: 0,
            rentAmount: r.monthly_rent,
            status: 'occupied',
            floor: undefined,
            features: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
        };
    }
    tenant.activeWorkOrderCount = r.active_work_order_count;
    return tenant;
}
export async function getTenants(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    const { status, propertyId, unitId, sortBy = 'created_at', sortOrder = 'desc' } = options || {};
    // Build query to join with current leases and count active work orders
    let query = `
    SELECT
      t.*,
      l.id as lease_id,
      l.property_id,
      l.unit_id,
      l.start_date as lease_start_date,
      l.end_date as lease_end_date,
      l.monthly_rent,
      l.status as lease_status,
      p.name as property_name,
      u.unit_number,
      u.name as unit_name,
      (SELECT COUNT(*) FROM work_orders WHERE tenant_id = t.id AND status IN ('open', 'in_progress', 'scheduled')) as active_work_order_count
    FROM tenants t
    LEFT JOIN leases l ON t.id = l.tenant_id AND l.status IN ('active', 'signed')
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN units u ON l.unit_id = u.id
    WHERE t.site_id = ?
  `;
    const params = [siteId];
    if (status) {
        query += ' AND t.status = ?';
        params.push(status);
    }
    if (propertyId) {
        query += ' AND l.property_id = ?';
        params.push(propertyId);
    }
    if (unitId) {
        query += ' AND l.unit_id = ?';
        params.push(unitId);
    }
    // Map sort fields to database columns
    let orderColumn;
    if (sortBy === 'propertyName' || sortBy === 'property_name') {
        orderColumn = 'p.name';
    }
    else if (sortBy === 'unitNumber' || sortBy === 'unit_number') {
        orderColumn = 'u.unit_number';
    }
    else if (sortBy === 'activeWorkOrderCount' || sortBy === 'active_work_order_count') {
        orderColumn = 'active_work_order_count';
    }
    else {
        orderColumn = `t.${sortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    }
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}`;
    const results = await db.query(query, params);
    return results.map(mapTenantWithLeaseFromDb);
}
export async function getTenantById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM tenants WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapTenantFromDb(result) : null;
}
export async function createTenant(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('tenant');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO tenants (id, site_id, lead_id, first_name, last_name, email, phone, emergency_contact, emergency_phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.leadId || null,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.emergencyContact || null,
        data.emergencyPhone || null,
        data.status,
        now,
        now
    ]);
    return (await getTenantById(db, siteId, id));
}
export async function updateTenant(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.firstName !== undefined) {
        updates.push('first_name = ?');
        params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
        updates.push('last_name = ?');
        params.push(data.lastName);
    }
    if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email);
    }
    if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone);
    }
    if (data.emergencyContact !== undefined) {
        updates.push('emergency_contact = ?');
        params.push(data.emergencyContact || null);
    }
    if (data.emergencyPhone !== undefined) {
        updates.push('emergency_phone = ?');
        params.push(data.emergencyPhone || null);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id, siteId);
    await db.execute(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, params);
}
export async function deleteTenant(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM tenants WHERE id = ? AND site_id = ?', [id, siteId]);
}
