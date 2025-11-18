import type {
  Lead, LeadFile, LeadAIResult, Property, Tenant, Lease, WorkOrder, User,
  Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType
} from '@leaselab/shared-types';
import { generateId } from '@leaselab/shared-utils';

// Database helper functions

export async function getLeads(db: D1Database, options?: {
  status?: string;
  propertyId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
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

  const result = await db.prepare(query).bind(...params).all();
  return result.results.map(mapLeadFromDb);
}

export async function getLeadById(db: D1Database, id: string): Promise<Lead | null> {
  const result = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return result ? mapLeadFromDb(result) : null;
}

export async function createLead(db: D1Database, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead> {
  const id = generateId('lead');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO leads (id, property_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `).bind(
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
  ).run();

  return (await getLeadById(db, id))!;
}

export async function updateLead(db: D1Database, id: string, data: Partial<Lead>): Promise<void> {
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

  await db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
}

// Lead Files
export async function getLeadFiles(db: D1Database, leadId: string): Promise<LeadFile[]> {
  const result = await db.prepare('SELECT * FROM lead_files WHERE lead_id = ?').bind(leadId).all();
  return result.results.map(mapLeadFileFromDb);
}

export async function createLeadFile(db: D1Database, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile> {
  const id = generateId('file');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO lead_files (id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.leadId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now).run();

  return { ...data, id, uploadedAt: now };
}

// AI Evaluations
export async function getAIEvaluation(db: D1Database, leadId: string): Promise<LeadAIResult | null> {
  const result = await db.prepare('SELECT * FROM lead_ai_evaluations WHERE lead_id = ?').bind(leadId).first();
  return result ? mapAIEvaluationFromDb(result) : null;
}

export async function createAIEvaluation(db: D1Database, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult> {
  const id = generateId('eval');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO lead_ai_evaluations (id, lead_id, score, label, summary, risk_flags, recommendation, fraud_signals, model_version, evaluated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
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
  ).run();

  return { ...data, id, evaluatedAt: now };
}

// Properties
export async function getProperties(db: D1Database, options?: {
  isActive?: boolean;
  propertyType?: string;
  city?: string;
}): Promise<Property[]> {
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
  const result = await db.prepare(query).bind(...params).all();
  return result.results.map(mapPropertyFromDb);
}

export async function getPropertyById(db: D1Database, id: string): Promise<Property | null> {
  const result = await db.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyBySlug(db: D1Database, slug: string): Promise<Property | null> {
  const result = await db.prepare('SELECT * FROM properties WHERE slug = ?').bind(slug).first();
  return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyWithUnits(db: D1Database, id: string): Promise<Property | null> {
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

export async function createProperty(db: D1Database, data: {
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
  const id = generateId('prop');
  const now = new Date().toISOString();
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(0, 8);

  await db.prepare(`
    INSERT INTO properties (id, name, slug, address, city, state, zip_code, property_type, description, year_built, lot_size, amenities, latitude, longitude, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
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
  ).run();

  return (await getPropertyById(db, id))!;
}

export async function updateProperty(db: D1Database, id: string, data: Partial<{
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

  await db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteProperty(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM properties WHERE id = ?').bind(id).run();
}

// Units
export async function getUnits(db: D1Database, options?: {
  propertyId?: string;
  status?: UnitStatus;
  isActive?: boolean;
}): Promise<Unit[]> {
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
  const result = await db.prepare(query).bind(...params).all();
  return result.results.map(mapUnitFromDb);
}

export async function getUnitsByPropertyId(db: D1Database, propertyId: string): Promise<Unit[]> {
  return getUnits(db, { propertyId });
}

export async function getUnitById(db: D1Database, id: string): Promise<Unit | null> {
  const result = await db.prepare('SELECT * FROM units WHERE id = ?').bind(id).first();
  return result ? mapUnitFromDb(result) : null;
}

export async function getUnitWithDetails(db: D1Database, id: string): Promise<Unit | null> {
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

export async function createUnit(db: D1Database, data: {
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
  const id = generateId('unit');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO units (id, property_id, unit_number, name, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status, floor, features, available_date, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
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
  ).run();

  return (await getUnitById(db, id))!;
}

export async function updateUnit(db: D1Database, id: string, data: Partial<{
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

  await db.prepare(`UPDATE units SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteUnit(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM units WHERE id = ?').bind(id).run();
}

// Unit History
export async function getUnitHistory(db: D1Database, unitId: string): Promise<UnitHistory[]> {
  const result = await db.prepare('SELECT * FROM unit_history WHERE unit_id = ? ORDER BY created_at DESC').bind(unitId).all();
  return result.results.map(mapUnitHistoryFromDb);
}

export async function createUnitHistory(db: D1Database, data: {
  unitId: string;
  eventType: UnitEventType;
  eventData: Record<string, unknown>;
}): Promise<UnitHistory> {
  const id = generateId('hist');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO unit_history (id, unit_id, event_type, event_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    data.unitId,
    data.eventType,
    JSON.stringify(data.eventData),
    now
  ).run();

  return {
    id,
    unitId: data.unitId,
    eventType: data.eventType,
    eventData: data.eventData,
    createdAt: now,
  };
}

// Images
export async function getImagesByEntity(db: D1Database, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]> {
  const result = await db.prepare('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC').bind(entityType, entityId).all();
  return result.results.map(mapImageFromDb);
}

export async function getImageById(db: D1Database, id: string): Promise<PropertyImage | null> {
  const result = await db.prepare('SELECT * FROM images WHERE id = ?').bind(id).first();
  return result ? mapImageFromDb(result) : null;
}

export async function createImage(db: D1Database, data: {
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
  const id = generateId('img');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO images (id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
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
  ).run();

  return (await getImageById(db, id))!;
}

export async function updateImage(db: D1Database, id: string, data: Partial<{
  sortOrder: number;
  isCover: boolean;
  altText: string;
}>): Promise<void> {
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

  await db.prepare(`UPDATE images SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteImage(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM images WHERE id = ?').bind(id).run();
}

export async function setCoverImage(db: D1Database, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void> {
  // Remove cover from all images for this entity
  await db.prepare('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ?').bind(entityType, entityId).run();
  // Set the new cover
  await db.prepare('UPDATE images SET is_cover = 1 WHERE id = ?').bind(imageId).run();
}

// Work Orders
export async function getWorkOrders(db: D1Database, options?: { status?: string; propertyId?: string }): Promise<WorkOrder[]> {
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

  const result = await db.prepare(query).bind(...params).all();
  return result.results.map(mapWorkOrderFromDb);
}

export async function getWorkOrderById(db: D1Database, id: string): Promise<WorkOrder | null> {
  const result = await db.prepare('SELECT * FROM work_orders WHERE id = ?').bind(id).first();
  return result ? mapWorkOrderFromDb(result) : null;
}

export async function createWorkOrder(db: D1Database, data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WorkOrder> {
  const id = generateId('wo');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO work_orders (id, property_id, tenant_id, title, description, category, priority, status, assigned_to, scheduled_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).bind(
    id, data.propertyId, data.tenantId || null, data.title, data.description, data.category, data.priority,
    data.assignedTo || null, data.scheduledDate || null, data.notes || null, now, now
  ).run();

  return (await getWorkOrderById(db, id))!;
}

export async function updateWorkOrder(db: D1Database, id: string, data: Partial<WorkOrder>): Promise<void> {
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

  await db.prepare(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteWorkOrder(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM work_orders WHERE id = ?').bind(id).run();
}

// Tenants
export async function getTenants(db: D1Database): Promise<Tenant[]> {
  const result = await db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
  return result.results.map(mapTenantFromDb);
}

export async function getTenantById(db: D1Database, id: string): Promise<Tenant | null> {
  const result = await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
  return result ? mapTenantFromDb(result) : null;
}

// Users
export async function getUserByEmail(db: D1Database, email: string): Promise<User & { passwordHash: string } | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!result) return null;
  return {
    id: result.id as string,
    email: result.email as string,
    name: result.name as string,
    role: result.role as User['role'],
    passwordHash: result.password_hash as string,
    createdAt: result.created_at as string,
    lastLoginAt: result.last_login_at as string | undefined,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT id, email, name, role, created_at, last_login_at FROM users WHERE id = ?').bind(id).first();
  if (!result) return null;
  return {
    id: result.id as string,
    email: result.email as string,
    name: result.name as string,
    role: result.role as User['role'],
    createdAt: result.created_at as string,
    lastLoginAt: result.last_login_at as string | undefined,
  };
}

// Mapping functions
function mapLeadFromDb(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    currentAddress: row.current_address as string | undefined,
    employmentStatus: row.employment_status as Lead['employmentStatus'],
    monthlyIncome: row.monthly_income as number,
    moveInDate: row.move_in_date as string,
    message: row.message as string | undefined,
    status: row.status as Lead['status'],
    aiScore: row.ai_score as number | undefined,
    aiLabel: row.ai_label as Lead['aiLabel'] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapLeadFileFromDb(row: Record<string, unknown>): LeadFile {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    fileType: row.file_type as LeadFile['fileType'],
    fileName: row.file_name as string,
    fileSize: row.file_size as number,
    mimeType: row.mime_type as string,
    r2Key: row.r2_key as string,
    uploadedAt: row.uploaded_at as string,
  };
}

function mapAIEvaluationFromDb(row: Record<string, unknown>): LeadAIResult {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    score: row.score as number,
    label: row.label as LeadAIResult['label'],
    summary: row.summary as string,
    riskFlags: JSON.parse(row.risk_flags as string || '[]'),
    recommendation: row.recommendation as string,
    fraudSignals: JSON.parse(row.fraud_signals as string || '[]'),
    modelVersion: row.model_version as string,
    evaluatedAt: row.evaluated_at as string,
  };
}

function mapPropertyFromDb(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    zipCode: row.zip_code as string,
    propertyType: row.property_type as Property['propertyType'],
    description: row.description as string | undefined,
    yearBuilt: row.year_built as number | undefined,
    lotSize: row.lot_size as number | undefined,
    amenities: JSON.parse(row.amenities as string || '[]'),
    latitude: row.latitude as number | undefined,
    longitude: row.longitude as number | undefined,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapUnitFromDb(row: Record<string, unknown>): Unit {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    unitNumber: row.unit_number as string,
    name: row.name as string | undefined,
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    sqft: row.sqft as number | undefined,
    rentAmount: row.rent_amount as number,
    depositAmount: row.deposit_amount as number | undefined,
    status: row.status as Unit['status'],
    floor: row.floor as number | undefined,
    features: JSON.parse(row.features as string || '[]'),
    availableDate: row.available_date as string | undefined,
    currentTenantId: row.current_tenant_id as string | undefined,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapUnitHistoryFromDb(row: Record<string, unknown>): UnitHistory {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    eventType: row.event_type as UnitHistory['eventType'],
    eventData: JSON.parse(row.event_data as string || '{}'),
    createdAt: row.created_at as string,
  };
}

function mapImageFromDb(row: Record<string, unknown>): PropertyImage {
  return {
    id: row.id as string,
    entityType: row.entity_type as 'property' | 'unit',
    entityId: row.entity_id as string,
    r2Key: row.r2_key as string,
    filename: row.filename as string,
    contentType: row.content_type as string,
    sizeBytes: row.size_bytes as number,
    width: row.width as number | undefined,
    height: row.height as number | undefined,
    sortOrder: row.sort_order as number,
    isCover: Boolean(row.is_cover),
    altText: row.alt_text as string | undefined,
    createdAt: row.created_at as string,
  };
}

function mapWorkOrderFromDb(row: Record<string, unknown>): WorkOrder {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    tenantId: row.tenant_id as string | undefined,
    title: row.title as string,
    description: row.description as string,
    category: row.category as WorkOrder['category'],
    priority: row.priority as WorkOrder['priority'],
    status: row.status as WorkOrder['status'],
    assignedTo: row.assigned_to as string | undefined,
    scheduledDate: row.scheduled_date as string | undefined,
    completedAt: row.completed_at as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapTenantFromDb(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    leadId: row.lead_id as string | undefined,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    emergencyContact: row.emergency_contact as string | undefined,
    emergencyPhone: row.emergency_phone as string | undefined,
    status: row.status as Tenant['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
