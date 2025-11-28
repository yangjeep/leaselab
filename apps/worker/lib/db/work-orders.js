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
export async function getWorkOrders(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM work_orders WHERE site_id = ?';
    const params = [siteId];
    if (options?.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options?.propertyId) {
        query += ' AND property_id = ?';
        params.push(options.propertyId);
    }
    query += ' ORDER BY created_at DESC';
    const results = await db.query(query, params);
    return results.map(mapWorkOrderFromDb);
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
