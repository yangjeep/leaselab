import type {
  Lead, LeadFile, LeadAIResult, LeadHistory, Property, Tenant, Lease, WorkOrder, User,
  Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType
} from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { IDatabase } from '~/shared/storage-core';

// Database type that accepts both D1Database and IDatabase for backward compatibility
export type DatabaseInput = D1Database | IDatabase;

// Helper to normalize database input to IDatabase interface
function normalizeDb(db: DatabaseInput): IDatabase {
  // Check if it's already an IDatabase (has query method)
  if ('query' in db && typeof db.query === 'function') {
    return db as IDatabase;
  }

  // It's a D1Database, wrap it
  const d1 = db as D1Database;
  return {
    async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
      const stmt = d1.prepare(sql);
      const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.all<T>();
      return result.results;
    },
    async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
      const stmt = d1.prepare(sql);
      const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.first<T>();
      return result ?? null;
    },
    async execute(sql: string, params?: unknown[]) {
      const stmt = d1.prepare(sql);
      const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.run();
      return {
        success: result.success,
        changes: result.meta.changes,
        lastRowId: result.meta.last_row_id,
      };
    },
    async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
      return fn(this);
    },
    async batch(statements: Array<{ sql: string; params?: unknown[] }>) {
      const stmts = statements.map(({ sql, params }) => {
        const stmt = d1.prepare(sql);
        return params && params.length > 0 ? stmt.bind(...params) : stmt;
      });
      const results = await d1.batch(stmts);
      return results.map((result) => ({
        success: result.success,
        changes: result.meta.changes,
        lastRowId: result.meta.last_row_id,
      }));
    },
    async close() { },
  };
}

// Database helper functions

