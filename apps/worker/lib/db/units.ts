import type { Unit, UnitHistory, UnitStatus, UnitEventType, Tenant } from '../../../../shared/types';
import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Import related functions
import { getPropertyById } from './properties';
import { getImagesByEntity } from './images';
import { getTenantById } from './tenants';

// Mapper functions
function mapUnitFromDb(row: unknown): Unit {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        propertyId: r.property_id as string,
        unitNumber: r.unit_number as string,
        name: r.name as string | undefined,
        bedrooms: r.bedrooms as number,
        bathrooms: r.bathrooms as number,
        sqft: r.sqft as number | undefined,
        rentAmount: r.rent_amount as number,
        depositAmount: r.deposit_amount as number | undefined,
        status: r.status as Unit['status'],
        floor: r.floor as number | undefined,
        features: JSON.parse(r.features as string || '[]'),
        availableDate: r.available_date as string | undefined,
        currentTenantId: r.current_tenant_id as string | undefined,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

function mapUnitHistoryFromDb(row: unknown): UnitHistory {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        unitId: r.unit_id as string,
        eventType: r.event_type as UnitHistory['eventType'],
        eventData: JSON.parse(r.event_data as string || '{}'),
        createdAt: r.created_at as string,
    };
}

export async function getUnits(dbInput: DatabaseInput, siteId: string, options?: {
    propertyId?: string;
    status?: UnitStatus;
    isActive?: boolean;
}): Promise<Unit[]> {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM units WHERE site_id = ?';
    const params: (string | number)[] = [siteId];

    if (options?.propertyId) {
        query += ' AND property_id = ?';
        params.push(options.propertyId);
    }
    if (options?.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options?.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(options.isActive ? 1 : 0);
    }

    query += ' ORDER BY unit_number ASC';
    const results = await db.query(query, params);
    return results.map(mapUnitFromDb);
}

export async function getUnitsByPropertyId(dbInput: DatabaseInput, siteId: string, propertyId: string): Promise<Unit[]> {
    const db = normalizeDb(dbInput);
    return getUnits(db, siteId, { propertyId });
}

export async function getUnitById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM units WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapUnitFromDb(result) : null;
}

export async function getUnitWithDetails(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null> {
    const db = normalizeDb(dbInput);
    const unit = await getUnitById(db, siteId, id);
    if (!unit) return null;

    const property = await getPropertyById(db, siteId, unit.propertyId);
    const images = await getImagesByEntity(db, siteId, 'unit', id);

    let currentTenant: Tenant | undefined;
    if (unit.currentTenantId) {
        currentTenant = await getTenantById(db, siteId, unit.currentTenantId) || undefined;
    }

    return {
        ...unit,
        property: property || undefined,
        images,
        currentTenant,
    };
}

export async function createUnit(dbInput: DatabaseInput, siteId: string, data: {
    propertyId: string;
    unitNumber: string;
    name?: string;
    bedrooms: number;
    bathrooms: number;
    sqft?: number;
    rentAmount: number;
    depositAmount?: number;
    status?: UnitStatus;
    floor?: number;
    features?: string[];
    availableDate?: string;
}): Promise<Unit> {
    const db = normalizeDb(dbInput);
    const id = generateId('unit');
    const now = new Date().toISOString();

    await db.execute(`
    INSERT INTO units (id, site_id, property_id, unit_number, name, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status, floor, features, available_date, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
        id,
        siteId,
        data.propertyId,
        data.unitNumber,
        data.name || null,
        data.bedrooms,
        data.bathrooms,
        data.sqft || null,
        data.rentAmount,
        data.depositAmount || null,
        data.status || 'available',
        data.floor || null,
        JSON.stringify(data.features || []),
        data.availableDate || null,
        now,
        now
    ]);

    return (await getUnitById(db, siteId, id))!;
}

export async function updateUnit(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    unitNumber: string;
    name: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    rentAmount: number;
    depositAmount: number;
    status: UnitStatus;
    floor: number;
    features: string[];
    availableDate: string;
    currentTenantId: string | null;
    isActive: boolean;
}>): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
        unitNumber: 'unit_number',
        name: 'name',
        bedrooms: 'bedrooms',
        bathrooms: 'bathrooms',
        sqft: 'sqft',
        rentAmount: 'rent_amount',
        depositAmount: 'deposit_amount',
        status: 'status',
        floor: 'floor',
        availableDate: 'available_date',
        currentTenantId: 'current_tenant_id',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key as keyof typeof data] !== undefined) {
            updates.push(`${dbField} = ?`);
            params.push(data[key as keyof typeof data] as string | number | null);
        }
    }

    if (data.features !== undefined) {
        updates.push('features = ?');
        params.push(JSON.stringify(data.features));
    }

    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.execute(`UPDATE units SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteUnit(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM units WHERE id = ? AND site_id = ?', [id, siteId]);
}

// Unit History
export async function getUnitHistory(dbInput: DatabaseInput, siteId: string, unitId: string): Promise<UnitHistory[]> {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM unit_history WHERE unit_id = ? AND site_id = ? ORDER BY created_at DESC', [unitId, siteId]);
    return results.map(mapUnitHistoryFromDb);
}

export async function createUnitHistory(dbInput: DatabaseInput, siteId: string, data: {
    unitId: string;
    eventType: UnitEventType;
    eventData: Record<string, unknown>;
}): Promise<UnitHistory> {
    const db = normalizeDb(dbInput);
    const id = generateId('hist');
    const now = new Date().toISOString();

    await db.execute(`
    INSERT INTO unit_history (id, site_id, unit_id, event_type, event_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.unitId,
        data.eventType,
        JSON.stringify(data.eventData),
        now
    ]);

    return {
        id,
        unitId: data.unitId,
        eventType: data.eventType,
        eventData: data.eventData,
        createdAt: now,
    };
}
