# Application Progress Workflow - Implementation Plan

**Status**: Ready for Implementation
**Created**: 2025-12-19
**Estimated Effort**: 12-16 hours
**Dependencies**: AI Tenant Intelligence MVP (completed), shadcn/ui integration (completed)

---

## Executive Summary

This document outlines the structured implementation of the Application Progress Workflow feature, which introduces:
- Property-centric application navigation with AI-powered ranking
- Multi-stage workflow with guardrails, checkers, and confirmation dialogs
- Multi-applicant intake support (primary + co-applicants)
- Stage-specific actions with audit trails
- Lease preparation handoff workflow

**Key Principles**:
- ✅ Test-driven development with comprehensive coverage
- ✅ Idempotent database migrations
- ✅ Type-safe API contracts
- ✅ Progressive enhancement (works without JS)
- ✅ Zero breaking changes to existing functionality
- ✅ Preview database testing before production

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [TypeScript Type Definitions](#2-typescript-type-definitions)
3. [Worker API Endpoints](#3-worker-api-endpoints)
4. [Remix Routes](#4-remix-routes)
5. [UI Components](#5-ui-components)
6. [Testing Strategy](#6-testing-strategy)
7. [Migration & Deployment](#7-migration--deployment)
8. [Implementation Order](#8-implementation-order)

---

## 1. Database Schema Changes

### 1.1 New Tables

#### `application_applicants`
Stores primary applicant + co-applicants for each application.

```sql
CREATE TABLE IF NOT EXISTS application_applicants (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  applicant_type TEXT NOT NULL CHECK(applicant_type IN ('primary', 'co_applicant', 'guarantor')),

  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,

  -- Employment
  employment_status TEXT CHECK(employment_status IN ('employed', 'self_employed', 'unemployed', 'retired', 'student')),
  employer_name TEXT,
  job_title TEXT,
  monthly_income REAL,

  -- AI Evaluation
  ai_score REAL,
  ai_label TEXT CHECK(ai_label IN ('A', 'B', 'C', 'D')),
  ai_risk_flags TEXT, -- JSON array
  ai_evaluated_at TEXT,

  -- Background check
  background_check_status TEXT CHECK(background_check_status IN ('pending', 'in_progress', 'completed', 'failed')),
  background_check_provider TEXT,
  background_check_reference_id TEXT,
  background_check_completed_at TEXT,

  -- Invite system (for async co-applicant submission)
  invite_token TEXT UNIQUE,
  invite_sent_at TEXT,
  invite_accepted_at TEXT,

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,

  -- Foreign keys
  FOREIGN KEY (application_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_application_applicants_application_id ON application_applicants(application_id);
CREATE INDEX idx_application_applicants_email ON application_applicants(email);
CREATE INDEX idx_application_applicants_invite_token ON application_applicants(invite_token);
```

#### `application_documents`
Replaces `lead_files` with applicant-specific document tracking.

```sql
CREATE TABLE IF NOT EXISTS application_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  applicant_id TEXT, -- NULL for household-level docs

  -- Document metadata
  document_type TEXT NOT NULL CHECK(document_type IN (
    'government_id', 'paystub', 'bank_statement', 'tax_return',
    'employment_letter', 'credit_report', 'background_check', 'other'
  )),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Storage
  storage_key TEXT NOT NULL, -- R2 object key
  storage_url TEXT,

  -- Status
  verification_status TEXT CHECK(verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by TEXT,
  verified_at TEXT,
  rejection_reason TEXT,

  -- Metadata
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_by TEXT,
  expires_at TEXT, -- For time-sensitive documents

  -- Foreign keys
  FOREIGN KEY (application_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES application_applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX idx_application_documents_applicant_id ON application_documents(applicant_id);
CREATE INDEX idx_application_documents_type ON application_documents(document_type);
```

#### `application_stage_transitions`
Audit trail for stage changes with confirmation metadata.

```sql
CREATE TABLE IF NOT EXISTS application_stage_transitions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,

  -- Stage change
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  transition_type TEXT NOT NULL CHECK(transition_type IN ('manual', 'automatic', 'system')),

  -- Confirmation metadata
  confirmation_acknowledged BOOLEAN DEFAULT 0,
  bypass_reason TEXT, -- For AI screening bypass, missing docs override
  bypass_category TEXT CHECK(bypass_category IN ('ai_offline', 'manual_override', 'emergency', 'other')),

  -- Checklist state at time of transition (JSON)
  checklist_snapshot TEXT, -- JSON: { "documents": {...}, "ai_screening": {...} }

  -- Notes
  internal_notes TEXT,

  -- Metadata
  transitioned_at TEXT NOT NULL DEFAULT (datetime('now')),
  transitioned_by TEXT NOT NULL,

  -- Foreign keys
  FOREIGN KEY (application_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (transitioned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_stage_transitions_application_id ON application_stage_transitions(application_id);
CREATE INDEX idx_stage_transitions_transitioned_at ON application_stage_transitions(transitioned_at);
```

#### `application_internal_notes`
Stage-specific internal notes with applicant tagging.

```sql
CREATE TABLE IF NOT EXISTS application_internal_notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  applicant_id TEXT, -- NULL for household-level notes

  -- Note content
  note_text TEXT NOT NULL,
  note_category TEXT CHECK(note_category IN ('general', 'documents', 'ai_screening', 'background_check', 'decision', 'lease_prep')),

  -- Tags
  tagged_applicants TEXT, -- JSON array of applicant IDs
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')),

  -- Visibility
  is_sensitive BOOLEAN DEFAULT 0,
  visible_to_roles TEXT, -- JSON array: ['admin', 'property_manager']

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,

  -- Foreign keys
  FOREIGN KEY (application_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES application_applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_internal_notes_application_id ON application_internal_notes(application_id);
CREATE INDEX idx_internal_notes_category ON application_internal_notes(note_category);
```

### 1.2 Schema Modifications to Existing Tables

#### Extend `leads` table

```sql
-- Add new columns to existing leads table
ALTER TABLE leads ADD COLUMN primary_applicant_id TEXT REFERENCES application_applicants(id);
ALTER TABLE leads ADD COLUMN shortlisted_at TEXT;
ALTER TABLE leads ADD COLUMN shortlisted_by TEXT REFERENCES users(id);
ALTER TABLE leads ADD COLUMN decision_deadline TEXT;
ALTER TABLE leads ADD COLUMN household_monthly_income REAL; -- Aggregate of all applicants
ALTER TABLE leads ADD COLUMN household_ai_score REAL; -- Combined household score
ALTER TABLE leads ADD COLUMN applicant_count INTEGER DEFAULT 1;

CREATE INDEX idx_leads_shortlisted_at ON leads(shortlisted_at);
CREATE INDEX idx_leads_property_shortlist ON leads(property_id, shortlisted_at) WHERE shortlisted_at IS NOT NULL;
```

### 1.3 Migration Script Structure

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/scripts/migrations/010_application_progress_workflow.sql`

```sql
-- Migration: Application Progress Workflow
-- Date: 2025-12-19
-- Description: Adds multi-applicant support, stage guardrails, and audit trails

-- Check if migration already applied
CREATE TABLE IF NOT EXISTS migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Skip if already applied
INSERT OR IGNORE INTO migration_history (migration_name)
VALUES ('010_application_progress_workflow');

-- Only proceed if this is a new migration
-- (Use transaction safety + idempotent checks)

BEGIN TRANSACTION;

-- [Include all CREATE TABLE statements from above]
-- [Include all ALTER TABLE statements from above]

-- Data migration: Create primary applicant records from existing leads
INSERT INTO application_applicants (
  id, application_id, applicant_type, first_name, last_name,
  email, phone, employment_status, employer_name, job_title,
  monthly_income, ai_score, ai_label, created_at
)
SELECT
  'app_' || LOWER(HEX(RANDOMBLOB(8))),
  id,
  'primary',
  first_name,
  last_name,
  email,
  phone,
  employment_status,
  employer_name,
  job_title,
  monthly_income,
  ai_score,
  ai_label,
  created_at
FROM leads
WHERE NOT EXISTS (
  SELECT 1 FROM application_applicants
  WHERE application_applicants.application_id = leads.id
  AND application_applicants.applicant_type = 'primary'
);

-- Update leads.primary_applicant_id
UPDATE leads
SET primary_applicant_id = (
  SELECT id FROM application_applicants
  WHERE application_applicants.application_id = leads.id
  AND application_applicants.applicant_type = 'primary'
  LIMIT 1
)
WHERE primary_applicant_id IS NULL;

-- Migrate existing lead_files to application_documents
INSERT INTO application_documents (
  id, application_id, applicant_id, document_type,
  file_name, storage_key, uploaded_at
)
SELECT
  'doc_' || LOWER(HEX(RANDOMBLOB(8))),
  lf.lead_id,
  l.primary_applicant_id,
  lf.file_type,
  lf.file_name,
  lf.storage_key,
  lf.created_at
FROM lead_files lf
JOIN leads l ON lf.lead_id = l.id
WHERE NOT EXISTS (
  SELECT 1 FROM application_documents ad
  WHERE ad.storage_key = lf.storage_key
);

COMMIT;
```

---

## 2. TypeScript Type Definitions

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/shared/types/index.ts`

Add the following types:

```typescript
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
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student' | null;
  employerName: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;

  // AI Evaluation
  aiScore: number | null;
  aiLabel: 'A' | 'B' | 'C' | 'D' | null;
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

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  applicantId: string | null;

  // Document metadata
  documentType: 'government_id' | 'paystub' | 'bank_statement' | 'tax_return' |
                'employment_letter' | 'credit_report' | 'background_check' | 'other';
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;

  // Storage
  storageKey: string;
  storageUrl: string | null;

  // Status
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired' | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;

  // Metadata
  uploadedAt: string;
  uploadedBy: string | null;
  expiresAt: string | null;
}

export interface ApplicationStageTransition {
  id: string;
  applicationId: string;

  // Stage change
  fromStage: string;
  toStage: string;
  transitionType: 'manual' | 'automatic' | 'system';

  // Confirmation metadata
  confirmationAcknowledged: boolean;
  bypassReason: string | null;
  bypassCategory: 'ai_offline' | 'manual_override' | 'emergency' | 'other' | null;

  // Checklist state
  checklistSnapshot: Record<string, any> | null;

  // Notes
  internalNotes: string | null;

  // Metadata
  transitionedAt: string;
  transitionedBy: string;
}

export interface ApplicationInternalNote {
  id: string;
  applicationId: string;
  applicantId: string | null;

  // Note content
  noteText: string;
  noteCategory: 'general' | 'documents' | 'ai_screening' | 'background_check' | 'decision' | 'lease_prep' | null;

  // Tags
  taggedApplicants: string[] | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;

  // Visibility
  isSensitive: boolean;
  visibleToRoles: string[] | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Extended Lead type
export interface Lead {
  // ... existing fields ...

  // New fields
  primaryApplicantId: string | null;
  shortlistedAt: string | null;
  shortlistedBy: string | null;
  decisionDeadline: string | null;
  householdMonthlyIncome: number | null;
  householdAiScore: number | null;
  applicantCount: number;
}

// Stage workflow types
export interface StageCheckerItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  applicantId?: string;
  applicantName?: string;
}

export interface StageChecker {
  title: string;
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
  nextStage?: string;
}

export interface StageConfig {
  key: string;
  label: string;
  description: string;
  checkers?: StageChecker[];
  dialogs?: Record<string, StageDialogConfig>;
  actions?: StageActionConfig[];
}

// Property-centric views
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
  status: string;
  aiLabel: 'A' | 'B' | 'C' | 'D' | null;
  documentCompleteness: number; // 0-100 percentage

  // Metadata
  createdAt: string;
  updatedAt: string;
  shortlistedAt: string | null;
}
```

---

## 3. Worker API Endpoints

### 3.1 Database Helper Functions

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/worker/lib/db/application-applicants.ts`

```typescript
import { D1Database } from '@cloudflare/workers-types';
import { ApplicationApplicant } from '../../../../shared/types';

export async function getApplicantsByApplicationId(
  db: D1Database,
  applicationId: string
): Promise<ApplicationApplicant[]> {
  const results = await db.prepare(
    `SELECT * FROM application_applicants
     WHERE application_id = ?
     ORDER BY CASE applicant_type
       WHEN 'primary' THEN 1
       WHEN 'co_applicant' THEN 2
       WHEN 'guarantor' THEN 3
     END, created_at`
  ).bind(applicationId).all();

  return results.results.map(mapApplicantFromDB);
}

export async function getApplicantById(
  db: D1Database,
  applicantId: string
): Promise<ApplicationApplicant | null> {
  const result = await db.prepare(
    'SELECT * FROM application_applicants WHERE id = ?'
  ).bind(applicantId).first();

  return result ? mapApplicantFromDB(result) : null;
}

export async function createApplicant(
  db: D1Database,
  applicant: Omit<ApplicationApplicant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApplicationApplicant> {
  const id = `app_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO application_applicants (
      id, application_id, applicant_type, first_name, last_name, email, phone,
      date_of_birth, employment_status, employer_name, job_title, monthly_income,
      invite_token, created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, applicant.applicationId, applicant.applicantType, applicant.firstName,
    applicant.lastName, applicant.email, applicant.phone, applicant.dateOfBirth,
    applicant.employmentStatus, applicant.employerName, applicant.jobTitle,
    applicant.monthlyIncome, applicant.inviteToken, now, now, applicant.createdBy
  ).run();

  const created = await getApplicantById(db, id);
  if (!created) throw new Error('Failed to create applicant');
  return created;
}

export async function updateApplicant(
  db: D1Database,
  applicantId: string,
  updates: Partial<ApplicationApplicant>
): Promise<ApplicationApplicant> {
  const now = new Date().toISOString();

  const setClauses: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  const allowedFields = [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth',
    'employmentStatus', 'employerName', 'jobTitle', 'monthlyIncome',
    'aiScore', 'aiLabel', 'aiRiskFlags', 'aiEvaluatedAt',
    'backgroundCheckStatus', 'backgroundCheckProvider',
    'backgroundCheckReferenceId', 'backgroundCheckCompletedAt',
    'inviteAcceptedAt'
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      setClauses.push(`${snakeKey} = ?`);
      values.push(value);
    }
  }

  values.push(applicantId);

  await db.prepare(`
    UPDATE application_applicants
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  const updated = await getApplicantById(db, applicantId);
  if (!updated) throw new Error('Failed to update applicant');
  return updated;
}

function mapApplicantFromDB(row: any): ApplicationApplicant {
  return {
    id: row.id,
    applicationId: row.application_id,
    applicantType: row.applicant_type,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    employmentStatus: row.employment_status,
    employerName: row.employer_name,
    jobTitle: row.job_title,
    monthlyIncome: row.monthly_income,
    aiScore: row.ai_score,
    aiLabel: row.ai_label,
    aiRiskFlags: row.ai_risk_flags ? JSON.parse(row.ai_risk_flags) : null,
    aiEvaluatedAt: row.ai_evaluated_at,
    backgroundCheckStatus: row.background_check_status,
    backgroundCheckProvider: row.background_check_provider,
    backgroundCheckReferenceId: row.background_check_reference_id,
    backgroundCheckCompletedAt: row.background_check_completed_at,
    inviteToken: row.invite_token,
    inviteSentAt: row.invite_sent_at,
    inviteAcceptedAt: row.invite_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by
  };
}
```

**Similar files needed**:
- `application-documents.ts`
- `application-stage-transitions.ts`
- `application-internal-notes.ts`

### 3.2 API Route Handlers

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/worker/routes/ops-applications.ts`

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from 'hono/validator';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/ops/properties/:propertyId/applications
// List all applications for a property, sorted by AI score
app.get('/properties/:propertyId/applications', async (c) => {
  const { propertyId } = c.req.param();
  const { sort = 'ai_score', order = 'desc', stage, minScore } = c.req.query();

  const db = c.env.DB;

  let query = `
    SELECT
      l.id, l.property_id, l.unit_id, l.status, l.created_at, l.updated_at,
      l.shortlisted_at, l.household_monthly_income, l.household_ai_score,
      l.applicant_count,
      aa.id as primary_applicant_id,
      aa.first_name || ' ' || aa.last_name as primary_applicant_name,
      aa.email as primary_applicant_email,
      aa.ai_label,
      u.unit_number,
      COALESCE(doc_counts.total, 0) as total_docs,
      COALESCE(doc_counts.verified, 0) as verified_docs
    FROM leads l
    LEFT JOIN application_applicants aa ON l.primary_applicant_id = aa.id
    LEFT JOIN units u ON l.unit_id = u.id
    LEFT JOIN (
      SELECT
        application_id,
        COUNT(*) as total,
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
      FROM application_documents
      GROUP BY application_id
    ) doc_counts ON l.id = doc_counts.application_id
    WHERE l.property_id = ? AND l.is_active = 1
  `;

  const params: any[] = [propertyId];

  if (stage) {
    query += ' AND l.status = ?';
    params.push(stage);
  }

  if (minScore) {
    query += ' AND l.household_ai_score >= ?';
    params.push(parseFloat(minScore));
  }

  // Sorting
  const sortColumn = sort === 'ai_score' ? 'l.household_ai_score' :
                     sort === 'created_at' ? 'l.created_at' :
                     'l.household_ai_score';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortColumn} ${sortOrder} NULLS LAST`;

  const results = await db.prepare(query).bind(...params).all();

  const applications = results.results.map((row: any) => ({
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    primaryApplicantId: row.primary_applicant_id,
    primaryApplicantName: row.primary_applicant_name,
    primaryApplicantEmail: row.primary_applicant_email,
    applicantCount: row.applicant_count || 1,
    householdMonthlyIncome: row.household_monthly_income,
    householdAiScore: row.household_ai_score,
    status: row.status,
    aiLabel: row.ai_label,
    documentCompleteness: row.total_docs > 0
      ? Math.round((row.verified_docs / row.total_docs) * 100)
      : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shortlistedAt: row.shortlisted_at
  }));

  return c.json({ applications });
});

// GET /api/ops/applications/:applicationId/applicants
app.get('/applications/:applicationId/applicants', async (c) => {
  const { applicationId } = c.req.param();
  const db = c.env.DB;

  const applicants = await getApplicantsByApplicationId(db, applicationId);

  return c.json({ applicants });
});

// POST /api/ops/applications/:applicationId/applicants
app.post('/applications/:applicationId/applicants',
  validator('json', (value, c) => {
    const schema = z.object({
      applicantType: z.enum(['primary', 'co_applicant', 'guarantor']),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      sendInvite: z.boolean().optional()
    });
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { applicationId } = c.req.param();
    const body = c.req.valid('json');
    const userId = c.req.header('X-User-Id');

    const db = c.env.DB;

    // Generate invite token if requested
    const inviteToken = body.sendInvite ? crypto.randomUUID() : null;

    const applicant = await createApplicant(db, {
      ...body,
      applicationId,
      inviteToken,
      createdBy: userId || null
    });

    // TODO: Send invite email if sendInvite=true

    return c.json({ applicant }, 201);
  }
);

// POST /api/ops/applications/:applicationId/stage-transition
app.post('/applications/:applicationId/stage-transition',
  validator('json', (value, c) => {
    const schema = z.object({
      toStage: z.string(),
      bypassReason: z.string().optional(),
      bypassCategory: z.enum(['ai_offline', 'manual_override', 'emergency', 'other']).optional(),
      internalNotes: z.string().optional(),
      checklistSnapshot: z.record(z.any()).optional()
    });
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { applicationId } = c.req.param();
    const body = c.req.valid('json');
    const userId = c.req.header('X-User-Id');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = c.env.DB;

    // Get current stage
    const lead = await db.prepare('SELECT status FROM leads WHERE id = ?')
      .bind(applicationId).first();

    if (!lead) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Create transition record
    const transitionId = `trans_${crypto.randomUUID()}`;
    await db.prepare(`
      INSERT INTO application_stage_transitions (
        id, application_id, from_stage, to_stage, transition_type,
        confirmation_acknowledged, bypass_reason, bypass_category,
        checklist_snapshot, internal_notes, transitioned_by
      ) VALUES (?, ?, ?, ?, 'manual', 1, ?, ?, ?, ?, ?)
    `).bind(
      transitionId, applicationId, lead.status, body.toStage,
      body.bypassReason || null,
      body.bypassCategory || null,
      body.checklistSnapshot ? JSON.stringify(body.checklistSnapshot) : null,
      body.internalNotes || null,
      userId
    ).run();

    // Update lead status
    await db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?')
      .bind(body.toStage, new Date().toISOString(), applicationId).run();

    return c.json({ success: true, transitionId });
  }
);

// GET /api/ops/properties/:propertyId/shortlist
app.get('/properties/:propertyId/shortlist', async (c) => {
  const { propertyId } = c.req.param();
  const db = c.env.DB;

  const results = await db.prepare(`
    SELECT
      l.id, l.property_id, l.unit_id, l.shortlisted_at, l.shortlisted_by,
      l.household_monthly_income, l.household_ai_score, l.applicant_count,
      aa.first_name || ' ' || aa.last_name as primary_applicant_name,
      aa.email as primary_applicant_email,
      aa.ai_label,
      u.unit_number, u.rent_amount,
      COALESCE(doc_counts.verified, 0) as verified_docs,
      COALESCE(doc_counts.total, 0) as total_docs
    FROM leads l
    LEFT JOIN application_applicants aa ON l.primary_applicant_id = aa.id
    LEFT JOIN units u ON l.unit_id = u.id
    LEFT JOIN (
      SELECT
        application_id,
        COUNT(*) as total,
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
      FROM application_documents
      GROUP BY application_id
    ) doc_counts ON l.id = doc_counts.application_id
    WHERE l.property_id = ?
      AND l.shortlisted_at IS NOT NULL
      AND l.is_active = 1
    ORDER BY l.household_ai_score DESC NULLS LAST
  `).bind(propertyId).all();

  const shortlist = results.results.map((row: any) => ({
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    rentAmount: row.rent_amount,
    primaryApplicantName: row.primary_applicant_name,
    primaryApplicantEmail: row.primary_applicant_email,
    applicantCount: row.applicant_count || 1,
    householdMonthlyIncome: row.household_monthly_income,
    householdAiScore: row.household_ai_score,
    aiLabel: row.ai_label,
    documentCompleteness: row.total_docs > 0
      ? Math.round((row.verified_docs / row.total_docs) * 100)
      : 0,
    shortlistedAt: row.shortlisted_at,
    shortlistedBy: row.shortlisted_by
  }));

  return c.json({ shortlist });
});

export default app;
```

### 3.3 Register Routes in Main Worker

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/worker/routes/ops.ts`

```typescript
// Add import
import opsApplications from './ops-applications';

// In the main router setup
app.route('/api/ops', opsApplications);
```

---

## 4. Remix Routes

### 4.1 Application Board

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/routes/admin.applications._index.tsx`

```typescript
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { getWorkerClient } from '~/lib/worker-client';
import { requireAuth } from '~/lib/auth.server';
import type { PropertyApplicationSummary } from '../../../../shared/types';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireAuth(request, context);

  const workerClient = getWorkerClient(context.env);

  // Fetch all properties with their application counts
  const properties = await workerClient.getPropertiesWithApplicationCounts();

  return json({ properties });
}

export default function ApplicationBoard() {
  const { properties } = useLoaderData<typeof loader>();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-gray-600 mt-1">
            Review and manage applications across all properties
          </p>
        </div>
        <Link
          to="/admin/leads/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Application
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard key={property.propertyId} property={property} />
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: PropertyApplicationSummary }) {
  return (
    <Link
      to={`/admin/properties/${property.propertyId}/applications`}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
    >
      {property.propertyImageUrl && (
        <img
          src={property.propertyImageUrl}
          alt={property.propertyName}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}
      <h3 className="text-xl font-semibold mb-2">{property.propertyName}</h3>
      <p className="text-gray-600 text-sm mb-4">{property.propertyAddress}</p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {property.pendingApplicationCount} pending
          </span>
        </div>
        {property.shortlistedApplicationCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {property.shortlistedApplicationCount} shortlisted
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

### 4.2 Property Application List

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/routes/admin.properties.$propertyId.applications._index.tsx`

```typescript
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { getWorkerClient } from '~/lib/worker-client';
import { requireAuth } from '~/lib/auth.server';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireAuth(request, context);

  const { propertyId } = params;
  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');
  const minScore = url.searchParams.get('minScore');

  const workerClient = getWorkerClient(context.env);

  const [property, applications] = await Promise.all([
    workerClient.getProperty(propertyId!),
    workerClient.getPropertyApplications(propertyId!, { stage, minScore })
  ]);

  return json({ property, applications });
}

export default function PropertyApplicationList() {
  const { property, applications } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="flex h-screen">
      {/* Filters sidebar */}
      <aside className="w-64 bg-gray-50 border-r p-4">
        <h2 className="font-semibold mb-4">Filters</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stage</label>
            <select
              value={searchParams.get('stage') || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) {
                  params.set('stage', e.target.value);
                } else {
                  params.delete('stage');
                }
                setSearchParams(params);
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Stages</option>
              <option value="new">New</option>
              <option value="documents_pending">Documents Pending</option>
              <option value="documents_received">Documents Received</option>
              <option value="ai_evaluated">AI Evaluated</option>
              <option value="screening">Background Check</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Min AI Score: {searchParams.get('minScore') || '0'}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={searchParams.get('minScore') || '0'}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                params.set('minScore', e.target.value);
                setSearchParams(params);
              }}
              className="w-full"
            />
          </div>
        </div>
      </aside>

      {/* Application list */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-gray-600">{property.address}</p>
        </div>

        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationListItem key={app.id} application={app} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ApplicationListItem({ application }: { application: any }) {
  const aiLabelColors = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-red-100 text-red-800'
  };

  return (
    <Link
      to={`/admin/properties/${application.propertyId}/applications/${application.id}`}
      className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">
              {application.primaryApplicantName}
            </h3>
            {application.aiLabel && (
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                aiLabelColors[application.aiLabel as keyof typeof aiLabelColors]
              }`}>
                Grade {application.aiLabel}
              </span>
            )}
            {application.applicantCount > 1 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                +{application.applicantCount - 1} co-applicant{application.applicantCount > 2 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{application.primaryApplicantEmail}</span>
            {application.householdMonthlyIncome && (
              <span>Income: ${application.householdMonthlyIncome.toLocaleString()}/mo</span>
            )}
            <span>Docs: {application.documentCompleteness}%</span>
          </div>
        </div>

        <div className="text-right">
          {application.householdAiScore !== null && (
            <div className="text-2xl font-bold mb-1">
              {Math.round(application.householdAiScore)}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {new Date(application.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

### 4.3 Application Detail with Enhanced StageWorkflow

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/routes/admin.properties.$propertyId.applications.$applicationId.tsx`

```typescript
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { getWorkerClient } from '~/lib/worker-client';
import { requireAuth } from '~/lib/auth.server';
import { StageWorkflowEnhanced } from '~/components/applications/StageWorkflowEnhanced';
import { ApplicantCard } from '~/components/applications/ApplicantCard';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireAuth(request, context);

  const { propertyId, applicationId } = params;
  const workerClient = getWorkerClient(context.env);

  const [property, application, applicants, documents, stageTransitions, notes] = await Promise.all([
    workerClient.getProperty(propertyId!),
    workerClient.getLead(applicationId!),
    workerClient.getApplicationApplicants(applicationId!),
    workerClient.getApplicationDocuments(applicationId!),
    workerClient.getStageTransitions(applicationId!),
    workerClient.getInternalNotes(applicationId!)
  ]);

  return json({
    property,
    application,
    applicants,
    documents,
    stageTransitions,
    notes
  });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  await requireAuth(request, context);

  const formData = await request.formData();
  const action = formData.get('_action');
  const workerClient = getWorkerClient(context.env);

  switch (action) {
    case 'stageTransition': {
      const toStage = formData.get('toStage') as string;
      const bypassReason = formData.get('bypassReason') as string | null;
      const bypassCategory = formData.get('bypassCategory') as string | null;
      const internalNotes = formData.get('internalNotes') as string | null;

      await workerClient.createStageTransition(params.applicationId!, {
        toStage,
        bypassReason,
        bypassCategory,
        internalNotes
      });

      return json({ success: true });
    }

    case 'addNote': {
      const noteText = formData.get('noteText') as string;
      const noteCategory = formData.get('noteCategory') as string;

      await workerClient.createInternalNote(params.applicationId!, {
        noteText,
        noteCategory
      });

      return json({ success: true });
    }

    default:
      return json({ error: 'Invalid action' }, 400);
  }
}

export default function ApplicationDetail() {
  const { property, application, applicants, documents, stageTransitions, notes } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Application: {applicants.find(a => a.applicantType === 'primary')?.firstName}{' '}
            {applicants.find(a => a.applicantType === 'primary')?.lastName}
          </h1>
          <p className="text-gray-600">
            {property.name} - Unit {application.unitNumber || 'TBD'}
          </p>
        </div>

        {/* Stage Workflow */}
        <StageWorkflowEnhanced
          application={application}
          applicants={applicants}
          documents={documents}
          stageTransitions={stageTransitions}
        />

        {/* Applicants */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              documents={documents.filter(d => d.applicantId === applicant.id)}
              isPrimary={applicant.applicantType === 'primary'}
            />
          ))}
        </div>

        {/* Notes */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Internal Notes</h2>
          {/* Notes list component */}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. UI Components

### 5.1 Enhanced StageWorkflow Component

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/components/applications/StageWorkflowEnhanced.tsx`

```typescript
import { useState } from 'react';
import { useFetcher } from '@remix-run/react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import type { ApplicationApplicant, ApplicationDocument, ApplicationStageTransition } from '../../../../../shared/types';
import { DocumentsStageChecker } from './stage-checkers/DocumentsStageChecker';
import { AIScreeningStageChecker } from './stage-checkers/AIScreeningStageChecker';
import { StageConfirmationDialog } from './dialogs/StageConfirmationDialog';

const STAGES = [
  { key: 'new', label: 'New Application', description: 'Initial application received' },
  { key: 'documents_pending', label: 'Documents', description: 'Awaiting required documents' },
  { key: 'ai_evaluated', label: 'AI Screening', description: 'AI evaluation in progress' },
  { key: 'screening', label: 'Background Check', description: 'Manual review and background check' },
  { key: 'decision', label: 'Decision', description: 'Shortlist or reject application' },
  { key: 'approved', label: 'Lease Preparation', description: 'Preparing lease documents' },
  { key: 'lease_signed', label: 'Lease Signed', description: 'Lease executed' }
];

interface Props {
  application: any;
  applicants: ApplicationApplicant[];
  documents: ApplicationDocument[];
  stageTransitions: ApplicationStageTransition[];
}

export function StageWorkflowEnhanced({ application, applicants, documents, stageTransitions }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const fetcher = useFetcher();

  const currentStageIndex = STAGES.findIndex(s => s.key === application.status);

  const handleStageAction = (action: string, nextStage?: string) => {
    setPendingAction(nextStage || action);
    setDialogOpen(true);
  };

  const handleConfirm = (data: any) => {
    fetcher.submit(
      {
        _action: 'stageTransition',
        toStage: pendingAction!,
        ...data
      },
      { method: 'post' }
    );
    setDialogOpen(false);
    setPendingAction(null);
  };

  return (
    <Card className="p-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STAGES.map((stage, idx) => (
            <div key={stage.key} className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2
                ${idx < currentStageIndex ? 'bg-green-500 border-green-500 text-white' :
                  idx === currentStageIndex ? 'bg-blue-500 border-blue-500 text-white' :
                  'bg-gray-200 border-gray-300 text-gray-500'}
              `}>
                {idx < currentStageIndex ? '✓' : idx + 1}
              </div>
              <span className="text-xs mt-1">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current stage info */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {STAGES[currentStageIndex]?.label}
        </h3>
        <p className="text-gray-600 text-sm">
          {STAGES[currentStageIndex]?.description}
        </p>
      </div>

      {/* Stage-specific checkers */}
      {application.status === 'documents_pending' && (
        <DocumentsStageChecker applicants={applicants} documents={documents} />
      )}

      {application.status === 'ai_evaluated' && (
        <AIScreeningStageChecker applicants={applicants} />
      )}

      {/* Stage actions */}
      <div className="flex gap-3 mt-6">
        {application.status === 'documents_pending' && (
          <>
            <Button onClick={() => handleStageAction('request_docs')}>
              Request Missing Docs
            </Button>
            <Button
              variant="default"
              onClick={() => handleStageAction('continue', 'ai_evaluated')}
            >
              Mark Docs Complete
            </Button>
          </>
        )}

        {application.status === 'ai_evaluated' && (
          <>
            <Button variant="outline" onClick={() => handleStageAction('rerun_ai')}>
              Re-run AI
            </Button>
            <Button onClick={() => handleStageAction('continue', 'screening')}>
              Continue to Background Check
            </Button>
          </>
        )}

        {application.status === 'screening' && (
          <>
            <Button variant="outline" onClick={() => handleStageAction('reject', 'rejected')}>
              Reject
            </Button>
            <Button onClick={() => handleStageAction('shortlist', 'decision')}>
              Shortlist
            </Button>
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      {dialogOpen && pendingAction && (
        <StageConfirmationDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
          currentStage={application.status}
          nextStage={pendingAction}
          applicants={applicants}
          documents={documents}
        />
      )}
    </Card>
  );
}
```

### 5.2 Document Stage Checker

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/components/applications/stage-checkers/DocumentsStageChecker.tsx`

```typescript
import { Card } from '@ui/card';
import { Checkbox } from '@ui/checkbox';
import type { ApplicationApplicant, ApplicationDocument } from '../../../../../../shared/types';

interface Props {
  applicants: ApplicationApplicant[];
  documents: ApplicationDocument[];
}

const REQUIRED_DOCS = ['government_id', 'paystub', 'bank_statement'];

export function DocumentsStageChecker({ applicants, documents }: Props) {
  const getApplicantDocs = (applicantId: string) => {
    return documents.filter(d => d.applicantId === applicantId);
  };

  const hasRequiredDoc = (applicantId: string, docType: string) => {
    return getApplicantDocs(applicantId).some(d =>
      d.documentType === docType && d.verificationStatus !== 'rejected'
    );
  };

  return (
    <Card className="p-4 bg-gray-50 mb-4">
      <h4 className="font-semibold mb-3">Document Checklist</h4>

      {applicants.map((applicant) => (
        <div key={applicant.id} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">
              {applicant.firstName} {applicant.lastName}
            </span>
            {applicant.applicantType === 'primary' && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Primary
              </span>
            )}
          </div>

          <div className="space-y-2 ml-4">
            {REQUIRED_DOCS.map((docType) => {
              const hasDoc = hasRequiredDoc(applicant.id, docType);
              return (
                <div key={docType} className="flex items-center gap-2">
                  <Checkbox checked={hasDoc} disabled />
                  <span className={hasDoc ? 'text-green-700' : 'text-gray-600'}>
                    {docType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {hasDoc && ' ✓'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
}
```

### 5.3 Stage Confirmation Dialog

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/components/applications/dialogs/StageConfirmationDialog.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { Textarea } from '@ui/textarea';
import type { ApplicationApplicant, ApplicationDocument } from '../../../../../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  currentStage: string;
  nextStage: string;
  applicants: ApplicationApplicant[];
  documents: ApplicationDocument[];
}

export function StageConfirmationDialog({
  open,
  onClose,
  onConfirm,
  currentStage,
  nextStage,
  applicants,
  documents
}: Props) {
  const [bypassReason, setBypassReason] = useState('');
  const [bypassCategory, setBypassCategory] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  if (!open) return null;

  const getMissingDocs = () => {
    const required = ['government_id', 'paystub', 'bank_statement'];
    const missing: Record<string, string[]> = {};

    applicants.forEach(applicant => {
      const applicantDocs = documents.filter(d => d.applicantId === applicant.id);
      const missingForApplicant = required.filter(
        docType => !applicantDocs.some(d => d.documentType === docType)
      );

      if (missingForApplicant.length > 0) {
        missing[`${applicant.firstName} ${applicant.lastName}`] = missingForApplicant;
      }
    });

    return missing;
  };

  const missingDocs = currentStage === 'documents_pending' ? getMissingDocs() : {};
  const hasMissingDocs = Object.keys(missingDocs).length > 0;

  const handleSubmit = () => {
    onConfirm({
      bypassReason: bypassReason || null,
      bypassCategory: bypassCategory || null,
      internalNotes: internalNotes || null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 bg-white">
        <h3 className="text-xl font-semibold mb-4">Confirm Stage Transition</h3>

        {/* Warning for missing docs */}
        {hasMissingDocs && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-medium text-yellow-800 mb-2">
              ⚠️ Missing Documents Detected
            </p>
            {Object.entries(missingDocs).map(([applicant, docs]) => (
              <div key={applicant} className="text-sm text-yellow-700 mb-1">
                <span className="font-medium">{applicant}:</span> {docs.join(', ')}
              </div>
            ))}
            <p className="text-sm text-yellow-700 mt-2">
              Are you sure you want to proceed without all required documents?
            </p>
          </div>
        )}

        {hasMissingDocs && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Bypass Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={bypassCategory}
                onChange={(e) => setBypassCategory(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select reason...</option>
                <option value="manual_override">Manual Override</option>
                <option value="emergency">Emergency Situation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Additional Notes
              </label>
              <Textarea
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                placeholder="Explain why you're bypassing the document requirements..."
                rows={3}
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Internal Notes (Optional)
          </label>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add any notes about this stage transition..."
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={hasMissingDocs && !bypassCategory}
          >
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/worker/lib/db/application-applicants.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApplicantsByApplicationId, createApplicant, updateApplicant } from './application-applicants';

describe('Application Applicants DB Functions', () => {
  let mockDB: any;

  beforeEach(() => {
    mockDB = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(),
      first: vi.fn(),
      run: vi.fn()
    };
  });

  describe('getApplicantsByApplicationId', () => {
    it('should fetch applicants for an application', async () => {
      const mockResults = {
        results: [
          {
            id: 'app_1',
            application_id: 'lead_1',
            applicant_type: 'primary',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '555-0100',
            employment_status: 'employed',
            monthly_income: 5000,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ]
      };

      mockDB.all.mockResolvedValue(mockResults);

      const result = await getApplicantsByApplicationId(mockDB, 'lead_1');

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
      expect(result[0].applicantType).toBe('primary');
    });

    it('should sort primary applicants first', async () => {
      const mockResults = {
        results: [
          {
            id: 'app_2',
            applicant_type: 'co_applicant',
            first_name: 'Jane',
            // ... other fields
          },
          {
            id: 'app_1',
            applicant_type: 'primary',
            first_name: 'John',
            // ... other fields
          }
        ]
      };

      mockDB.all.mockResolvedValue(mockResults);

      const result = await getApplicantsByApplicationId(mockDB, 'lead_1');

      // Primary should come first after sorting in the query
      expect(result[0].applicantType).toBe('primary');
    });
  });

  describe('createApplicant', () => {
    it('should create a new applicant with generated ID', async () => {
      const newApplicant = {
        applicationId: 'lead_1',
        applicantType: 'co_applicant' as const,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-0200',
        employmentStatus: 'employed' as const,
        monthlyIncome: 4500,
        createdBy: 'user_1'
      };

      mockDB.run.mockResolvedValue({ success: true });
      mockDB.first.mockResolvedValue({
        id: 'app_123',
        ...newApplicant,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      });

      const result = await createApplicant(mockDB, newApplicant);

      expect(result.id).toMatch(/^app_/);
      expect(result.firstName).toBe('Jane');
      expect(mockDB.prepare).toHaveBeenCalled();
    });
  });
});
```

### 6.2 Integration Tests

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/worker/routes/ops-applications.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import app from './ops-applications';

describe('Ops Applications API', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        all: vi.fn(),
        first: vi.fn(),
        run: vi.fn()
      }
    };
  });

  describe('GET /properties/:propertyId/applications', () => {
    it('should return applications for a property', async () => {
      // Test implementation
    });

    it('should filter by stage', async () => {
      // Test implementation
    });

    it('should filter by minimum AI score', async () => {
      // Test implementation
    });
  });

  describe('POST /applications/:applicationId/stage-transition', () => {
    it('should create a stage transition record', async () => {
      // Test implementation
    });

    it('should update lead status', async () => {
      // Test implementation
    });

    it('should require authentication', async () => {
      // Test implementation
    });
  });
});
```

### 6.3 Component Tests

**File**: `/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/components/applications/StageWorkflowEnhanced.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageWorkflowEnhanced } from './StageWorkflowEnhanced';

describe('StageWorkflowEnhanced', () => {
  const mockApplication = {
    id: 'lead_1',
    status: 'documents_pending',
    // ... other fields
  };

  const mockApplicants = [
    {
      id: 'app_1',
      applicationId: 'lead_1',
      applicantType: 'primary',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
      // ... other fields
    }
  ];

  it('should render all stage indicators', () => {
    render(
      <StageWorkflowEnhanced
        application={mockApplication}
        applicants={mockApplicants}
        documents={[]}
        stageTransitions={[]}
      />
    );

    expect(screen.getByText('New Application')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('AI Screening')).toBeInTheDocument();
  });

  it('should show document checker in documents stage', () => {
    render(
      <StageWorkflowEnhanced
        application={mockApplication}
        applicants={mockApplicants}
        documents={[]}
        stageTransitions={[]}
      />
    );

    expect(screen.getByText('Document Checklist')).toBeInTheDocument();
  });
});
```

---

## 7. Migration & Deployment

### 7.1 Preview Database Testing

```bash
# 1. Apply migration to preview database
npx wrangler d1 execute leaselab-preview --file=scripts/migrations/010_application_progress_workflow.sql

# 2. Verify tables created
npx wrangler d1 execute leaselab-preview --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'application_%'"

# 3. Check data migration
npx wrangler d1 execute leaselab-preview --command="SELECT COUNT(*) as count FROM application_applicants WHERE applicant_type='primary'"

# 4. Test rollback (if needed)
npx wrangler d1 execute leaselab-preview --command="DROP TABLE IF EXISTS application_applicants; DROP TABLE IF EXISTS application_documents; DROP TABLE IF EXISTS application_stage_transitions; DROP TABLE IF EXISTS application_internal_notes;"
```

### 7.2 Deployment Checklist

- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Migration tested on preview database
- [ ] Manual QA performed on preview environment
- [ ] No console errors in browser
- [ ] All API endpoints return expected data
- [ ] Stage transitions create audit records
- [ ] Document checkers display correctly
- [ ] Confirmation dialogs validate input
- [ ] Multi-applicant display works
- [ ] Mobile responsiveness verified

### 7.3 Production Migration

```bash
# 1. Backup production database (export to R2)
# 2. Apply migration
npx wrangler d1 execute leaselab-production --file=scripts/migrations/010_application_progress_workflow.sql

# 3. Verify migration
npx wrangler d1 execute leaselab-production --command="SELECT migration_name, applied_at FROM migration_history ORDER BY applied_at DESC LIMIT 5"

# 4. Deploy worker
npm run deploy

# 5. Monitor logs for errors
npx wrangler tail
```

---

## 8. Implementation Order

### Phase 1: Database Foundation (2-3 hours)
1. ✅ Create migration script with all tables
2. ✅ Define TypeScript types in `shared/types`
3. ✅ Write database helper functions
4. ✅ Write unit tests for DB functions
5. ✅ Test migration on preview database

### Phase 2: Worker API (2-3 hours)
1. ✅ Create `ops-applications.ts` route file
2. ✅ Implement GET endpoints (list, detail, applicants, documents)
3. ✅ Implement POST endpoints (create applicant, stage transition, notes)
4. ✅ Update `worker-client.ts` with new functions
5. ✅ Write integration tests for API endpoints

### Phase 3: UI Components (3-4 hours)
1. ✅ Build base components (ApplicantCard, DocumentsStageChecker)
2. ✅ Enhance StageWorkflow component
3. ✅ Create stage-specific checker components
4. ✅ Build confirmation dialog system
5. ✅ Write component tests

### Phase 4: Remix Routes (2-3 hours)
1. ✅ Create application board route
2. ✅ Create property application list route
3. ✅ Enhance application detail route
4. ✅ Wire up loaders and actions
5. ✅ Test routing and data flow

### Phase 5: Testing & QA (2-3 hours)
1. ✅ Run full test suite
2. ✅ Manual testing on preview
3. ✅ Test all stage transitions
4. ✅ Test multi-applicant flows
5. ✅ Test document checkers
6. ✅ Verify audit trails
7. ✅ Cross-browser testing

### Phase 6: Documentation & Deployment (1-2 hours)
1. ✅ Update feature documentation
2. ✅ Create deployment runbook
3. ✅ Deploy to production
4. ✅ Monitor for errors
5. ✅ User acceptance testing

---

## Success Criteria

- [ ] Property-centric application board displays all properties with pending application counts
- [ ] Application list sorts by AI score by default with working filters
- [ ] Multi-applicant households display correctly throughout the workflow
- [ ] Document checkers show per-applicant document status
- [ ] Stage transitions require confirmation with bypass reason for incomplete checkers
- [ ] All transitions create audit trail records
- [ ] Shortlist view aggregates applications by property
- [ ] Lease preparation handoff works correctly
- [ ] No breaking changes to existing lead functionality
- [ ] All tests passing with >80% coverage
- [ ] Zero production errors after deployment

---

## Rollback Plan

If critical issues arise:

1. Revert worker deployment: `git revert <commit> && npm run deploy`
2. Database rollback not recommended (data loss risk)
3. Feature flag: Add `ENABLE_APPLICATION_WORKFLOW=false` env var to disable new routes
4. Redirect routes to legacy `/admin/leads` path temporarily

---

## Future Enhancements

- [ ] Email templates for stage-specific communications
- [ ] Bulk actions for multiple applications
- [ ] Advanced filtering (date ranges, custom fields)
- [ ] Export to CSV/Excel
- [ ] Mobile app support
- [ ] Webhooks for stage transitions
- [ ] Integration with DocuSign for lease signatures
- [ ] Background check provider integrations (Checkr, Certn)
