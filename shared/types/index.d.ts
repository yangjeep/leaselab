export interface Property {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: PropertyType;
    description?: string;
    yearBuilt?: number;
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
    moveInDate: string;
    message?: string;
    status: LeadStatus;
    aiScore?: number;
    aiLabel?: AILabel;
    landlordNote?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    property?: Property;
    unit?: Unit;
    isUnitOccupied?: boolean;
}
export interface LeadHistory {
    id: string;
    leadId: string;
    siteId: string;
    eventType: string;
    eventData: Record<string, unknown>;
    createdAt: string;
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
    signedUrl?: string;
    expiresAt?: string;
}
export type LeadFileType = 'government_id' | 'paystub' | 'bank_statement' | 'tax_return' | 'employment_letter' | 'other';
export interface FileUploadResponse {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: LeadFileType;
    uploadedAt: string;
}
export interface PropertyWithImagesResponse {
    property: Property & {
        images: PropertyImage[];
    };
    unit?: Unit & {
        images: PropertyImage[];
    };
}
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
    currentLease?: Lease;
    property?: Property;
    unit?: Unit;
    activeWorkOrderCount?: number;
}
export type TenantStatus = 'moving_in' | 'active' | 'lease_up' | 'renewing' | 'moving_out' | 'pending_n11' | 'terminated' | 'inactive' | 'evicted';
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
export interface LeaseFile {
    id: string;
    leaseId: string;
    fileType: LeaseFileType;
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
    uploadedAt: string;
    signedUrl?: string;
    expiresAt?: string;
}
export type LeaseFileType = 'lease_document' | 'addendum' | 'inspection_report' | 'move_in_checklist' | 'move_out_checklist' | 'other';
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
export type ApplicantType = 'primary' | 'co_applicant' | 'guarantor';
export interface ApplicationApplicant {
    id: string;
    applicationId: string;
    applicantType: ApplicantType;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    employmentStatus: EmploymentStatus | null;
    employerName: string | null;
    jobTitle: string | null;
    monthlyIncome: number | null;
    aiScore: number | null;
    aiLabel: AILabel | null;
    aiRiskFlags: string[] | null;
    aiEvaluatedAt: string | null;
    backgroundCheckStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'review_required' | null;
    backgroundCheckProvider: string | null;
    backgroundCheckReferenceId: string | null;
    backgroundCheckCompletedAt: string | null;
    inviteToken: string | null;
    inviteSentAt: string | null;
    inviteAcceptedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}
export type DocumentType = 'government_id' | 'paystub' | 'bank_statement' | 'tax_return' | 'employment_letter' | 'credit_report' | 'background_check' | 'other';
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export interface ApplicationDocument {
    id: string;
    applicationId: string;
    applicantId: string | null;
    documentType: DocumentType;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
    storageKey: string;
    storageUrl: string | null;
    verificationStatus: DocumentVerificationStatus | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    rejectionReason: string | null;
    uploadedAt: string;
    uploadedBy: string | null;
    expiresAt: string | null;
}
export type StageTransitionType = 'manual' | 'automatic' | 'system';
export type BypassCategory = 'ai_offline' | 'manual_override' | 'emergency' | 'other';
export interface ApplicationStageTransition {
    id: string;
    applicationId: string;
    fromStage: LeadStatus;
    toStage: LeadStatus;
    transitionType: StageTransitionType;
    confirmationAcknowledged: boolean;
    bypassReason: string | null;
    bypassCategory: BypassCategory | null;
    checklistSnapshot: Record<string, any> | null;
    internalNotes: string | null;
    transitionedAt: string;
    transitionedBy: string;
}
export type NoteCategory = 'general' | 'documents' | 'ai_screening' | 'background_check' | 'decision' | 'lease_prep';
export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';
export interface ApplicationInternalNote {
    id: string;
    applicationId: string;
    applicantId: string | null;
    noteText: string;
    noteCategory: NoteCategory | null;
    taggedApplicants: string[] | null;
    priority: NotePriority | null;
    isSensitive: boolean;
    visibleToRoles: string[] | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}
export interface LeadExtended extends Lead {
    primaryApplicantId: string | null;
    shortlistedAt: string | null;
    shortlistedBy: string | null;
    decisionDeadline: string | null;
    householdMonthlyIncome: number | null;
    householdAiScore: number | null;
    applicantCount: number;
}
export interface StageCheckerItem {
    id: string;
    label: string;
    checked: boolean;
    required: boolean;
    applicantId?: string;
    applicantName?: string;
    metadata?: Record<string, any>;
}
export interface StageChecker {
    title: string;
    description?: string;
    items: StageCheckerItem[];
    allComplete: boolean;
    requiredComplete: boolean;
}
export interface StageDialogConfig {
    title: string;
    description: string;
    warningMessage?: string;
    requireBypassReason?: boolean;
    bypassReasonOptions?: Array<{
        value: string;
        label: string;
    }>;
    confirmButtonText: string;
    confirmButtonVariant?: 'default' | 'destructive' | 'outline';
}
export interface StageActionConfig {
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    requiresChecker?: boolean;
    requiresDialog?: boolean;
    nextStage?: LeadStatus;
}
export interface StageConfig {
    key: string;
    label: string;
    description: string;
    checkers?: StageChecker[];
    dialogs?: Record<string, StageDialogConfig>;
    actions?: StageActionConfig[];
}
export interface PropertyApplicationSummary {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    propertyImageUrl: string | null;
    unitCount: number;
    pendingApplicationCount: number;
    shortlistedApplicationCount: number;
    nextShowingDate: string | null;
}
export interface ApplicationListItem {
    id: string;
    propertyId: string;
    unitId: string | null;
    unitNumber: string | null;
    primaryApplicantId: string;
    primaryApplicantName: string;
    primaryApplicantEmail: string;
    applicantCount: number;
    householdMonthlyIncome: number | null;
    householdAiScore: number | null;
    status: LeadStatus;
    aiLabel: AILabel | null;
    documentCompleteness: number;
    createdAt: string;
    updatedAt: string;
    shortlistedAt: string | null;
}
export interface ShortlistItem {
    id: string;
    propertyId: string;
    unitId: string | null;
    unitNumber: string | null;
    rentAmount: number | null;
    primaryApplicantName: string;
    primaryApplicantEmail: string;
    applicantCount: number;
    householdMonthlyIncome: number | null;
    householdAiScore: number | null;
    aiLabel: AILabel | null;
    documentCompleteness: number;
    shortlistedAt: string;
    shortlistedBy: string;
}
export interface CreateApplicantRequest {
    applicantType: ApplicantType;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    sendInvite?: boolean;
}
export interface StageTransitionRequest {
    toStage: LeadStatus;
    bypassReason?: string;
    bypassCategory?: BypassCategory;
    internalNotes?: string;
    checklistSnapshot?: Record<string, any>;
}
export interface CreateInternalNoteRequest {
    noteText: string;
    noteCategory?: NoteCategory;
    applicantId?: string;
    taggedApplicants?: string[];
    priority?: NotePriority;
    isSensitive?: boolean;
}
//# sourceMappingURL=index.d.ts.map