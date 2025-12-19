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
 * Routes to stub or real AI based on environment
 */
export async function evaluateWithAI(
  env: Env,
  input: EvaluationInput
): Promise<EvaluationResult> {

  console.log(`Evaluating lead: ${input.lead.first_name} ${input.lead.last_name}`);
  console.log(`Documents: ${input.documents.length}`);

  // Check environment flag to determine which evaluator to use
  const useRealAI = env.USE_REAL_AI_MODEL === 'true';

  if (useRealAI) {
    console.log('Using real Workers AI model');
    return evaluateWithWorkersAI(env, input);
  } else {
    console.log('Using stub evaluator (preview mode)');
    return evaluateWithStub(input);
  }
}

/**
 * Real Workers AI evaluation using LLaMA 3.2 Vision
 */
async function evaluateWithWorkersAI(
  env: Env,
  input: EvaluationInput
): Promise<EvaluationResult> {

  // TODO: Implement real Workers AI integration
  // This is a placeholder for the production implementation

  try {
    // Prepare document images for vision model
    const imageInputs = input.documents
      .filter(doc => doc.mimeType.startsWith('image/') || doc.mimeType === 'application/pdf')
      .map(doc => ({
        type: doc.type,
        data: doc.data
      }));

    // Call Workers AI with LLaMA 3.2 Vision model
    // const response = await env.AI.run(input.modelVersion, {
    //   prompt: buildEvaluationPrompt(input.lead),
    //   images: imageInputs
    // });

    // For now, return mock data with a note that this will be implemented
    console.warn('Real Workers AI integration pending - using mock response');

    const mockScore = generateMockScore(input);
    const label = scoreToLabel(mockScore);
    const recommendation = determineRecommendation(mockScore, []);

    return {
      score: mockScore,
      label,
      recommendation,
      summary: `Production AI evaluation (Workers AI integration pending). Lead has ${input.documents.length} documents.`,
      risk_flags: mockScore < 70 ? ['pending_real_ai_integration'] : [],
      fraud_signals: [],
      extracted_data: {
        document_count: input.documents.length,
        production_mode: true,
        workers_ai_pending: true
      }
    };

  } catch (error) {
    console.error('Workers AI evaluation failed:', error);
    throw new Error(`AI evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stub evaluation for preview/development
 */
function evaluateWithStub(input: EvaluationInput): EvaluationResult {
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
