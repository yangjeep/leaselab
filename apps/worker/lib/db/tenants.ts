import type { Tenant, Lease } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper functions
function mapTenantFromDb(row: unknown): Tenant {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        leadId: r.lead_id as string | undefined,
        firstName: r.first_name as string,
        lastName: r.last_name as string,
        email: r.email as string,
        phone: r.phone as string,
        emergencyContact: r.emergency_contact as string | undefined,
        emergencyPhone: r.emergency_phone as string | undefined,
        status: r.status as Tenant['status'],
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

function mapTenantWithLeaseFromDb(row: unknown): Tenant {
    const r = row as Record<string, unknown>;
    const tenant = mapTenantFromDb(row);

    // Add computed fields from joins
    if (r.lease_id) {
        tenant.currentLease = {
            id: r.lease_id as string,
            propertyId: r.property_id as string,
            unitId: r.unit_id as string | undefined,
            tenantId: tenant.id,
            startDate: r.lease_start_date as string,
            endDate: r.lease_end_date as string,
            monthlyRent: r.monthly_rent as number,
            securityDeposit: 0, // Not included in this query
            status: r.lease_status as Lease['status'],
            createdAt: '',
            updatedAt: '',
        };
    }

    if (r.property_name) {
        tenant.property = {
            id: r.property_id as string,
            name: r.property_name as string,
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
            id: r.unit_id as string,
            propertyId: r.property_id as string,
            unitNumber: r.unit_number as string,
            name: r.unit_name as string | undefined,
            bedrooms: 0,
            bathrooms: 0,
            rentAmount: r.monthly_rent as number,
            status: 'occupied',
            floor: undefined,
            features: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
        };
    }

    tenant.activeWorkOrderCount = r.active_work_order_count as number | undefined;

    return tenant;
}

export async function getTenants(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<Tenant[]> {
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
    const params: (string | number)[] = [siteId];

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

    const orderColumn = sortBy === 'propertyName' ? 'p.name' :
        sortBy === 'unitNumber' ? 'u.unit_number' :
            `t.${sortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}`;

    const results = await db.query(query, params);
    return results.map(mapTenantWithLeaseFromDb);
}

export async function getTenantById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Tenant | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM tenants WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapTenantFromDb(result) : null;
}
