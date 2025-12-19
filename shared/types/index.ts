// Core Domain Models for Rental Management Platform

// Property Types
export interface Property {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  province: string; // Changed from state
  postalCode: string; // Changed from zipCode
  propertyType: PropertyType;
  description?: string;
  yearBuilt?: number;
  amenities: string[];
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed fields (from joins)
  unitCount?: number;
  occupiedCount?: number;
  vacantCount?: number;
  units?: Unit[];
  images?: PropertyImage[];
}

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'condo'
  | 'townhouse'
  | 'commercial';

// Unit Types
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
  // Computed fields (from joins)
  property?: Property;
  currentTenant?: Tenant;
  images?: PropertyImage[];
}

export type UnitStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'pending';

// Unit History
export interface UnitHistory {
  id: string;
  unitId: string;
  eventType: UnitEventType;
  eventData: Record<string, unknown>;
  createdAt: string;
}

export type UnitEventType =
  | 'tenant_move_in'
  | 'tenant_move_out'
  | 'rent_change'
  | 'status_change';

// Property/Unit Images
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
  // Computed
  url?: string;
  isPropertyImage?: boolean; // For combined gallery display
  isMissing?: boolean; // True if R2 file is missing
}

// Lead Types
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
  landlordNote?: string; // Internal-only notes (includes legacy income info)
  isActive: boolean; // For archiving/soft-delete
  createdAt: string;
  updatedAt: string;
  // Computed fields (from joins)
  property?: Property;
  unit?: Unit;
  isUnitOccupied?: boolean; // Whether the unit/property is currently occupied
}

// Lead History (audit trail)
export interface LeadHistory {
  id: string;
  leadId: string;
  siteId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

export type LeadStatus =
  | 'new'
  | 'documents_pending'
  | 'documents_received'
  | 'ai_evaluating'
  | 'ai_evaluated'
  | 'screening'
  | 'approved'
  | 'rejected'
  | 'lease_sent'
  | 'lease_signed';

export type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';

export type AILabel = 'A' | 'B' | 'C' | 'D';

// Lead File Types
export interface LeadFile {
  id: string;
  leadId: string;
  fileType: LeadFileType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  uploadedAt: string;
  // Computed (for ops viewing)
  signedUrl?: string;
  expiresAt?: string;
}

export type LeadFileType =
  | 'government_id'
  | 'paystub'
  | 'bank_statement'
  | 'tax_return'
  | 'employment_letter'
  | 'other';

// File Upload Response
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: LeadFileType;
  uploadedAt: string;
}

// Property with Images Response (for public site)
export interface PropertyWithImagesResponse {
  property: Property & { images: PropertyImage[] };
  unit?: Unit & { images: PropertyImage[] };
}

// AI Evaluation Types
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

// Tenant Types
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
  // Computed fields (from joins)
  currentLease?: Lease;
  property?: Property;
  unit?: Unit;
  activeWorkOrderCount?: number;
}

export type TenantStatus =
  | 'moving_in'      // Tenant is in the process of moving in
  | 'active'         // Tenant is currently residing (staying)
  | 'lease_up'       // Lease is coming up for renewal
  | 'renewing'       // In the process of renewing lease
  | 'moving_out'     // Tenant is in the process of moving out
  | 'pending_n11'    // Pending N11 notice (Ontario termination notice)
  | 'terminated'     // Lease has been terminated
  | 'inactive'       // Tenant is no longer active
  | 'evicted';       // Tenant was evicted

// Lease Types
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
  // Computed fields (from joins)
  property?: Property;
  unit?: Unit;
  tenant?: Tenant;
}

export type LeaseStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'active'
  | 'expired'
  | 'terminated';

// Lease File Types
export interface LeaseFile {
  id: string;
  leaseId: string;
  fileType: LeaseFileType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  uploadedAt: string;
  // Computed (for ops viewing)
  signedUrl?: string;
  expiresAt?: string;
}

export type LeaseFileType =
  | 'lease_document'
  | 'addendum'
  | 'inspection_report'
  | 'move_in_checklist'
  | 'move_out_checklist'
  | 'other';

// Work Order Types
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

export type WorkOrderCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'pest'
  | 'landscaping'
  | 'other';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';

export type WorkOrderStatus =
  | 'open'
  | 'in_progress'
  | 'pending_parts'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

