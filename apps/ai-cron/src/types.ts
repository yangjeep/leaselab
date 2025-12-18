export interface Env {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  AI: Ai;
}

export interface AIEvaluationJob {
  id: string;
  lead_id: string;
  site_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  evaluation_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  model_version: string;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  site_id: string;
  month: string;
  evaluation_count: number;
  quota_limit: number;
  tier: 'free' | 'pro' | 'enterprise';
}
