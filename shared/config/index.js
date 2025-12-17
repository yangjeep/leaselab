import { z } from 'zod';
// Status Enums
export const PropertyTypeEnum = z.enum([
    'single_family',
    'multi_family',
    'condo',
    'townhouse',
    'commercial',
]);
export const UnitStatusEnum = z.enum(['available', 'occupied', 'maintenance', 'pending']);
export const UnitEventTypeEnum = z.enum([
    'tenant_move_in',
    'tenant_move_out',
    'rent_change',
    'status_change',
]);
export const LeadStatusEnum = z.enum([
    'new',
    'documents_pending',
    'documents_received',
    'ai_evaluating',
    'ai_evaluated',
    'screening',
    'approved',
    'rejected',
    'lease_sent',
    'lease_signed',
]);
export const EmploymentStatusEnum = z.enum([
    'employed',
    'self_employed',
    'unemployed',
    'retired',
    'student',
]);
export const AILabelEnum = z.enum(['A', 'B', 'C', 'D']);
export const LeadFileTypeEnum = z.enum([
    'government_id',
    'paystub',
    'bank_statement',
    'tax_return',
    'employment_letter',
    'other',
]);
export const TenantStatusEnum = z.enum(['active', 'inactive', 'evicted']);
export const LeaseStatusEnum = z.enum([
    'draft',
    'pending_signature',
    'signed',
    'active',
    'expired',
    'terminated',
]);
export const WorkOrderCategoryEnum = z.enum([
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'structural',
    'pest',
    'landscaping',
    'other',
]);
export const WorkOrderPriorityEnum = z.enum(['low', 'medium', 'high', 'emergency']);
export const WorkOrderStatusEnum = z.enum([
    'open',
    'in_progress',
    'pending_parts',
    'scheduled',
    'completed',
    'cancelled',
]);
export const UserRoleEnum = z.enum(['admin', 'manager', 'staff']);
// API Route Definitions
export const API_ROUTES = {
    // Public routes
    PUBLIC: {
        LEADS: '/api/public/leads',
        PROPERTIES: '/api/public/properties',
        PROPERTY_BY_SLUG: (slug) => `/api/public/properties/${slug}`,
        FILE_UPLOAD: '/api/public/leads/files/upload',
    },
    // Lead routes
    LEADS: {
        BASE: '/api/leads',
        BY_ID: (id) => `/api/leads/${id}`,
        FILES: (id) => `/api/leads/${id}/files`,
        AI: (id) => `/api/leads/${id}/ai`,
        SCREENING: (id) => `/api/leads/${id}/screening`,
    },
    // Lease routes
    LEASES: {
        BASE: '/api/leases',
        BY_ID: (id) => `/api/leases/${id}`,
        SEND: (id) => `/api/leases/${id}/send`,
    },
    // Work order routes
    WORK_ORDERS: {
        BASE: '/api/work-orders',
        BY_ID: (id) => `/api/work-orders/${id}`,
    },
    // Property routes
    PROPERTIES: {
        BASE: '/api/properties',
        BY_ID: (id) => `/api/properties/${id}`,
        UNITS: (id) => `/api/properties/${id}/units`,
        IMAGES: (id) => `/api/properties/${id}/images`,
    },
    // Unit routes
    UNITS: {
        BASE: '/api/units',
        BY_ID: (id) => `/api/units/${id}`,
        ASSIGN_TENANT: (id) => `/api/units/${id}/assign-tenant`,
        REMOVE_TENANT: (id) => `/api/units/${id}/remove-tenant`,
        HISTORY: (id) => `/api/units/${id}/history`,
        IMAGES: (id) => `/api/units/${id}/images`,
    },
    // Image routes
    IMAGES: {
        BASE: '/api/images',
        PRESIGN: '/api/images/presign',
        BY_ID: (id) => `/api/images/${id}`,
        REORDER: '/api/images/reorder',
    },
    // Tenant routes
    TENANTS: {
        BASE: '/api/tenants',
        BY_ID: (id) => `/api/tenants/${id}`,
    },
    // Auth routes
    AUTH: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        SESSION: '/api/auth/session',
    },
};
// Zod Schemas for API DTOs
// Lead Submission Schema (from storefront)
export const LeadSubmissionSchema = z.object({
    propertyId: z.string().min(1),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    currentAddress: z.string().optional(),
    employmentStatus: EmploymentStatusEnum,
    moveInDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
    message: z.string().max(1000).optional(),
});
// File Upload Constraints
export const FILE_UPLOAD_CONSTRAINTS = {
    maxFileSize: 5 * 1024 * 1024, // 5MB per file
    maxFilesPerLead: 10, // Maximum 10 files per application
    allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/heif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: [
        '.pdf',
        '.jpg',
        '.jpeg',
        '.png',
        '.heic',
        '.heif',
        '.doc',
        '.docx',
    ],
};
// File Upload Schema
export const FileUploadSchema = z.object({
    fileType: LeadFileTypeEnum,
    fileName: z.string().min(1).max(255),
    fileSize: z.number().positive().max(FILE_UPLOAD_CONSTRAINTS.maxFileSize),
    mimeType: z.enum(FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes),
});
// AI Evaluation Result Schema
export const AIEvaluationResultSchema = z.object({
    score: z.number().min(0).max(100),
    label: AILabelEnum,
    summary: z.string(),
    risk_flags: z.array(z.string()),
    recommendation: z.string(),
    fraud_signals: z.array(z.string()),
    model_version: z.string(),
});
// Work Order Schema
export const CreateWorkOrderSchema = z.object({
    propertyId: z.string().min(1),
    tenantId: z.string().optional(),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    category: WorkOrderCategoryEnum,
    priority: WorkOrderPriorityEnum,
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export const UpdateWorkOrderSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    category: WorkOrderCategoryEnum.optional(),
    priority: WorkOrderPriorityEnum.optional(),
    status: WorkOrderStatusEnum.optional(),
    assignedTo: z.string().optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().max(2000).optional(),
});
// Property Schema
export const CreatePropertySchema = z.object({
    name: z.string().min(1).max(200),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    province: z.string().min(2).max(2),
    postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
    propertyType: PropertyTypeEnum,
    description: z.string().max(2000).optional(),
    yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
    amenities: z.array(z.string()).default([]),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});
