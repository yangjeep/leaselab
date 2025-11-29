import { generateId } from '../../../../shared/utils';
import { normalizeDb } from './helpers';
// Mapper function
function mapWorkOrderFromDb(row) {
    const r = row;
    return {
        id: r.id,
        propertyId: r.property_id,
        tenantId: r.tenant_id,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        assignedTo: r.assigned_to,
        scheduledDate: r.scheduled_date,
        completedAt: r.completed_at,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
// Mapper function for work orders with details
function mapWorkOrderWithDetailsFromDb(row) {
    const r = row;
    return {
        ...mapWorkOrderFromDb(row),
        propertyName: r.property_name,
        unitNumber: r.unit_number,
    };
}
export async function getWorkOrders(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    // Join with properties to get property name
    // Left join with leases to get unit info (if work order has a tenant)
    let query = `
        SELECT
            wo.*,
            p.name as property_name,
            u.unit_number as unit_number
        FROM work_orders wo
        INNER JOIN properties p ON wo.property_id = p.id
        LEFT JOIN tenants t ON wo.tenant_id = t.id
        LEFT JOIN leases l ON t.id = l.tenant_id AND l.status IN ('active', 'signed')
        LEFT JOIN units u ON l.unit_id = u.id
        WHERE wo.site_id = ?
    `;
    const params = [siteId];
    if (options?.status) {
        query += ' AND wo.status = ?';
        params.push(options.status);
    }
    if (options?.propertyId) {
        query += ' AND wo.property_id = ?';
        params.push(options.propertyId);
    }
    // Add sorting
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    // Map frontend sort fields to database columns
    const sortFieldMap = {
        'title': 'wo.title',
        'category': 'wo.category',
        'priority': 'wo.priority',
        'status': 'wo.status',
        'createdAt': 'wo.created_at',
        'created_at': 'wo.created_at',
        'propertyName': 'p.name',
        'property_name': 'p.name',
        'unitNumber': 'u.unit_number',
        'unit_number': 'u.unit_number',
    };
    const dbSortField = sortFieldMap[sortBy] || 'wo.created_at';
    query += ` ORDER BY ${dbSortField} ${sortOrder.toUpperCase()}`;
    const results = await db.query(query, params);
    return results.map(mapWorkOrderWithDetailsFromDb);
}
export async function getWorkOrderById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapWorkOrderFromDb(result) : null;
}
export async function createWorkOrder(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('wo');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO work_orders (id, site_id, property_id, tenant_id, title, description, category, priority, status, assigned_to, scheduled_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `, [
        id, siteId, data.propertyId, data.tenantId || null, data.title, data.description, data.category, data.priority,
        data.assignedTo || null, data.scheduledDate || null, data.notes || null, now, now
    ]);
    return (await getWorkOrderById(db, siteId, id));
}
export async function updateWorkOrder(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    const fields = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'scheduledDate', 'notes'];
    for (const field of fields) {
        if (data[field] !== undefined) {
            const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            updates.push(`${dbField} = ?`);
            params.push(data[field]);
        }
    }
    if (data.status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteWorkOrder(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
}
