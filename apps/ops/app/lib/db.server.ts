import type {
  Lead, LeadFile, LeadAIResult, Property, Tenant, Lease, WorkOrder, User,
  Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType
} from '@leaselab/shared-types';
import { generateId } from '@leaselab/shared-utils';
import type { IDatabase } from '@leaselab/storage-core';

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

export async function getLeads(dbInput: DatabaseInput, options?: {
  status?: string;
  propertyId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const db = normalizeDb(dbInput);
  const { status, propertyId, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = options || {};

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: (string | number)[] = [];

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

export async function getLeadById(dbInput: DatabaseInput, id: string): Promise<Lead | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM leads WHERE id = ?', [id]);
  return result ? mapLeadFromDb(result) : null;
}

export async function createLead(dbInput: DatabaseInput, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead> {
  const db = normalizeDb(dbInput);
  const id = generateId('lead');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO leads (id, property_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `, [
    id,
    data.propertyId,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.currentAddress || null,
    data.employmentStatus,
    data.monthlyIncome,
    data.moveInDate,
    data.message || null,
    now,
    now
  ]);

  return (await getLeadById(db, id))!;
}

export async function updateLead(dbInput: DatabaseInput, id: string, data: Partial<Lead>): Promise<void> {
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

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
}

// Lead Files
export async function getLeadFiles(dbInput: DatabaseInput, leadId: string): Promise<LeadFile[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM lead_files WHERE lead_id = ?', [leadId]);
  return results.map(mapLeadFileFromDb);
}

export async function createLeadFile(dbInput: DatabaseInput, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile> {
  const db = normalizeDb(dbInput);
  const id = generateId('file');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO lead_files (id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.leadId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);

  return { ...data, id, uploadedAt: now };
}

// AI Evaluations
export async function getAIEvaluation(dbInput: DatabaseInput, leadId: string): Promise<LeadAIResult | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM lead_ai_evaluations WHERE lead_id = ?', [leadId]);
  return result ? mapAIEvaluationFromDb(result) : null;
}

export async function createAIEvaluation(dbInput: DatabaseInput, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult> {
  const db = normalizeDb(dbInput);
  const id = generateId('eval');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO lead_ai_evaluations (id, lead_id, score, label, summary, risk_flags, recommendation, fraud_signals, model_version, evaluated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
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
export async function getProperties(dbInput: DatabaseInput, options?: {
  isActive?: boolean;
  propertyType?: string;
  city?: string;
}): Promise<Property[]> {
  const db = normalizeDb(dbInput);
  let query = 'SELECT * FROM properties WHERE 1=1';
  const params: (string | number)[] = [];

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

export async function getPropertyById(dbInput: DatabaseInput, id: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM properties WHERE id = ?', [id]);
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyBySlug(dbInput: DatabaseInput, slug: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM properties WHERE slug = ?', [slug]);
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyWithUnits(dbInput: DatabaseInput, id: string): Promise<Property | null> {
  const db = normalizeDb(dbInput);
  const property = await getPropertyById(db, id);
  if (!property) return null;

  const units = await getUnitsByPropertyId(db, id);
  const images = await getImagesByEntity(db, 'property', id);

  return {
    ...property,
    units,
    images,
    unitCount: units.length,
    occupiedCount: units.filter(u => u.status === 'occupied').length,
    vacantCount: units.filter(u => u.status === 'available').length,
  };
}

export async function createProperty(dbInput: DatabaseInput, data: {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
    INSERT INTO properties (id, name, slug, address, city, state, zip_code, property_type, description, year_built, lot_size, amenities, latitude, longitude, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    id,
    data.name,
    slug,
    data.address,
    data.city,
    data.state,
    data.zipCode,
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

  return (await getPropertyById(db, id))!;
}

export async function updateProperty(dbInput: DatabaseInput, id: string, data: Partial<{
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
    zipCode: 'zip_code',
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

  await db.execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteProperty(dbInput: DatabaseInput, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM properties WHERE id = ?', [id]);
}

// Units
export async function getUnits(dbInput: DatabaseInput, options?: {
  propertyId?: string;
  status?: UnitStatus;
  isActive?: boolean;
}): Promise<Unit[]> {
  const db = normalizeDb(dbInput);
  let query = 'SELECT * FROM units WHERE 1=1';
  const params: (string | number)[] = [];

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

export async function getUnitsByPropertyId(dbInput: DatabaseInput, propertyId: string): Promise<Unit[]> {
  const db = normalizeDb(dbInput);
  return getUnits(db, { propertyId });
}

export async function getUnitById(dbInput: DatabaseInput, id: string): Promise<Unit | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM units WHERE id = ?', [id]);
  return result ? mapUnitFromDb(result) : null;
}

export async function getUnitWithDetails(dbInput: DatabaseInput, id: string): Promise<Unit | null> {
  const db = normalizeDb(dbInput);
  const unit = await getUnitById(db, id);
  if (!unit) return null;

  const property = await getPropertyById(db, unit.propertyId);
  const images = await getImagesByEntity(db, 'unit', id);

  let currentTenant: Tenant | undefined;
  if (unit.currentTenantId) {
    currentTenant = await getTenantById(db, unit.currentTenantId) || undefined;
  }

  return {
    ...unit,
    property: property || undefined,
    images,
    currentTenant,
  };
}

export async function createUnit(dbInput: DatabaseInput, data: {
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
    INSERT INTO units (id, property_id, unit_number, name, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status, floor, features, available_date, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    id,
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

  return (await getUnitById(db, id))!;
}

export async function updateUnit(dbInput: DatabaseInput, id: string, data: Partial<{
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

  await db.execute(`UPDATE units SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteUnit(dbInput: DatabaseInput, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM units WHERE id = ?', [id]);
}

// Unit History
export async function getUnitHistory(dbInput: DatabaseInput, unitId: string): Promise<UnitHistory[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM unit_history WHERE unit_id = ? ORDER BY created_at DESC', [unitId]);
  return results.map(mapUnitHistoryFromDb);
}

export async function createUnitHistory(dbInput: DatabaseInput, data: {
  unitId: string;
  eventType: UnitEventType;
  eventData: Record<string, unknown>;
}): Promise<UnitHistory> {
  const db = normalizeDb(dbInput);
  const id = generateId('hist');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO unit_history (id, unit_id, event_type, event_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [
    id,
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
export async function getImagesByEntity(dbInput: DatabaseInput, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC', [entityType, entityId]);
  return results.map(mapImageFromDb);
}

export async function getImageById(dbInput: DatabaseInput, id: string): Promise<PropertyImage | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM images WHERE id = ?', [id]);
  return result ? mapImageFromDb(result) : null;
}

export async function createImage(dbInput: DatabaseInput, data: {
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
    INSERT INTO images (id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
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

  return (await getImageById(db, id))!;
}

export async function updateImage(dbInput: DatabaseInput, id: string, data: Partial<{
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

  await db.execute(`UPDATE images SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteImage(dbInput: DatabaseInput, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM images WHERE id = ?', [id]);
}

export async function setCoverImage(dbInput: DatabaseInput, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void> {
  const db = normalizeDb(dbInput);
  // Remove cover from all images for this entity
  await db.execute('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ?', [entityType, entityId]);
  // Set the new cover
  await db.execute('UPDATE images SET is_cover = 1 WHERE id = ?', [imageId]);
}

// Work Orders
export async function getWorkOrders(dbInput: DatabaseInput, options?: { status?: string; propertyId?: string }): Promise<WorkOrder[]> {
  const db = normalizeDb(dbInput);
  let query = 'SELECT * FROM work_orders WHERE 1=1';
  const params: string[] = [];

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

export async function getWorkOrderById(dbInput: DatabaseInput, id: string): Promise<WorkOrder | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
  return result ? mapWorkOrderFromDb(result) : null;
}

export async function createWorkOrder(dbInput: DatabaseInput, data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WorkOrder> {
  const db = normalizeDb(dbInput);
  const id = generateId('wo');
  const now = new Date().toISOString();

  await db.execute(`
    INSERT INTO work_orders (id, property_id, tenant_id, title, description, category, priority, status, assigned_to, scheduled_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `, [
    id, data.propertyId, data.tenantId || null, data.title, data.description, data.category, data.priority,
    data.assignedTo || null, data.scheduledDate || null, data.notes || null, now, now
  ]);

  return (await getWorkOrderById(db, id))!;
}

export async function updateWorkOrder(dbInput: DatabaseInput, id: string, data: Partial<WorkOrder>): Promise<void> {
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

  await db.execute(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteWorkOrder(dbInput: DatabaseInput, id: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('DELETE FROM work_orders WHERE id = ?', [id]);
}

// Tenants
export async function getTenants(dbInput: DatabaseInput): Promise<Tenant[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
  return results.map(mapTenantFromDb);
}

export async function getTenantById(dbInput: DatabaseInput, id: string): Promise<Tenant | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM tenants WHERE id = ?', [id]);
  return result ? mapTenantFromDb(result) : null;
}

// Users
export async function getUserByEmail(dbInput: DatabaseInput, email: string): Promise<User & { passwordHash: string } | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!result) return null;
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    passwordHash: row.password_hash as string,
    createdAt: row.created_at as string,
    lastLoginAt: row.last_login_at as string | undefined,
  };
}

export async function getUserById(dbInput: DatabaseInput, id: string): Promise<User | null> {
  const db = normalizeDb(dbInput);
  const result = await db.queryOne('SELECT id, email, name, role, created_at, last_login_at FROM users WHERE id = ?', [id]);
  if (!result) return null;
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    createdAt: row.created_at as string,
    lastLoginAt: row.last_login_at as string | undefined,
  };
}

export async function updateUserPassword(dbInput: DatabaseInput, userId: string, passwordHash: string): Promise<void> {
  const db = normalizeDb(dbInput);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
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
    monthlyIncome: r.monthly_income as number,
    moveInDate: r.move_in_date as string,
    message: r.message as string | undefined,
    status: r.status as Lead['status'],
    aiScore: r.ai_score as number | undefined,
    aiLabel: r.ai_label as Lead['aiLabel'] | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
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
    state: r.state as string,
    zipCode: r.zip_code as string,
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
