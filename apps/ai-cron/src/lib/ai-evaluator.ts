import { Env } from '../types';

interface EvaluationInput {
  lead: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    move_in_date: string | null;
    monthly_rent: number | null;
  };
  documents: Array<{
    type: string;
    mimeType: string;
    data: ArrayBuffer;
  }>;
  modelVersion: string;
}

export interface EvaluationResult {
  score: number;
  label: 'A' | 'B' | 'C';
  recommendation: 'approve' | 'approve_with_conditions' | 'approve_with_verification' | 'reject';
  summary: string;
  risk_flags: string[];
  fraud_signals: string[];
  extracted_data: Record<string, any>;
}

/**
 * Main AI evaluation function
 * TODO: Replace stub with real Workers AI integration
 */
export async function evaluateWithAI(
  env: Env,
  input: EvaluationInput
): Promise<EvaluationResult> {

  console.log(`Evaluating lead: ${input.lead.first_name} ${input.lead.last_name}`);
  console.log(`Documents: ${input.documents.length}`);

  // STUB: Generate mock evaluation based on lead data
  // TODO: Replace with real AI model call
  const mockScore = generateMockScore(input);
  const label = scoreToLabel(mockScore);
  const recommendation = determineRecommendation(mockScore, []);

  return {
    score: mockScore,
    label,
    recommendation,
    summary: `AI evaluation stub: Lead has ${input.documents.length} documents. Mock score: ${mockScore}.`,
    risk_flags: mockScore < 70 ? ['stub_low_score'] : [],
    fraud_signals: [],
    extracted_data: {
      document_count: input.documents.length,
      stub_evaluation: true
    }
  };
}

/**
 * Generate mock score for testing (0-100)
 * Uses simple heuristics based on available data
 */
function generateMockScore(input: EvaluationInput): number {
  let score = 60; // Base score

  // Add points for having documents
  score += Math.min(input.documents.length * 5, 20);

  // Add points for having rental amount
  if (input.lead.monthly_rent && input.lead.monthly_rent > 0) {
    score += 10;
  }

  // Add points for having move-in date
  if (input.lead.move_in_date) {
    score += 10;
  }

  // Randomize slightly for testing variety
  score += Math.floor(Math.random() * 10) - 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Convert score to letter label
 */
function scoreToLabel(score: number): 'A' | 'B' | 'C' {
  if (score >= 80) return 'A';
  if (score >= 50) return 'B';
  return 'C';
}

/**
 * Determine recommendation based on score and fraud signals
 */
function determineRecommendation(
  score: number,
  fraudSignals: string[]
): 'approve' | 'approve_with_conditions' | 'approve_with_verification' | 'reject' {

  // Check for fraud first
  if (fraudSignals.some(s => s.includes('forged') || s.includes('altered'))) {
    return 'reject';
  }

  if (fraudSignals.some(s => s.includes('too_perfect') || s.includes('unusually_high'))) {
    return 'approve_with_verification';
  }

  // Standard scoring
  if (score >= 80) return 'approve';
  if (score >= 50) return 'approve_with_conditions';
  return 'reject';
}
