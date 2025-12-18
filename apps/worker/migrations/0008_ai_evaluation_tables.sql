-- Migration: AI Evaluation Tables
-- Created: 2025-12-18
-- Description: Tables for async AI evaluation jobs and quota tracking

-- Job tracking table
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  evaluation_id TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  model_version TEXT NOT NULL DEFAULT '@cf/meta/llama-3.2-11b-vision-instruct',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (evaluation_id) REFERENCES lead_ai_evaluations(id)
);

CREATE INDEX idx_ai_jobs_lead_id ON ai_evaluation_jobs(lead_id);
CREATE INDEX idx_ai_jobs_site_id ON ai_evaluation_jobs(site_id);
CREATE INDEX idx_ai_jobs_status ON ai_evaluation_jobs(status);
CREATE INDEX idx_ai_jobs_requested_at ON ai_evaluation_jobs(requested_at DESC);
CREATE INDEX idx_ai_jobs_lead_status ON ai_evaluation_jobs(lead_id, status);

-- Usage tracking table
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL,
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, month)
);

CREATE INDEX idx_ai_usage_site_month ON ai_evaluation_usage(site_id, month);