export const UpdatePropertySchema = CreatePropertySchema.partial();
// Unit Schema
export const CreateUnitSchema = z.object({
    unitNumber: z.string().min(1).max(50),
    name: z.string().max(100).optional(),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    sqft: z.number().int().positive().optional(),
    rentAmount: z.number().positive(),
    depositAmount: z.number().positive().optional(),
    status: UnitStatusEnum.optional().default('available'),
    floor: z.number().int().optional(),
    features: z.array(z.string()).default([]),
    availableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export const UpdateUnitSchema = CreateUnitSchema.partial();
// Assign Tenant Schema
export const AssignTenantSchema = z.object({
    tenantId: z.string().min(1),
    moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
// Image Schema
export const ImageUploadPresignSchema = z.object({
    entityType: z.enum(['property', 'unit']),
    entityId: z.string().min(1),
    filename: z.string().min(1).max(255),
    contentType: z.string().min(1),
    sizeBytes: z.number().positive().max(10 * 1024 * 1024), // 10MB max
});
export const RegisterImageSchema = z.object({
    entityType: z.enum(['property', 'unit']),
    entityId: z.string().min(1),
    r2Key: z.string().min(1),
    filename: z.string().min(1).max(255),
    contentType: z.string().min(1),
    sizeBytes: z.number().positive(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    altText: z.string().max(500).optional(),
});
export const ReorderImagesSchema = z.object({
    entityType: z.enum(['property', 'unit']),
    entityId: z.string().min(1),
    imageIds: z.array(z.string().min(1)),
});
// Tenant Schema
export const CreateTenantSchema = z.object({
    leadId: z.string().optional(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    emergencyContact: z.string().max(200).optional(),
    emergencyPhone: z.string().max(20).optional(),
});
// Lease Schema
export const CreateLeaseSchema = z.object({
    propertyId: z.string().min(1),
    tenantId: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    monthlyRent: z.number().positive(),
    securityDeposit: z.number().min(0),
});
// Auth Schemas
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
// Pagination Schema
export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
// Filter Schemas
export const LeadFilterSchema = z.object({
    status: LeadStatusEnum.optional(),
    propertyId: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'aiScore', 'lastName']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
// SQL Schema Definitions (for D1 migrations)
export const SQL_SCHEMAS = {
    properties: `
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      rent REAL NOT NULL,
      bedrooms INTEGER NOT NULL,
      bathrooms REAL NOT NULL,
      sqft INTEGER NOT NULL,
      description TEXT,
      amenities TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      available_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
    leads: `
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      current_address TEXT,
      employment_status TEXT NOT NULL,
      move_in_date TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      ai_score INTEGER,
      ai_label TEXT,
      landlord_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id);
  `,
    lead_files: `
    CREATE TABLE IF NOT EXISTS lead_files (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE INDEX IF NOT EXISTS idx_lead_files_lead ON lead_files(lead_id);
  `,
    lead_ai_evaluations: `
    CREATE TABLE IF NOT EXISTS lead_ai_evaluations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL,
      label TEXT NOT NULL,
      summary TEXT NOT NULL,
      risk_flags TEXT DEFAULT '[]',
      recommendation TEXT NOT NULL,
      fraud_signals TEXT DEFAULT '[]',
      model_version TEXT NOT NULL,
      evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `,
    tenants: `
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      emergency_contact TEXT,
      emergency_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
  `,
    leases: `
    CREATE TABLE IF NOT EXISTS leases (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      unit_id TEXT,
      tenant_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      monthly_rent REAL NOT NULL,
      security_deposit REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      docusign_envelope_id TEXT,
      signed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (unit_id) REFERENCES units(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
    CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
    CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
    CREATE INDEX IF NOT EXISTS idx_leases_site ON leases(site_id);
  `,
    work_orders: `
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      tenant_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      scheduled_date TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_property ON work_orders(property_id);
    CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
  `,
    users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `,
    sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `,
};
// Export environment bindings configuration
export * from './env';
