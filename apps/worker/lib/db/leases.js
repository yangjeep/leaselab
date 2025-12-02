import { normalizeDb } from './helpers';
import { generateId } from '../../../../shared/utils';
// Mapper functions
function mapLeaseFromDb(row) {
    const r = row;
    return {
        id: r.id,
        propertyId: r.property_id,
        unitId: r.unit_id,
        tenantId: r.tenant_id,
        startDate: r.start_date,
        endDate: r.end_date,
        monthlyRent: r.monthly_rent,
        securityDeposit: r.security_deposit,
        status: r.status,
        docuSignEnvelopeId: r.docusign_envelope_id,
        signedAt: r.signed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapLeaseWithDetailsFromDb(row) {
    const r = row;
    const lease = mapLeaseFromDb(row);
    // Add property details if joined
    if (r.property_name) {
        lease.property = {
            id: r.property_id,
            name: r.property_name,
            slug: r.property_slug,
            address: r.property_address,
            city: r.property_city,
            province: r.property_province,
            postalCode: r.property_postal_code,
            propertyType: r.property_type,
            amenities: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
        };
    }
    // Add unit details if joined
    if (r.unit_number) {
        lease.unit = {
            id: r.unit_id,
            propertyId: r.property_id,
            unitNumber: r.unit_number,
            name: r.unit_name,
            bedrooms: r.unit_bedrooms,
            bathrooms: r.unit_bathrooms,
            sqft: r.unit_sqft,
            rentAmount: r.monthly_rent,
            status: 'occupied',
            floor: r.unit_floor,
            features: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
        };
    }
    // Add tenant details if joined
    if (r.tenant_first_name) {
        lease.tenant = {
            id: r.tenant_id,
            leadId: r.tenant_lead_id,
            firstName: r.tenant_first_name,
            lastName: r.tenant_last_name,
            email: r.tenant_email,
            phone: r.tenant_phone,
            emergencyContact: r.tenant_emergency_contact,
            emergencyPhone: r.tenant_emergency_phone,
            status: r.tenant_status,
            createdAt: '',
            updatedAt: '',
        };
    }
    return lease;
}
function mapLeaseFileFromDb(row) {
    const r = row;
    return {
        id: r.id,
        leaseId: r.lease_id,
        fileType: r.file_type,
        fileName: r.file_name,
        fileSize: r.file_size,
        mimeType: r.mime_type,
        r2Key: r.r2_key,
        uploadedAt: r.uploaded_at,
    };
}
// ==================== LEASE CRUD OPERATIONS ====================
export async function getLeases(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    const { status, propertyId, unitId, tenantId, sortBy = 'created_at', sortOrder = 'desc' } = options || {};
    // Build query with joins to get property, unit, and tenant details
    let query = `
    SELECT
      l.*,
      p.name as property_name,
      p.slug as property_slug,
      p.address as property_address,
      p.city as property_city,
      p.province as property_province,
      p.postal_code as property_postal_code,
      p.property_type,
      u.unit_number,
      u.name as unit_name,
      u.bedrooms as unit_bedrooms,
      u.bathrooms as unit_bathrooms,
      u.sqft as unit_sqft,
      u.floor as unit_floor,
      t.first_name as tenant_first_name,
      t.last_name as tenant_last_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      t.emergency_contact as tenant_emergency_contact,
      t.emergency_phone as tenant_emergency_phone,
      t.status as tenant_status,
      t.lead_id as tenant_lead_id
    FROM leases l
    INNER JOIN properties p ON l.property_id = p.id
    LEFT JOIN units u ON l.unit_id = u.id
    INNER JOIN tenants t ON l.tenant_id = t.id
    WHERE l.site_id = ?
  `;
    const params = [siteId];
    if (status) {
        query += ' AND l.status = ?';
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
    if (tenantId) {
        query += ' AND l.tenant_id = ?';
        params.push(tenantId);
    }
    // Map sort fields to database columns
    // Handle undefined or invalid sortBy values
    const validSortBy = sortBy && sortBy !== 'undefined' ? sortBy : 'created_at';
    let orderColumn;
    if (validSortBy === 'propertyName' || validSortBy === 'property_name') {
        orderColumn = 'p.name';
    }
    else if (validSortBy === 'tenantName' || validSortBy === 'tenant_name') {
        orderColumn = 't.last_name';
    }
    else if (validSortBy === 'startDate' || validSortBy === 'start_date') {
        orderColumn = 'l.start_date';
    }
    else if (validSortBy === 'endDate' || validSortBy === 'end_date') {
        orderColumn = 'l.end_date';
    }
    else {
        orderColumn = `l.${validSortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    }
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}`;
    const results = await db.query(query, params);
    return results.map(mapLeaseWithDetailsFromDb);
}
export async function getLeaseById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT
      l.*,
      p.name as property_name,
      p.slug as property_slug,
      p.address as property_address,
      p.city as property_city,
      p.province as property_province,
      p.postal_code as property_postal_code,
      p.property_type,
      u.unit_number,
      u.name as unit_name,
      u.bedrooms as unit_bedrooms,
      u.bathrooms as unit_bathrooms,
      u.sqft as unit_sqft,
      u.floor as unit_floor,
      t.first_name as tenant_first_name,
      t.last_name as tenant_last_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      t.emergency_contact as tenant_emergency_contact,
      t.emergency_phone as tenant_emergency_phone,
      t.status as tenant_status,
      t.lead_id as tenant_lead_id
    FROM leases l
    INNER JOIN properties p ON l.property_id = p.id
    LEFT JOIN units u ON l.unit_id = u.id
    INNER JOIN tenants t ON l.tenant_id = t.id
    WHERE l.id = ? AND l.site_id = ?
  `;
    const result = await db.queryOne(query, [id, siteId]);
    return result ? mapLeaseWithDetailsFromDb(result) : null;
}
export async function createLease(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('lease');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO leases (
      id, site_id, property_id, unit_id, tenant_id,
      start_date, end_date, monthly_rent, security_deposit,
      status, docusign_envelope_id, signed_at,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.propertyId,
        data.unitId || null,
        data.tenantId,
        data.startDate,
        data.endDate,
        data.monthlyRent,
        data.securityDeposit,
        data.status,
        data.docuSignEnvelopeId || null,
        data.signedAt || null,
        now,
        now,
    ]);
    return (await getLeaseById(db, siteId, id));
}
export async function updateLease(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.propertyId !== undefined) {
        updates.push('property_id = ?');
        params.push(data.propertyId);
    }
    if (data.unitId !== undefined) {
        updates.push('unit_id = ?');
        params.push(data.unitId || null);
    }
    if (data.tenantId !== undefined) {
        updates.push('tenant_id = ?');
        params.push(data.tenantId);
    }
    if (data.startDate !== undefined) {
        updates.push('start_date = ?');
        params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
        updates.push('end_date = ?');
        params.push(data.endDate);
    }
    if (data.monthlyRent !== undefined) {
        updates.push('monthly_rent = ?');
        params.push(data.monthlyRent);
    }
    if (data.securityDeposit !== undefined) {
        updates.push('security_deposit = ?');
        params.push(data.securityDeposit);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
    }
    if (data.docuSignEnvelopeId !== undefined) {
        updates.push('docusign_envelope_id = ?');
        params.push(data.docuSignEnvelopeId || null);
    }
    if (data.signedAt !== undefined) {
        updates.push('signed_at = ?');
        params.push(data.signedAt || null);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id, siteId);
    await db.execute(`UPDATE leases SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, params);
}
export async function deleteLease(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM leases WHERE id = ? AND site_id = ?', [id, siteId]);
}
// ==================== LEASE FILE OPERATIONS ====================
export async function getLeaseFiles(dbInput, siteId, leaseId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM lease_files WHERE lease_id = ? AND site_id = ? ORDER BY uploaded_at DESC', [leaseId, siteId]);
    return results.map(mapLeaseFileFromDb);
}
export async function getLeaseFileById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM lease_files WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapLeaseFileFromDb(result) : null;
}
export async function createLeaseFile(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('lease_file');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO lease_files (id, site_id, lease_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, siteId, data.leaseId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);
    return (await getLeaseFileById(db, siteId, id));
}
export async function deleteLeaseFile(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM lease_files WHERE id = ? AND site_id = ?', [id, siteId]);
}