export async function getLeads(dbInput: DatabaseInput, siteId: string, options?: {
  status?: string;
  propertyId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const db = normalizeDb(dbInput);
  const { status, propertyId, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = options || {};

  let query = 'SELECT * FROM leads WHERE site_id = ?';
  const params: (string | number)[] = [siteId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (propertyId) {
    query += ' AND property_id = ?';
    params.push(propertyId);
  }

  const orderColumn = sortBy === 'aiScore' ? 'ai_score' : sortBy.replace(/([A-Z])/g, '_$1').toLowerCase();
  query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const results = await db.query(query, params);
  return results.map(mapLeadFromDb);
}

export async function getLeadById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lead | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM leads WHERE id = ? AND site_id = ?', [id, siteId]);
  return result ? mapLeadFromDb(result) : null;
}

export async function createLead(dbInput: DatabaseInput, siteId: string, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead> {
  const db = normalizeDb(dbInput);
  const id = generateId('lead');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO leads (id, site_id, property_id, first_name, last_name, email, phone, current_address, employment_status, move_in_date, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `, [
    id,
    siteId,
    data.propertyId,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.currentAddress || null,
    data.employmentStatus,
    data.moveInDate,
    data.message || null,
    now,
    now
  ]);

  // Record history
  await recordLeadHistory(db, siteId, id, 'lead_created', {
    propertyId: data.propertyId,
    employmentStatus: data.employmentStatus,
    moveInDate: data.moveInDate,
    message: data.message || null
  });

  return (await getLeadById(db, siteId, id))!;
}

export async function updateLead(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Lead>): Promise<void> {
  const db = normalizeDb(dbInput);
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.aiScore !== undefined) {
    updates.push('ai_score = ?');
    params.push(data.aiScore);
  }
  if (data.aiLabel !== undefined) {
    updates.push('ai_label = ?');
    params.push(data.aiLabel);
  }
  if (data.landlordNote !== undefined) {
    updates.push('landlord_note = ?');
    params.push(data.landlordNote || null);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);

  // History event capturing changed fields
  const changed: Record<string, unknown> = {};
  for (let i = 0; i < updates.length - 1; i++) {
    const col = updates[i].split(' = ')[0];
    changed[col] = params[i];
  }
  await recordLeadHistory(db, siteId, id, 'lead_updated', changed);
}

// Lead Files
export async function getLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadFile[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM lead_files WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
  return results.map(mapLeadFileFromDb);
}

export async function createLeadFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile> {
  const db = normalizeDb(dbInput);
  const id = generateId('file');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO lead_files (id, site_id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, siteId, data.leadId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);

  return { ...data, id, uploadedAt: now };
}

// AI Evaluations
export async function getAIEvaluation(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadAIResult | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM lead_ai_evaluations WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
  return result ? mapAIEvaluationFromDb(result) : null;
}

export async function createAIEvaluation(dbInput: DatabaseInput, siteId: string, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult> {
  const db = normalizeDb(dbInput);
  const id = generateId('eval');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO lead_ai_evaluations (id, site_id, lead_id, score, label, summary, risk_flags, recommendation, fraud_signals, model_version, evaluated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    siteId,
    data.leadId,
    data.score,
    data.label,
    data.summary,
    JSON.stringify(data.riskFlags),
    data.recommendation,
    JSON.stringify(data.fraudSignals),
    data.modelVersion,
    now
  ]);

  return { ...data, id, evaluatedAt: now };
}

// Properties
export async function getProperties(dbInput: DatabaseInput, siteId: string, options?: {
  isActive?: boolean;
  propertyType?: string;
  city?: string;
}): Promise<Property[]> {
  const db = normalizeDb(dbInput);
  let query = 'SELECT * FROM properties WHERE site_id = ?';
  const params: (string | number)[] = [siteId];

  if (options?.isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(options.isActive ? 1 : 0);
  }
  if (options?.propertyType) {
    query += ' AND property_type = ?';
    params.push(options.propertyType);
  }
  if (options?.city) {
    query += ' AND city = ?';
    params.push(options.city);
  }

  query += ' ORDER BY created_at DESC';
  const results = await db.query(query, params);
  return results.map(mapPropertyFromDb);
}

export async function getPropertyById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyBySlug(dbInput: DatabaseInput, siteId: string, slug: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM properties WHERE slug = ? AND site_id = ?', [slug, siteId]);
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyWithUnits(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const property = await getPropertyById(db, siteId, id);
  if (!property) return null;

  const units = await getUnitsByPropertyId(db, siteId, id);
  const images = await getImagesByEntity(db, siteId, 'property', id);

  return {
    ...property,
    units,
    images,
    unitCount: units.length,
    occupiedCount: units.filter(u => u.status === 'occupied').length,
    vacantCount: units.filter(u => u.status === 'available').length,
  };
}

export async function createProperty(dbInput: DatabaseInput, siteId: string, data: {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  description?: string;
  yearBuilt?: number;
  lotSize?: number;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
}): Promise<Property> {
  const db = normalizeDb(dbInput);
  const id = generateId('prop');
  const now = new Date().toISOString();
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(0, 8);

  await db.execute(`
    INSERT INTO properties (id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, lot_size, amenities, latitude, longitude, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    id,
    siteId,
    data.name,
    slug,
    data.address,
    data.city,
    data.province,
    data.postalCode,
    data.propertyType,
    data.description || null,
    data.yearBuilt || null,
    data.lotSize || null,
    JSON.stringify(data.amenities || []),
    data.latitude || null,
    data.longitude || null,
    now,
    now
  ]);

  return (await getPropertyById(db, siteId, id))!;
}

export async function updateProperty(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  description: string;
  yearBuilt: number;
  lotSize: number;
  amenities: string[];
  latitude: number;
  longitude: number;
  isActive: boolean;
}>): Promise<void> {
  const db = normalizeDb(dbInput);
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    address: 'address',
    city: 'city',
    state: 'state',
    postalCode: 'postal_code',
    propertyType: 'property_type',
    description: 'description',
    yearBuilt: 'year_built',
    lotSize: 'lot_size',
    latitude: 'latitude',
    longitude: 'longitude',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (data[key as keyof typeof data] !== undefined) {
      updates.push(`${dbField} = ?`);
      params.push(data[key as keyof typeof data] as string | number | null);
    }
  }

  if (data.amenities !== undefined) {
    updates.push('amenities = ?');
    params.push(JSON.stringify(data.amenities));
  }

  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(data.isActive ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await db.execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteProperty(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
}

// Listings (for storefront - properties with units)
export async function getPublicListings(dbInput: DatabaseInput, siteId: string, filters?: {
  city?: string;
  status?: string;
}, r2PublicUrl?: string): Promise<any[]> {
  const db = normalizeDb(dbInput);

  // Query units with property data joined
  let query = `
    SELECT
      u.id as id,
      u.unit_number,
      u.bedrooms,
      u.bathrooms,
      u.rent_amount as price,
      u.status,
      u.sqft,
      u.features,
      p.id as property_id,
      p.name as title,
      p.slug,
      p.address,
      p.city,
      p.province,
      p.postal_code as postalCode,
      p.description,
      p.amenities,
      p.latitude as lat,
      p.longitude as lng
    FROM units u
    INNER JOIN properties p ON u.property_id = p.id
    WHERE u.site_id = ? AND p.site_id = ?
      AND u.is_active = 1 AND p.is_active = 1
  `;

  const params: (string | number)[] = [siteId, siteId];

  if (filters?.city) {
    query += ' AND p.city = ?';
    params.push(filters.city);
  }
  if (filters?.status) {
    query += ' AND u.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY p.name, u.unit_number';

  const results = await db.query(query, params);

  // Fetch images for each unit/property and generate R2 URLs
  const listings = await Promise.all(results.map(async (row: any) => {
    // Try to get unit-specific images first, fall back to property images
    let images = await getImagesByEntity(db, siteId, 'unit', row.id);
    if (images.length === 0) {
      images = await getImagesByEntity(db, siteId, 'property', row.property_id);
    }

    // Generate R2 public URLs from image r2Keys
    const imageUrls = r2PublicUrl
      ? images.map(img => `${r2PublicUrl}/${img.r2Key}`)
      : [];

    return {
      id: row.id,
      title: row.title + (row.unit_number !== '1' ? ` - Unit ${row.unit_number}` : ''),
      slug: row.slug,
      price: row.price,
      city: row.city,
      address: row.address,
      status: row.status === 'available' ? 'Available' : row.status === 'occupied' ? 'Rented' : 'Pending',
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parking: null,
      pets: null,
      description: row.description,
      imageUrl: imageUrls[0] || null,
      images: imageUrls,
      lat: row.lat,
      lng: row.lng,
    };
  }));

  return listings;
}

// Units
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

// Images
export async function getImagesByEntity(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? AND site_id = ? ORDER BY sort_order ASC', [entityType, entityId, siteId]);
  return results.map(mapImageFromDb);
}

export async function getImageById(dbInput: DatabaseInput, siteId: string, id: string): Promise<PropertyImage | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
  return result ? mapImageFromDb(result) : null;
}

export async function createImage(dbInput: DatabaseInput, siteId: string, data: {
  entityType: 'property' | 'unit';
  entityId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sortOrder?: number;
  isCover?: boolean;
  altText?: string;
}): Promise<PropertyImage> {
  const db = normalizeDb(dbInput);
  const id = generateId('img');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO images (id, site_id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    siteId,
    data.entityType,
    data.entityId,
    data.r2Key,
    data.filename,
    data.contentType,
    data.sizeBytes,
    data.width || null,
    data.height || null,
    data.sortOrder || 0,
    data.isCover ? 1 : 0,
    data.altText || null,
    now
  ]);

  return (await getImageById(db, siteId, id))!;
}

export async function updateImage(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
  sortOrder: number;
  isCover: boolean;
  altText: string;
}>): Promise<void> {
  const db = normalizeDb(dbInput);
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(data.sortOrder);
  }
  if (data.isCover !== undefined) {
    updates.push('is_cover = ?');
    params.push(data.isCover ? 1 : 0);
  }
  if (data.altText !== undefined) {
    updates.push('alt_text = ?');
    params.push(data.altText);
  }

  if (updates.length === 0) return;
  params.push(id);

  await db.execute(`UPDATE images SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteImage(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
}

export async function setCoverImage(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void> {
  const db = normalizeDb(dbInput);
  // Remove cover from all images for this entity
  await db.execute('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND site_id = ?', [entityType, entityId, siteId]);
  // Set the new cover
  await db.execute('UPDATE images SET is_cover = 1 WHERE id = ? AND site_id = ?', [imageId, siteId]);
}

// Work Orders
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

// Tenants
export async function getTenants(dbInput: DatabaseInput, siteId: string): Promise<Tenant[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM tenants WHERE site_id = ? ORDER BY created_at DESC', [siteId]);
  return results.map(mapTenantFromDb);
}

export async function getTenantById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Tenant | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM tenants WHERE id = ? AND site_id = ?', [id, siteId]);
  return result ? mapTenantFromDb(result) : null;
}

// Users
export async function getUserByEmail(dbInput: DatabaseInput, siteId: string, email: string): Promise<User | null> {
  const db = normalizeDb(dbInput);
  // Note: We don't filter by site_id here - users should be able to login from any domain
  // Their assigned site_id determines what data they can access
  const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE email = ?', [email]);
  if (!result) return null;
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    passwordHash: row.password_hash as string,
    siteId: row.site_id as string,
    isSuperAdmin: Boolean(row.is_super_admin),
    createdAt: row.created_at as string,
    updatedAt: row.created_at as string,
  };
}

export async function getUserById(dbInput: DatabaseInput, siteId: string, id: string): Promise<User | null> {
  const db = normalizeDb(dbInput);
  // Note: We don't filter by site_id here - users should be able to login from any domain
  // Their assigned site_id determines what data they can access
  const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE id = ?', [id]);
  if (!result) return null;
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    passwordHash: row.password_hash as string,
    siteId: row.site_id as string,
    isSuperAdmin: Boolean(row.is_super_admin),
    createdAt: row.created_at as string,
    updatedAt: row.created_at as string,
  };
}

export async function getUsers(dbInput: DatabaseInput): Promise<User[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query(`
    SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC
  `);

  return results.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    passwordHash: row.password_hash as string,
    siteId: row.site_id as string,
    isSuperAdmin: Boolean(row.is_super_admin),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function updateUserPassword(dbInput: DatabaseInput, siteId: string, userId: string, passwordHash: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ? AND site_id = ?', [passwordHash, userId, siteId]);
}

export async function updateUserProfile(
  dbInput: DatabaseInput,
  siteId: string,
  userId: string,
  data: { name?: string; email?: string }
): Promise<void> {
  const db = normalizeDb(dbInput);

  // If email is being updated, check for uniqueness
  if (data.email) {
    const existingUser = await db.queryOne(
      'SELECT id FROM users WHERE email = ? AND id != ? AND site_id = ?',
      [data.email, userId, siteId]
    );
    if (existingUser) {
      throw new Error('Email already in use by another account');
    }
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email);
  }

  if (updates.length === 0) return;

  params.push(userId);
  await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}



// Mapping functions
function mapLeadFromDb(row: unknown): Lead {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    propertyId: r.property_id as string,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    phone: r.phone as string,
    currentAddress: r.current_address as string | undefined,
    employmentStatus: r.employment_status as Lead['employmentStatus'],
    moveInDate: r.move_in_date as string,
    message: r.message as string | undefined,
    status: r.status as Lead['status'],
    aiScore: r.ai_score as number | undefined,
    aiLabel: r.ai_label as Lead['aiLabel'] | undefined,
    landlordNote: r.landlord_note as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// Lead history helpers
export async function getLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadHistory[]> {
  const db = normalizeDb(dbInput);
  const rows = await db.query('SELECT * FROM lead_history WHERE lead_id = ? AND site_id = ? ORDER BY created_at DESC', [leadId, siteId]);
  return rows.map(r => ({
    id: (r as any).id as string,
    leadId: (r as any).lead_id as string,
    siteId: (r as any).site_id as string,
    eventType: (r as any).event_type as string,
    eventData: JSON.parse(((r as any).event_data as string) || '{}'),
    createdAt: (r as any).created_at as string,
  }));
}

export async function recordLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string, eventType: string, eventData: Record<string, unknown>): Promise<void> {
  const db = normalizeDb(dbInput);
  const id = 'lh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db.execute(`
    INSERT INTO lead_history (id, lead_id, site_id, event_type, event_data)
    VALUES (?, ?, ?, ?, ?)
  `, [id, leadId, siteId, eventType, JSON.stringify(eventData)]);
}

function mapLeadFileFromDb(row: unknown): LeadFile {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    leadId: r.lead_id as string,
    fileType: r.file_type as LeadFile['fileType'],
    fileName: r.file_name as string,
    fileSize: r.file_size as number,
    mimeType: r.mime_type as string,
    r2Key: r.r2_key as string,
    uploadedAt: r.uploaded_at as string,
  };
}

function mapAIEvaluationFromDb(row: unknown): LeadAIResult {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    leadId: r.lead_id as string,
    score: r.score as number,
    label: r.label as LeadAIResult['label'],
    summary: r.summary as string,
    riskFlags: JSON.parse(r.risk_flags as string || '[]'),
    recommendation: r.recommendation as string,
    fraudSignals: JSON.parse(r.fraud_signals as string || '[]'),
    modelVersion: r.model_version as string,
    evaluatedAt: r.evaluated_at as string,
  };
}

function mapPropertyFromDb(row: unknown): Property {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    address: r.address as string,
    city: r.city as string,
    state: r.province as string,
    zipCode: r.postal_code as string,
    propertyType: r.property_type as Property['propertyType'],
    description: r.description as string | undefined,
    yearBuilt: r.year_built as number | undefined,
    lotSize: r.lot_size as number | undefined,
    amenities: JSON.parse(r.amenities as string || '[]'),
    latitude: r.latitude as number | undefined,
    longitude: r.longitude as number | undefined,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

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

function mapImageFromDb(row: unknown): PropertyImage {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    entityType: r.entity_type as 'property' | 'unit',
    entityId: r.entity_id as string,
    r2Key: r.r2_key as string,
    filename: r.filename as string,
    contentType: r.content_type as string,
    sizeBytes: r.size_bytes as number,
    width: r.width as number | undefined,
    height: r.height as number | undefined,
    sortOrder: r.sort_order as number,
    isCover: Boolean(r.is_cover),
    altText: r.alt_text as string | undefined,
    createdAt: r.created_at as string,
  };
}

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

// ============================================================================
// USER ACCESS MANAGEMENT (Multi-Tenant Super Admin Support)
// ============================================================================

export interface UserAccess {
  id: string;
  userId: string;
  siteId: string;
  grantedAt: string;
  grantedBy: string | null;
}

export interface AccessibleSite {
  siteId: string;
  grantedAt: string;
}

/**
 * Get all site access records for a specific user
 */
export async function getUserSiteAccess(
  dbInput: DatabaseInput,
  userId: string
): Promise<UserAccess[]> {
  const db = normalizeDb(dbInput);
  const rows = await db.query<UserAccess>(
    `SELECT id, user_id as userId, site_id as siteId, granted_at as grantedAt, granted_by as grantedBy
     FROM user_access
     WHERE user_id = ?
     ORDER BY granted_at DESC`,
    [userId]
  );
  return rows || [];
}

/**
 * Get all accessible sites for a user (returns site_id list)
 */
export async function getUserAccessibleSites(
  dbInput: DatabaseInput,
  userId: string
): Promise<AccessibleSite[]> {
  const db = normalizeDb(dbInput);
  const rows = await db.query<AccessibleSite>(
    `SELECT site_id as siteId, granted_at as grantedAt
     FROM user_access
     WHERE user_id = ?
     ORDER BY site_id`,
    [userId]
  );
  return rows || [];
}

/**
 * Check if a user has access to a specific site
 */
export async function userHasAccessToSite(
  dbInput: DatabaseInput,
  userId: string,
  siteId: string
): Promise<boolean> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM user_access
     WHERE user_id = ? AND site_id = ?`,
    [userId, siteId]
  );
  return (result?.count || 0) > 0;
}

