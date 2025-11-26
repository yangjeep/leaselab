export interface Property {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: PropertyType;
    description?: string;
    yearBuilt?: number;
    lotSize?: number;
    amenities: string[];
    latitude?: number;
    longitude?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    unitCount?: number;
    occupiedCount?: number;
    vacantCount?: number;
    units?: Unit[];
    images?: PropertyImage[];
}
export type PropertyType = 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'commercial';
export interface Unit {
    id: string;
    propertyId: string;
    unitNumber: string;
    name?: string;
    bedrooms: number;
    bathrooms: number;
    sqft?: number;
    rentAmount: number;
    depositAmount?: number;
    status: UnitStatus;
    floor?: number;
    features: string[];
    availableDate?: string;
    currentTenantId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    property?: Property;
    currentTenant?: Tenant;
    images?: PropertyImage[];
}
export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'pending';
export interface UnitHistory {
    id: string;
    unitId: string;
    eventType: UnitEventType;
    eventData: Record<string, unknown>;
    createdAt: string;
}
export type UnitEventType = 'tenant_move_in' | 'tenant_move_out' | 'rent_change' | 'status_change';
export interface PropertyImage {
    id: string;
    entityType: 'property' | 'unit';
    entityId: string;
    r2Key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    sortOrder: number;
    isCover: boolean;
    altText?: string;
    createdAt: string;
    url?: string;
    isPropertyImage?: boolean;
    isMissing?: boolean;
}
export interface Lead {
    id: string;
    propertyId: string;
    unitId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    currentAddress?: string;
    employmentStatus: EmploymentStatus;
    monthlyIncome: number;
    moveInDate: string;
    message?: string;
    status: LeadStatus;
    aiScore?: number;
    aiLabel?: AILabel;
    createdAt: string;
    updatedAt: string;
    property?: Property;
    unit?: Unit;
}
export type LeadStatus = 'new' | 'documents_pending' | 'documents_received' | 'ai_evaluating' | 'ai_evaluated' | 'screening' | 'approved' | 'rejected' | 'lease_sent' | 'lease_signed';
export type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
export type AILabel = 'A' | 'B' | 'C' | 'D';
export interface LeadFile {
    id: string;
    leadId: string;
    fileType: LeadFileType;
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
    uploadedAt: string;
}
export type LeadFileType = 'government_id' | 'paystub' | 'bank_statement' | 'tax_return' | 'employment_letter' | 'other';
export interface LeadAIResult {
    id: string;
    leadId: string;
    score: number;
    label: AILabel;
    summary: string;
    riskFlags: string[];
    recommendation: string;
    fraudSignals: string[];
    modelVersion: string;
    evaluatedAt: string;
}
export interface AIEvaluationRequest {
    leadId: string;
    lead: Lead;
    files: LeadFile[];
    propertyRent: number;
    signedUrls: Record<string, string>;
}
export interface AIEvaluationResponse {
    score: number;
    label: AILabel;
    summary: string;
    risk_flags: string[];
    recommendation: string;
    fraud_signals: string[];
    model_version: string;
}
export interface Tenant {
    id: string;
    leadId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    status: TenantStatus;
    createdAt: string;
    updatedAt: string;
}
export type TenantStatus = 'active' | 'inactive' | 'evicted';
export interface Lease {
    id: string;
    propertyId: string;
    unitId?: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    status: LeaseStatus;
    docuSignEnvelopeId?: string;
    signedAt?: string;
    createdAt: string;
    updatedAt: string;
    property?: Property;
    unit?: Unit;
    tenant?: Tenant;
}
export type LeaseStatus = 'draft' | 'pending_signature' | 'signed' | 'active' | 'expired' | 'terminated';
export interface WorkOrder {
    id: string;
    propertyId: string;
    tenantId?: string;
    title: string;
    description: string;
    category: WorkOrderCategory;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    assignedTo?: string;
    scheduledDate?: string;
    completedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export type WorkOrderCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'landscaping' | 'other';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';
export type WorkOrderStatus = 'open' | 'in_progress' | 'pending_parts' | 'scheduled' | 'completed' | 'cancelled';
export interface ScreeningResult {
    id: string;
    leadId: string;
    provider: 'certn' | 'singlekey';
    status: ScreeningStatus;
    creditScore?: number;
    criminalCheck?: 'clear' | 'flagged';
    evictionHistory?: 'clear' | 'flagged';
    identityVerified?: boolean;
    report?: Record<string, unknown>;
    requestedAt: string;
    completedAt?: string;
}
export type ScreeningStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export interface DocuSignEnvelopeInfo {
    envelopeId: string;
    status: DocuSignStatus;
    sentAt: string;
    signedAt?: string;
    expiresAt: string;
    signers: DocuSignSigner[];
}
export interface DocuSignSigner {
    email: string;
    name: string;
    status: 'pending' | 'sent' | 'delivered' | 'signed' | 'declined';
    signedAt?: string;
}
export type DocuSignStatus = 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'maintenance' | 'viewer';
    passwordHash: string;
    siteId: string;
    isSuperAdmin: boolean;
    createdAt: string;
    updatedAt: string;
}
export type UserRole = 'admin' | 'manager' | 'staff';
export interface Session {
    id: string;
    userId: string;
    expiresAt: string;
}
//# sourceMappingURL=index.d.ts.map