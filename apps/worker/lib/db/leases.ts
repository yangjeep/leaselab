import type { Lease, LeaseFile, Property, Unit, Tenant } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';
import { generateId } from '../../../../shared/utils';

// Mapper functions
function mapLeaseFromDb(row: unknown): Lease {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    propertyId: r.property_id as string,
    unitId: r.unit_id as string | undefined,
    tenantId: r.tenant_id as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    monthlyRent: r.monthly_rent as number,
    securityDeposit: r.security_deposit as number,
    status: r.status as Lease['status'],
    docuSignEnvelopeId: r.docusign_envelope_id as string | undefined,
    signedAt: r.signed_at as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapLeaseWithDetailsFromDb(row: unknown): Lease {
  const r = row as Record<string, unknown>;
  const lease = mapLeaseFromDb(row);

  // Add property details if joined
  if (r.property_name) {
    lease.property = {
      id: r.property_id as string,
      name: r.property_name as string,
      slug: r.property_slug as string,
      address: r.property_address as string,
      city: r.property_city as string,
      province: r.property_province as string,
      postalCode: r.property_postal_code as string,
      propertyType: r.property_type as Property['propertyType'],
      amenities: [],
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
  }

  // Add unit details if joined
  if (r.unit_number) {
    lease.unit = {
      id: r.unit_id as string,
      propertyId: r.property_id as string,
      unitNumber: r.unit_number as string,
      name: r.unit_name as string | undefined,
      bedrooms: r.unit_bedrooms as number,
      bathrooms: r.unit_bathrooms as number,
      sqft: r.unit_sqft as number | undefined,
      rentAmount: r.monthly_rent as number,
      status: 'occupied',
      floor: r.unit_floor as number | undefined,
      features: [],
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
  }

  // Add tenant details if joined
  if (r.tenant_first_name) {
    lease.tenant = {
      id: r.tenant_id as string,
      leadId: r.tenant_lead_id as string | undefined,
      firstName: r.tenant_first_name as string,
      lastName: r.tenant_last_name as string,
      email: r.tenant_email as string,
      phone: r.tenant_phone as string,
      emergencyContact: r.tenant_emergency_contact as string | undefined,
      emergencyPhone: r.tenant_emergency_phone as string | undefined,
      status: r.tenant_status as Tenant['status'],
      createdAt: '',
      updatedAt: '',
    };
  }

  return lease;
}

function mapLeaseFileFromDb(row: unknown): LeaseFile {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    leaseId: r.lease_id as string,
    fileType: r.file_type as LeaseFile['fileType'],
    fileName: r.file_name as string,
    fileSize: r.file_size as number,
    mimeType: r.mime_type as string,
    r2Key: r.r2_key as string,
    uploadedAt: r.uploaded_at as string,
  };
}

// ==================== LEASE CRUD OPERATIONS ====================

export async function getLeases(
  dbInput: DatabaseInput,
  siteId: string,
  options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<Lease[]> {
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
  const params: (string | number)[] = [siteId];

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

  let orderColumn: string;
  if (validSortBy === 'propertyName' || validSortBy === 'property_name') {
    orderColumn = 'p.name';
  } else if (validSortBy === 'tenantName' || validSortBy === 'tenant_name') {
    orderColumn = 't.last_name';
  } else if (validSortBy === 'startDate' || validSortBy === 'start_date') {
    orderColumn = 'l.start_date';
  } else if (validSortBy === 'endDate' || validSortBy === 'end_date') {
    orderColumn = 'l.end_date';
  } else {
    orderColumn = `l.${validSortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
  }
  query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}`;

  const results = await db.query(query, params);
  return results.map(mapLeaseWithDetailsFromDb);
}

export async function getLeaseById(
  dbInput: DatabaseInput,
  siteId: string,
  id: string
): Promise<Lease | null> {
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

export async function createLease(
  dbInput: DatabaseInput,
  siteId: string,
  data: Omit<Lease, 'id' | 'createdAt' | 'updatedAt' | 'property' | 'unit' | 'tenant'>
): Promise<Lease> {
  const db = normalizeDb(dbInput);
  const id = generateId('lease');
  const now = new Date().toISOString();

  await db.execute(
    `
    INSERT INTO leases (
      id, site_id, property_id, unit_id, tenant_id,
      start_date, end_date, monthly_rent, security_deposit,
      status, docusign_envelope_id, signed_at,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
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
    ]
  );

  return (await getLeaseById(db, siteId, id))!;
}

export async function updateLease(
  dbInput: DatabaseInput,
  siteId: string,
  id: string,
  data: Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt' | 'property' | 'unit' | 'tenant'>>
): Promise<void> {
  const db = normalizeDb(dbInput);
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

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

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id, siteId);

  await db.execute(`UPDATE leases SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, params);
}

export async function deleteLease(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM leases WHERE id = ? AND site_id = ?', [id, siteId]);
}

// ==================== LEASE FILE OPERATIONS ====================

export async function getLeaseFiles(
  dbInput: DatabaseInput,
  siteId: string,
  leaseId: string
): Promise<LeaseFile[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query(
    'SELECT * FROM lease_files WHERE lease_id = ? AND site_id = ? ORDER BY uploaded_at DESC',
    [leaseId, siteId]
  );
  return results.map(mapLeaseFileFromDb);
}

export async function getLeaseFileById(
  dbInput: DatabaseInput,
  siteId: string,
  id: string
): Promise<LeaseFile | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM lease_files WHERE id = ? AND site_id = ?', [id, siteId]);
  return result ? mapLeaseFileFromDb(result) : null;
}

export async function createLeaseFile(
  dbInput: DatabaseInput,
  siteId: string,
  data: Omit<LeaseFile, 'id' | 'uploadedAt' | 'signedUrl' | 'expiresAt'>
): Promise<LeaseFile> {
  const db = normalizeDb(dbInput);
  const id = generateId('lease_file');
  const now = new Date().toISOString();

  await db.execute(
    `
    INSERT INTO lease_files (id, site_id, lease_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [id, siteId, data.leaseId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]
  );

  return (await getLeaseFileById(db, siteId, id))!;
}

export async function deleteLeaseFile(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM lease_files WHERE id = ? AND site_id = ?', [id, siteId]);
}
