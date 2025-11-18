import type { Lead, LeadFile, LeadAIResult, Property, Tenant, Lease, WorkOrder, User } from '@leaselab/shared-types';
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
export async function getProperties(db: D1Database): Promise<Property[]> {
  const result = await db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
  return result.results.map(mapPropertyFromDb);
}

export async function getPropertyById(db: D1Database, id: string): Promise<Property | null> {
  const result = await db.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  return result ? mapPropertyFromDb(result) : null;
}

export async function createProperty(db: D1Database, data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
  const id = generateId('prop');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO properties (id, name, address, city, state, zip_code, rent, bedrooms, bathrooms, sqft, description, amenities, images, available_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.name, data.address, data.city, data.state, data.zipCode, data.rent, data.bedrooms, data.bathrooms, data.sqft,
    data.description || null, JSON.stringify(data.amenities), JSON.stringify(data.images), data.availableDate, data.status, now, now
  ).run();

  return (await getPropertyById(db, id))!;
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
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    zipCode: row.zip_code as string,
    rent: row.rent as number,
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    sqft: row.sqft as number,
    description: row.description as string | undefined,
    amenities: JSON.parse(row.amenities as string || '[]'),
    images: JSON.parse(row.images as string || '[]'),
    availableDate: row.available_date as string,
    status: row.status as Property['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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