// Screening Types (Placeholder for Certn/SingleKey)
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

// DocuSign Types (Placeholder)
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

export type DocuSignStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided';

// API Response Types
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

// User/Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'maintenance' | 'viewer';
  passwordHash: string;
  siteId: string;
  isSuperAdmin: boolean; // Can access multiple sites
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'manager' | 'staff';

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

// ============================================================================
// Application Progress Workflow Types
// ============================================================================

// Application Applicants
export type ApplicantType = 'primary' | 'co_applicant' | 'guarantor';

export interface ApplicationApplicant {
  id: string;
  applicationId: string;
  applicantType: ApplicantType;

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;

  // Employment
  employmentStatus: EmploymentStatus | null;
  employerName: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;

  // AI Evaluation
  aiScore: number | null;
  aiLabel: AILabel | null;
  aiRiskFlags: string[] | null;
  aiEvaluatedAt: string | null;

  // Background check
  backgroundCheckStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | null;
  backgroundCheckProvider: string | null;
  backgroundCheckReferenceId: string | null;
  backgroundCheckCompletedAt: string | null;

  // Invite system
  inviteToken: string | null;
  inviteSentAt: string | null;
  inviteAcceptedAt: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export type DocumentType =
  | 'government_id'
  | 'paystub'
  | 'bank_statement'
  | 'tax_return'
  | 'employment_letter'
  | 'credit_report'
  | 'background_check'
  | 'other';

export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  applicantId: string | null;

  // Document metadata
  documentType: DocumentType;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;

  // Storage
  storageKey: string;
  storageUrl: string | null;

  // Status
  verificationStatus: DocumentVerificationStatus | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;

  // Metadata
  uploadedAt: string;
  uploadedBy: string | null;
  expiresAt: string | null;
}

export type StageTransitionType = 'manual' | 'automatic' | 'system';
export type BypassCategory = 'ai_offline' | 'manual_override' | 'emergency' | 'other';

export interface ApplicationStageTransition {
  id: string;
  applicationId: string;

  // Stage change
  fromStage: LeadStatus;
  toStage: LeadStatus;
  transitionType: StageTransitionType;

  // Confirmation metadata
  confirmationAcknowledged: boolean;
  bypassReason: string | null;
  bypassCategory: BypassCategory | null;

  // Checklist state
  checklistSnapshot: Record<string, any> | null;

  // Notes
  internalNotes: string | null;

  // Metadata
  transitionedAt: string;
  transitionedBy: string;
}

export type NoteCategory =
  | 'general'
  | 'documents'
  | 'ai_screening'
  | 'background_check'
  | 'decision'
  | 'lease_prep';

export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ApplicationInternalNote {
  id: string;
  applicationId: string;
  applicantId: string | null;

  // Note content
  noteText: string;
  noteCategory: NoteCategory | null;

  // Tags
  taggedApplicants: string[] | null;
  priority: NotePriority | null;

  // Visibility
  isSensitive: boolean;
  visibleToRoles: string[] | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Extended Lead interface with new fields
export interface LeadExtended extends Lead {
  primaryApplicantId: string | null;
  shortlistedAt: string | null;
  shortlistedBy: string | null;
  decisionDeadline: string | null;
  householdMonthlyIncome: number | null;
  householdAiScore: number | null;
  applicantCount: number;
}

// Stage workflow configuration types
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
  bypassReasonOptions?: Array<{ value: string; label: string }>;
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

// Property-centric view types
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

  // Primary applicant
  primaryApplicantId: string;
  primaryApplicantName: string;
  primaryApplicantEmail: string;

  // Household
  applicantCount: number;
  householdMonthlyIncome: number | null;
  householdAiScore: number | null;

  // Status
  status: LeadStatus;
  aiLabel: AILabel | null;
  documentCompleteness: number; // 0-100 percentage

  // Metadata
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

  // Primary applicant
  primaryApplicantName: string;
  primaryApplicantEmail: string;

  // Household
  applicantCount: number;
  householdMonthlyIncome: number | null;
  householdAiScore: number | null;
  aiLabel: AILabel | null;

  // Documents
  documentCompleteness: number;

  // Metadata
  shortlistedAt: string;
  shortlistedBy: string;
}

// API request/response types for new endpoints
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