/**
 * Grant site access to a user
 */
export async function grantSiteAccess(
  dbInput: DatabaseInput,
  userId: string,
  siteId: string,
  grantedBy: string
): Promise<UserAccess> {
  const db = normalizeDb(dbInput);
  const id = generateId('uac');

  await db.execute(
    `INSERT INTO user_access (id, user_id, site_id, granted_by)
     VALUES (?, ?, ?, ?)`,
    [id, userId, siteId, grantedBy]
  );

  const access = await db.queryOne<UserAccess>(
    `SELECT id, user_id as userId, site_id as siteId, granted_at as grantedAt, granted_by as grantedBy
     FROM user_access
     WHERE id = ?`,
    [id]
  );

  if (!access) {
    throw new Error('Failed to create user access record');
  }

  return access;
}

/**
 * Revoke site access from a user
 */
export async function revokeSiteAccess(
  dbInput: DatabaseInput,
  userId: string,
  siteId: string
): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute(
    `DELETE FROM user_access
     WHERE user_id = ? AND site_id = ?`,
    [userId, siteId]
  );
}

/**
 * Check if a user is a super admin
 */
export async function isUserSuperAdmin(
  dbInput: DatabaseInput,
  userId: string
): Promise<boolean> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne<{ is_super_admin: number }>(
    `SELECT is_super_admin
     FROM users
     WHERE id = ?`,
    [userId]
  );
  return Boolean(result?.is_super_admin);
}

/**
 * Set/unset super admin status for a user
 */
export async function setSuperAdminStatus(
  dbInput: DatabaseInput,
  userId: string,
  isSuperAdmin: boolean
): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute(
    `UPDATE users
     SET is_super_admin = ?
     WHERE id = ?`,
    [isSuperAdmin ? 1 : 0, userId]
  );
}
