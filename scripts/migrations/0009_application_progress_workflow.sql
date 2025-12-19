-- Migration: Application Progress Workflow
-- Date: 2025-12-19
-- Description: Adds multi-applicant support, stage guardrails, and audit trails
-- Idempotent: Safe to run multiple times

-- ============================================================================
-- PART 1: NEW TABLES
-- ============================================================================

-- Table: application_applicants
-- Stores primary applicant + co-applicants for each application
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

CREATE INDEX IF NOT EXISTS idx_application_applicants_application_id ON application_applicants(application_id);
CREATE INDEX IF NOT EXISTS idx_application_applicants_email ON application_applicants(email);
CREATE INDEX IF NOT EXISTS idx_application_applicants_invite_token ON application_applicants(invite_token);
CREATE INDEX IF NOT EXISTS idx_application_applicants_type ON application_applicants(application_id, applicant_type);

-- Table: application_documents
-- Document tracking with applicant-specific support
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

CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_applicant_id ON application_documents(applicant_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_type ON application_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_application_documents_storage_key ON application_documents(storage_key);

-- Table: application_stage_transitions
-- Audit trail for stage changes with confirmation metadata
CREATE TABLE IF NOT EXISTS application_stage_transitions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,

  -- Stage change
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  transition_type TEXT NOT NULL CHECK(transition_type IN ('manual', 'automatic', 'system')),

  -- Confirmation metadata
  confirmation_acknowledged INTEGER DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_stage_transitions_application_id ON application_stage_transitions(application_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_transitioned_at ON application_stage_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_from_to ON application_stage_transitions(application_id, from_stage, to_stage);

-- Table: application_internal_notes
-- Stage-specific internal notes with applicant tagging
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
  is_sensitive INTEGER DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_internal_notes_application_id ON application_internal_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_category ON application_internal_notes(note_category);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created_at ON application_internal_notes(created_at DESC);

-- ============================================================================
-- PART 2: EXTEND EXISTING TABLES
-- ============================================================================

-- Extend leads table with new columns for multi-applicant support
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN with CHECK constraints
-- So we'll add columns one at a time with safe error handling

-- Add primary_applicant_id reference
ALTER TABLE leads ADD COLUMN primary_applicant_id TEXT REFERENCES application_applicants(id);

-- Add shortlist tracking
ALTER TABLE leads ADD COLUMN shortlisted_at TEXT;
ALTER TABLE leads ADD COLUMN shortlisted_by TEXT REFERENCES users(id);
ALTER TABLE leads ADD COLUMN decision_deadline TEXT;

-- Add household aggregates
ALTER TABLE leads ADD COLUMN household_monthly_income REAL;
ALTER TABLE leads ADD COLUMN household_ai_score REAL;
ALTER TABLE leads ADD COLUMN applicant_count INTEGER DEFAULT 1;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_leads_primary_applicant ON leads(primary_applicant_id);
CREATE INDEX IF NOT EXISTS idx_leads_shortlisted_at ON leads(shortlisted_at);
CREATE INDEX IF NOT EXISTS idx_leads_property_shortlist ON leads(property_id, shortlisted_at) WHERE shortlisted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_household_score ON leads(household_ai_score DESC);

-- ============================================================================
-- PART 3: DATA MIGRATION
-- ============================================================================

-- Migrate existing leads to create primary applicant records
-- Only create if they don't already exist (idempotent)
INSERT INTO application_applicants (
  id,
  application_id,
  applicant_type,
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
  created_at,
  updated_at
)
SELECT
  'app_' || l.id || '_primary',
  l.id,
  'primary',
  l.first_name,
  l.last_name,
  l.email,
  l.phone,
  l.employment_status,
  NULL, -- employer_name not in leads table
  NULL, -- job_title not in leads table
  l.monthly_income,
  l.ai_score,
  l.ai_label,
  l.created_at,
  l.updated_at
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM application_applicants aa
  WHERE aa.application_id = l.id
  AND aa.applicant_type = 'primary'
);

-- Update leads.primary_applicant_id to point to the primary applicant
UPDATE leads
SET primary_applicant_id = (
  SELECT id FROM application_applicants
  WHERE application_applicants.application_id = leads.id
  AND application_applicants.applicant_type = 'primary'
  LIMIT 1
)
WHERE primary_applicant_id IS NULL;

-- Set household_monthly_income from existing monthly_income
UPDATE leads
SET household_monthly_income = monthly_income,
    household_ai_score = ai_score,
    applicant_count = 1
WHERE household_monthly_income IS NULL;

-- Migrate existing lead_files to application_documents
-- Map file types and associate with primary applicant
INSERT INTO application_documents (
  id,
  application_id,
  applicant_id,
  document_type,
  file_name,
  file_size,
  mime_type,
  storage_key,
  verification_status,
  uploaded_at
)
SELECT
  'doc_' || lf.id,
  lf.lead_id,
  l.primary_applicant_id,
  lf.file_type, -- Assumes file_type values match document_type enum
  lf.file_name,
  lf.file_size,
  lf.mime_type,
  lf.r2_key, -- Use r2_key, not storage_key
  'pending', -- Default verification status
  lf.uploaded_at
FROM lead_files lf
JOIN leads l ON lf.lead_id = l.id
WHERE NOT EXISTS (
  SELECT 1 FROM application_documents ad
  WHERE ad.storage_key = lf.r2_key
)
AND lf.file_type IN ('government_id', 'paystub', 'bank_statement', 'tax_return', 'employment_letter', 'other');

-- ============================================================================
-- PART 4: MIGRATION HISTORY
-- ============================================================================

-- Track that this migration has been applied
-- Note: migration_history table is created in migration 0000 if using that pattern
-- If not, we'll create it here
CREATE TABLE IF NOT EXISTS migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO migration_history (migration_name)
VALUES ('0009_application_progress_workflow');
