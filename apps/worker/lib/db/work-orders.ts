import type { WorkOrder } from '../../../../shared/types';
import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function
function mapWorkOrderFromDb(row: unknown): WorkOrder {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        propertyId: r.property_id as string,
        tenantId: r.tenant_id as string | undefined,
        title: r.title as string,
        description: r.description as string,
        category: r.category as WorkOrder['category'],
        priority: r.priority as WorkOrder['priority'],
        status: r.status as WorkOrder['status'],
        assignedTo: r.assigned_to as string | undefined,
        scheduledDate: r.scheduled_date as string | undefined,
        completedAt: r.completed_at as string | undefined,
        notes: r.notes as string | undefined,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

export async function getWorkOrders(dbInput: DatabaseInput, siteId: string, options?: { status?: string; propertyId?: string }): Promise<WorkOrder[]> {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM work_orders WHERE site_id = ?';
    const params: string[] = [siteId];

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

export async function getWorkOrderById(dbInput: DatabaseInput, siteId: string, id: string): Promise<WorkOrder | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapWorkOrderFromDb(result) : null;
}

export async function createWorkOrder(dbInput: DatabaseInput, siteId: string, data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WorkOrder> {
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

    return (await getWorkOrderById(db, siteId, id))!;
}

export async function updateWorkOrder(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<WorkOrder>): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fields = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'scheduledDate', 'notes'];
    for (const field of fields) {
        if (data[field as keyof WorkOrder] !== undefined) {
            const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            updates.push(`${dbField} = ?`);
            params.push(data[field as keyof WorkOrder] as string | null);
        }
    }

    if (data.status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.execute(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteWorkOrder(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
}
