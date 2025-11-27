import { z } from 'zod';
export declare const PropertyTypeEnum: z.ZodEnum<["single_family", "multi_family", "condo", "townhouse", "commercial"]>;
export declare const UnitStatusEnum: z.ZodEnum<["available", "occupied", "maintenance", "pending"]>;
export declare const UnitEventTypeEnum: z.ZodEnum<["tenant_move_in", "tenant_move_out", "rent_change", "status_change"]>;
export declare const LeadStatusEnum: z.ZodEnum<["new", "documents_pending", "documents_received", "ai_evaluating", "ai_evaluated", "screening", "approved", "rejected", "lease_sent", "lease_signed"]>;
export declare const EmploymentStatusEnum: z.ZodEnum<["employed", "self_employed", "unemployed", "retired", "student"]>;
export declare const AILabelEnum: z.ZodEnum<["A", "B", "C", "D"]>;
export declare const LeadFileTypeEnum: z.ZodEnum<["government_id", "paystub", "bank_statement", "tax_return", "employment_letter", "other"]>;
export declare const TenantStatusEnum: z.ZodEnum<["active", "inactive", "evicted"]>;
export declare const LeaseStatusEnum: z.ZodEnum<["draft", "pending_signature", "signed", "active", "expired", "terminated"]>;
export declare const WorkOrderCategoryEnum: z.ZodEnum<["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "landscaping", "other"]>;
export declare const WorkOrderPriorityEnum: z.ZodEnum<["low", "medium", "high", "emergency"]>;
export declare const WorkOrderStatusEnum: z.ZodEnum<["open", "in_progress", "pending_parts", "scheduled", "completed", "cancelled"]>;
export declare const UserRoleEnum: z.ZodEnum<["admin", "manager", "staff"]>;
export declare const API_ROUTES: {
    readonly PUBLIC: {
        readonly LEADS: "/api/public/leads";
    };
    readonly LEADS: {
        readonly BASE: "/api/leads";
        readonly BY_ID: (id: string) => string;
        readonly FILES: (id: string) => string;
        readonly AI: (id: string) => string;
        readonly SCREENING: (id: string) => string;
    };
    readonly LEASES: {
        readonly BASE: "/api/leases";
        readonly BY_ID: (id: string) => string;
        readonly SEND: (id: string) => string;
    };
    readonly WORK_ORDERS: {
        readonly BASE: "/api/work-orders";
        readonly BY_ID: (id: string) => string;
    };
    readonly PROPERTIES: {
        readonly BASE: "/api/properties";
        readonly BY_ID: (id: string) => string;
        readonly UNITS: (id: string) => string;
        readonly IMAGES: (id: string) => string;
    };
    readonly UNITS: {
        readonly BASE: "/api/units";
        readonly BY_ID: (id: string) => string;
        readonly ASSIGN_TENANT: (id: string) => string;
        readonly REMOVE_TENANT: (id: string) => string;
        readonly HISTORY: (id: string) => string;
        readonly IMAGES: (id: string) => string;
    };
    readonly IMAGES: {
        readonly BASE: "/api/images";
        readonly PRESIGN: "/api/images/presign";
        readonly BY_ID: (id: string) => string;
        readonly REORDER: "/api/images/reorder";
    };
    readonly TENANTS: {
        readonly BASE: "/api/tenants";
        readonly BY_ID: (id: string) => string;
    };
    readonly AUTH: {
        readonly LOGIN: "/api/auth/login";
        readonly LOGOUT: "/api/auth/logout";
        readonly SESSION: "/api/auth/session";
    };
};
export declare const LeadSubmissionSchema: z.ZodObject<{
    propertyId: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    currentAddress: z.ZodOptional<z.ZodString>;
    employmentStatus: z.ZodEnum<["employed", "self_employed", "unemployed", "retired", "student"]>;
    moveInDate: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employmentStatus: "employed" | "self_employed" | "unemployed" | "retired" | "student";
    moveInDate: string;
    currentAddress?: string | undefined;
    message?: string | undefined;
}, {
    propertyId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employmentStatus: "employed" | "self_employed" | "unemployed" | "retired" | "student";
    moveInDate: string;
    currentAddress?: string | undefined;
    message?: string | undefined;
}>;
export type LeadSubmissionInput = z.infer<typeof LeadSubmissionSchema>;
export declare const FileUploadSchema: z.ZodObject<{
    fileType: z.ZodEnum<["government_id", "paystub", "bank_statement", "tax_return", "employment_letter", "other"]>;
    fileName: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fileType: "government_id" | "paystub" | "bank_statement" | "tax_return" | "employment_letter" | "other";
    fileName: string;
    fileSize: number;
    mimeType: string;
}, {
    fileType: "government_id" | "paystub" | "bank_statement" | "tax_return" | "employment_letter" | "other";
    fileName: string;
    fileSize: number;
    mimeType: string;
}>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export declare const AIEvaluationResultSchema: z.ZodObject<{
    score: z.ZodNumber;
    label: z.ZodEnum<["A", "B", "C", "D"]>;
    summary: z.ZodString;
    risk_flags: z.ZodArray<z.ZodString, "many">;
    recommendation: z.ZodString;
    fraud_signals: z.ZodArray<z.ZodString, "many">;
    model_version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    score: number;
    label: "A" | "B" | "C" | "D";
    summary: string;
    recommendation: string;
    risk_flags: string[];
    fraud_signals: string[];
    model_version: string;
}, {
    score: number;
    label: "A" | "B" | "C" | "D";
    summary: string;
    recommendation: string;
    risk_flags: string[];
    fraud_signals: string[];
    model_version: string;
}>;
export type AIEvaluationResultInput = z.infer<typeof AIEvaluationResultSchema>;
export declare const CreateWorkOrderSchema: z.ZodObject<{
    propertyId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "landscaping", "other"]>;
    priority: z.ZodEnum<["low", "medium", "high", "emergency"]>;
    scheduledDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    description: string;
    title: string;
    category: "other" | "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "pest" | "landscaping";
    priority: "low" | "medium" | "high" | "emergency";
    tenantId?: string | undefined;
    scheduledDate?: string | undefined;
}, {
    propertyId: string;
    description: string;
    title: string;
    category: "other" | "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "pest" | "landscaping";
    priority: "low" | "medium" | "high" | "emergency";
    tenantId?: string | undefined;
    scheduledDate?: string | undefined;
}>;
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export declare const UpdateWorkOrderSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "landscaping", "other"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "emergency"]>>;
    status: z.ZodOptional<z.ZodEnum<["open", "in_progress", "pending_parts", "scheduled", "completed", "cancelled"]>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    scheduledDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "open" | "in_progress" | "pending_parts" | "scheduled" | "completed" | "cancelled" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    category?: "other" | "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "pest" | "landscaping" | undefined;
    priority?: "low" | "medium" | "high" | "emergency" | undefined;
    assignedTo?: string | undefined;
    scheduledDate?: string | undefined;
    notes?: string | undefined;
}, {
    status?: "open" | "in_progress" | "pending_parts" | "scheduled" | "completed" | "cancelled" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    category?: "other" | "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "pest" | "landscaping" | undefined;
    priority?: "low" | "medium" | "high" | "emergency" | undefined;
    assignedTo?: string | undefined;
    scheduledDate?: string | undefined;
    notes?: string | undefined;
}>;
export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>;
export declare const CreatePropertySchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    province: z.ZodString;
    postalCode: z.ZodString;
    propertyType: z.ZodEnum<["single_family", "multi_family", "condo", "townhouse", "commercial"]>;
    description: z.ZodOptional<z.ZodString>;
    yearBuilt: z.ZodOptional<z.ZodNumber>;
    lotSize: z.ZodOptional<z.ZodNumber>;
    amenities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    propertyType: "single_family" | "multi_family" | "condo" | "townhouse" | "commercial";
    city: string;
    name: string;
    address: string;
    postalCode: string;
    province: string;
    amenities: string[];
    description?: string | undefined;
    yearBuilt?: number | undefined;
    lotSize?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
}, {
    propertyType: "single_family" | "multi_family" | "condo" | "townhouse" | "commercial";
    city: string;
    name: string;
    address: string;
    postalCode: string;
    province: string;
    description?: string | undefined;
    yearBuilt?: number | undefined;
    lotSize?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    amenities?: string[] | undefined;
}>;
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export declare const UpdatePropertySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    province: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    propertyType: z.ZodOptional<z.ZodEnum<["single_family", "multi_family", "condo", "townhouse", "commercial"]>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    yearBuilt: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lotSize: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    amenities: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    latitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    propertyType?: "single_family" | "multi_family" | "condo" | "townhouse" | "commercial" | undefined;
    city?: string | undefined;
    name?: string | undefined;
    address?: string | undefined;
    postalCode?: string | undefined;
    description?: string | undefined;
    yearBuilt?: number | undefined;
    lotSize?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    province?: string | undefined;
    amenities?: string[] | undefined;
}, {
    propertyType?: "single_family" | "multi_family" | "condo" | "townhouse" | "commercial" | undefined;
    city?: string | undefined;
    name?: string | undefined;
    address?: string | undefined;
    postalCode?: string | undefined;
    description?: string | undefined;
    yearBuilt?: number | undefined;
    lotSize?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    province?: string | undefined;
    amenities?: string[] | undefined;
}>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export declare const CreateUnitSchema: z.ZodObject<{
    unitNumber: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    bedrooms: z.ZodNumber;
    bathrooms: z.ZodNumber;
    sqft: z.ZodOptional<z.ZodNumber>;
    rentAmount: z.ZodNumber;
    depositAmount: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["available", "occupied", "maintenance", "pending"]>>>;
    floor: z.ZodOptional<z.ZodNumber>;
    features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    availableDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "available" | "occupied" | "maintenance" | "pending";
    bedrooms: number;
    bathrooms: number;
    unitNumber: string;
    rentAmount: number;
    features: string[];
    name?: string | undefined;
    sqft?: number | undefined;
    depositAmount?: number | undefined;
    floor?: number | undefined;
    availableDate?: string | undefined;
}, {
    bedrooms: number;
    bathrooms: number;
    unitNumber: string;
    rentAmount: number;
    status?: "available" | "occupied" | "maintenance" | "pending" | undefined;
    name?: string | undefined;
    sqft?: number | undefined;
    depositAmount?: number | undefined;
    floor?: number | undefined;
    availableDate?: string | undefined;
    features?: string[] | undefined;
}>;
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export declare const UpdateUnitSchema: z.ZodObject<{
    unitNumber: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bedrooms: z.ZodOptional<z.ZodNumber>;
    bathrooms: z.ZodOptional<z.ZodNumber>;
    sqft: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    rentAmount: z.ZodOptional<z.ZodNumber>;
    depositAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["available", "occupied", "maintenance", "pending"]>>>>;
    floor: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    features: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    availableDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "available" | "occupied" | "maintenance" | "pending" | undefined;
    name?: string | undefined;
    bedrooms?: number | undefined;
    bathrooms?: number | undefined;
    unitNumber?: string | undefined;
    sqft?: number | undefined;
    rentAmount?: number | undefined;
    depositAmount?: number | undefined;
    floor?: number | undefined;
    availableDate?: string | undefined;
    features?: string[] | undefined;
}, {
    status?: "available" | "occupied" | "maintenance" | "pending" | undefined;
    name?: string | undefined;
    bedrooms?: number | undefined;
    bathrooms?: number | undefined;
    unitNumber?: string | undefined;
    sqft?: number | undefined;
    rentAmount?: number | undefined;
    depositAmount?: number | undefined;
    floor?: number | undefined;
    availableDate?: string | undefined;
    features?: string[] | undefined;
}>;
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
export declare const AssignTenantSchema: z.ZodObject<{
    tenantId: z.ZodString;
    moveInDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    moveInDate?: string | undefined;
}, {
    tenantId: string;
    moveInDate?: string | undefined;
}>;
export type AssignTenantInput = z.infer<typeof AssignTenantSchema>;
export declare const ImageUploadPresignSchema: z.ZodObject<{
    entityType: z.ZodEnum<["property", "unit"]>;
    entityId: z.ZodString;
    filename: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename: string;
    entityType: "property" | "unit";
    entityId: string;
    contentType: string;
    sizeBytes: number;
}, {
    filename: string;
    entityType: "property" | "unit";
    entityId: string;
    contentType: string;
    sizeBytes: number;
}>;
export type ImageUploadPresignInput = z.infer<typeof ImageUploadPresignSchema>;
export declare const RegisterImageSchema: z.ZodObject<{
    entityType: z.ZodEnum<["property", "unit"]>;
    entityId: z.ZodString;
    r2Key: z.ZodString;
    filename: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    altText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    r2Key: string;
    filename: string;
    entityType: "property" | "unit";
    entityId: string;
    contentType: string;
    sizeBytes: number;
    width?: number | undefined;
    height?: number | undefined;
    altText?: string | undefined;
}, {
    r2Key: string;
    filename: string;
    entityType: "property" | "unit";
    entityId: string;
    contentType: string;
    sizeBytes: number;
    width?: number | undefined;
    height?: number | undefined;
    altText?: string | undefined;
}>;
export type RegisterImageInput = z.infer<typeof RegisterImageSchema>;
export declare const ReorderImagesSchema: z.ZodObject<{
    entityType: z.ZodEnum<["property", "unit"]>;
    entityId: z.ZodString;
    imageIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    entityType: "property" | "unit";
    entityId: string;
    imageIds: string[];
}, {
    entityType: "property" | "unit";
    entityId: string;
    imageIds: string[];
}>;
export type ReorderImagesInput = z.infer<typeof ReorderImagesSchema>;
export declare const CreateTenantSchema: z.ZodObject<{
    leadId: z.ZodOptional<z.ZodString>;
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    emergencyContact: z.ZodOptional<z.ZodString>;
    emergencyPhone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    leadId?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyPhone?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    leadId?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyPhone?: string | undefined;
}>;
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export declare const CreateLeaseSchema: z.ZodObject<{
    propertyId: z.ZodString;
    tenantId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    monthlyRent: z.ZodNumber;
    securityDeposit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    tenantId: string;
    securityDeposit: number;
    startDate: string;
    endDate: string;
    monthlyRent: number;
}, {
    propertyId: string;
    tenantId: string;
    securityDeposit: number;
    startDate: string;
    endDate: string;
    monthlyRent: number;
}>;
export type CreateLeaseInput = z.infer<typeof CreateLeaseSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export declare const LeadFilterSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "documents_pending", "documents_received", "ai_evaluating", "ai_evaluated", "screening", "approved", "rejected", "lease_sent", "lease_signed"]>>;
    propertyId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "aiScore", "lastName"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "aiScore" | "createdAt" | "lastName";
    sortOrder: "asc" | "desc";
    status?: "new" | "documents_pending" | "documents_received" | "ai_evaluating" | "ai_evaluated" | "screening" | "approved" | "rejected" | "lease_sent" | "lease_signed" | undefined;
    propertyId?: string | undefined;
    search?: string | undefined;
}, {
    status?: "new" | "documents_pending" | "documents_received" | "ai_evaluating" | "ai_evaluated" | "screening" | "approved" | "rejected" | "lease_sent" | "lease_signed" | undefined;
    propertyId?: string | undefined;
    sortBy?: "aiScore" | "createdAt" | "lastName" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    search?: string | undefined;
}>;
export type LeadFilterInput = z.infer<typeof LeadFilterSchema>;
export declare const SQL_SCHEMAS: {
    readonly properties: "\n    CREATE TABLE IF NOT EXISTS properties (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      address TEXT NOT NULL,\n      city TEXT NOT NULL,\n      state TEXT NOT NULL,\n      zip_code TEXT NOT NULL,\n      rent REAL NOT NULL,\n      bedrooms INTEGER NOT NULL,\n      bathrooms REAL NOT NULL,\n      sqft INTEGER NOT NULL,\n      description TEXT,\n      amenities TEXT DEFAULT '[]',\n      images TEXT DEFAULT '[]',\n      available_date TEXT NOT NULL,\n      status TEXT NOT NULL DEFAULT 'available',\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      updated_at TEXT NOT NULL DEFAULT (datetime('now'))\n    );\n  ";
    readonly leads: "\n    CREATE TABLE IF NOT EXISTS leads (\n      id TEXT PRIMARY KEY,\n      property_id TEXT NOT NULL,\n      first_name TEXT NOT NULL,\n      last_name TEXT NOT NULL,\n      email TEXT NOT NULL,\n      phone TEXT NOT NULL,\n      current_address TEXT,\n      employment_status TEXT NOT NULL,\n      move_in_date TEXT NOT NULL,\n      message TEXT,\n      status TEXT NOT NULL DEFAULT 'new',\n      ai_score INTEGER,\n      ai_label TEXT,\n      landlord_note TEXT,\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (property_id) REFERENCES properties(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);\n    CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);\n    CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id);\n  ";
    readonly lead_files: "\n    CREATE TABLE IF NOT EXISTS lead_files (\n      id TEXT PRIMARY KEY,\n      lead_id TEXT NOT NULL,\n      file_type TEXT NOT NULL,\n      file_name TEXT NOT NULL,\n      file_size INTEGER NOT NULL,\n      mime_type TEXT NOT NULL,\n      r2_key TEXT NOT NULL,\n      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (lead_id) REFERENCES leads(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_lead_files_lead ON lead_files(lead_id);\n  ";
    readonly lead_ai_evaluations: "\n    CREATE TABLE IF NOT EXISTS lead_ai_evaluations (\n      id TEXT PRIMARY KEY,\n      lead_id TEXT NOT NULL UNIQUE,\n      score INTEGER NOT NULL,\n      label TEXT NOT NULL,\n      summary TEXT NOT NULL,\n      risk_flags TEXT DEFAULT '[]',\n      recommendation TEXT NOT NULL,\n      fraud_signals TEXT DEFAULT '[]',\n      model_version TEXT NOT NULL,\n      evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (lead_id) REFERENCES leads(id)\n    );\n  ";
    readonly tenants: "\n    CREATE TABLE IF NOT EXISTS tenants (\n      id TEXT PRIMARY KEY,\n      lead_id TEXT UNIQUE,\n      first_name TEXT NOT NULL,\n      last_name TEXT NOT NULL,\n      email TEXT NOT NULL,\n      phone TEXT NOT NULL,\n      emergency_contact TEXT,\n      emergency_phone TEXT,\n      status TEXT NOT NULL DEFAULT 'active',\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (lead_id) REFERENCES leads(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);\n  ";
    readonly leases: "\n    CREATE TABLE IF NOT EXISTS leases (\n      id TEXT PRIMARY KEY,\n      site_id TEXT NOT NULL,\n      property_id TEXT NOT NULL,\n      unit_id TEXT,\n      tenant_id TEXT NOT NULL,\n      start_date TEXT NOT NULL,\n      end_date TEXT NOT NULL,\n      monthly_rent REAL NOT NULL,\n      security_deposit REAL NOT NULL,\n      status TEXT NOT NULL DEFAULT 'draft',\n      docusign_envelope_id TEXT,\n      signed_at TEXT,\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (property_id) REFERENCES properties(id),\n      FOREIGN KEY (unit_id) REFERENCES units(id),\n      FOREIGN KEY (tenant_id) REFERENCES tenants(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);\n    CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);\n    CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);\n    CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);\n    CREATE INDEX IF NOT EXISTS idx_leases_site ON leases(site_id);\n  ";
    readonly work_orders: "\n    CREATE TABLE IF NOT EXISTS work_orders (\n      id TEXT PRIMARY KEY,\n      property_id TEXT NOT NULL,\n      tenant_id TEXT,\n      title TEXT NOT NULL,\n      description TEXT NOT NULL,\n      category TEXT NOT NULL,\n      priority TEXT NOT NULL DEFAULT 'medium',\n      status TEXT NOT NULL DEFAULT 'open',\n      assigned_to TEXT,\n      scheduled_date TEXT,\n      completed_at TEXT,\n      notes TEXT,\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n      FOREIGN KEY (property_id) REFERENCES properties(id),\n      FOREIGN KEY (tenant_id) REFERENCES tenants(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);\n    CREATE INDEX IF NOT EXISTS idx_work_orders_property ON work_orders(property_id);\n    CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);\n  ";
    readonly users: "\n    CREATE TABLE IF NOT EXISTS users (\n      id TEXT PRIMARY KEY,\n      email TEXT NOT NULL UNIQUE,\n      password_hash TEXT NOT NULL,\n      name TEXT NOT NULL,\n      role TEXT NOT NULL DEFAULT 'staff',\n      created_at TEXT NOT NULL DEFAULT (datetime('now')),\n      last_login_at TEXT\n    );\n    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\n  ";
    readonly sessions: "\n    CREATE TABLE IF NOT EXISTS sessions (\n      id TEXT PRIMARY KEY,\n      user_id TEXT NOT NULL,\n      expires_at TEXT NOT NULL,\n      FOREIGN KEY (user_id) REFERENCES users(id)\n    );\n    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);\n  ";
};
export * from './env';
//# sourceMappingURL=index.d.ts.map