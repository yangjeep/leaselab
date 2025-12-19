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

  try {
    console.log('Starting Workers AI evaluation');

    // Step 1: Build comprehensive prompt
    const prompt = buildEvaluationPrompt(input.lead);
    console.log('Prompt built:', prompt.substring(0, 200) + '...');

    // Step 2: Prepare images for multi-modal model
    const images = input.documents
      .filter(doc => doc.mimeType.startsWith('image/') || doc.mimeType === 'application/pdf')
      .map(doc => ({
        type: doc.type,
        data: arrayBufferToBase64(doc.data)
      }));

    console.log(`Prepared ${images.length} images for vision model`);

    // Step 3: Call Workers AI
    const aiResponse = await env.AI.run(
      input.modelVersion as any,
      {
        prompt,
        images: images.map(img => img.data),
        max_tokens: 2000
      }
    );

    console.log('AI response received');

    // Step 4: Parse AI response
    const parsed = parseAIResponse(aiResponse);
    console.log('Parsed AI response:', parsed.summary.substring(0, 100));

    // Step 5: Calculate score and label
    const score = calculateScore(parsed, input.lead.monthly_rent);
    const label = scoreToLabel(score);
    const recommendation = determineRecommendation(score, parsed.fraud_signals);

    console.log(`Evaluation complete: Score ${score}, Label ${label}, Recommendation ${recommendation}`);

    return {
      score,
      label,
      recommendation,
      summary: parsed.summary,
      risk_flags: parsed.risk_flags,
      fraud_signals: parsed.fraud_signals,
      extracted_data: parsed.extracted_data
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

/**
 * Build AI evaluation prompt following the PRD specifications
 */
function buildEvaluationPrompt(lead: EvaluationInput['lead']): string {
  const monthlyRent = lead.monthly_rent || 2000;
  const requiredIncome = monthlyRent * 3;

  return `You are an expert tenant screening assistant. Analyze the provided rental application documents and evaluate the applicant's suitability as a tenant.

APPLICANT INFORMATION:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Desired Move-in: ${lead.move_in_date || 'Not specified'}
- Monthly Rent: $${monthlyRent}

INSTRUCTIONS:
1. Extract key information from all provided documents (ID, paystub, bank statements, employment letters)
2. Verify income meets requirements (minimum 3x monthly rent = $${requiredIncome})
3. Check for fraud signals (altered documents, fake templates, "too good to be true" patterns)
4. Identify any risk factors

RETURN YOUR ANALYSIS IN THIS EXACT JSON FORMAT:
{
  "extracted_data": {
    "monthly_income": <number>,
    "employer": "<string>",
    "employment_duration_months": <number>,
    "bank_balance": <number>,
    "document_quality": "excellent|good|poor"
  },
  "risk_flags": [
    // Use ONLY these exact strings if applicable:
    // "income_below_requirement", "employment_duration_short", "documents_incomplete",
    // "documents_illegible", "financial_health_poor", "inconsistent_information"
  ],
  "fraud_signals": [
    // Use ONLY these exact strings if detected:
    // Obvious fraud: "forged_document", "altered_paystub", "fake_employment_letter", "suspicious_bank_statement"
    // Sophisticated fraud: "too_perfect_documents", "unusually_high_income", "perfect_score_red_flag", "inconsistent_lifestyle"
  ],
  "summary": "<2-3 sentences explaining the evaluation>"
}

FRAUD DETECTION (Multi-Modal):
- Look for font inconsistencies within same document
- Check if logos are pixelated (copied from web vs original)
- Verify document formatting matches authentic templates
- Spot digital alteration artifacts (cloning, number airbrushing)
- Flag "too perfect" documents (pristine PDFs of "scanned" docs, no natural artifacts)
- Flag unusually high income for job title (e.g., junior analyst earning $200k/year)

COMPLIANCE:
DO NOT consider or reference: race, ethnicity, religion, family status, disability, gender, age.
Base evaluation solely on financial qualifications and document authenticity.`;
}

/**
 * Parse AI response from Workers AI
 */
function parseAIResponse(aiResponse: any): {
  summary: string;
  risk_flags: string[];
  fraud_signals: string[];
  extracted_data: Record<string, any>;
} {
  try {
    // AI response format varies - handle both raw text and structured
    let jsonText = '';

    if (typeof aiResponse === 'string') {
      jsonText = aiResponse;
    } else if (aiResponse.response) {
      jsonText = aiResponse.response;
    } else if (aiResponse.result) {
      jsonText = aiResponse.result;
    } else {
      jsonText = JSON.stringify(aiResponse);
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/) ||
                      jsonText.match(/```\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || 'No summary provided',
      risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
      fraud_signals: Array.isArray(parsed.fraud_signals) ? parsed.fraud_signals : [],
      extracted_data: parsed.extracted_data || {}
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);

    // Fallback response
    return {
      summary: 'Unable to complete automated evaluation. Manual review required.',
      risk_flags: ['documents_illegible'],
      fraud_signals: [],
      extracted_data: {}
    };
  }
}

/**
 * Calculate score (0-100) based on parsed AI data and risk factors
 */
function calculateScore(
  parsed: ReturnType<typeof parseAIResponse>,
  monthlyRent: number | null
): number {
  let score = 100; // Start perfect

  const { extracted_data, risk_flags, fraud_signals } = parsed;
  const rent = monthlyRent || 2000;

  // Income verification (max -30 points)
  const monthlyIncome = extracted_data.monthly_income || 0;
  const rentRatio = monthlyIncome / rent;

  if (rentRatio < 2) {
    score -= 30; // Income < 2x rent
  } else if (rentRatio < 2.5) {
    score -= 20; // Income 2-2.5x rent
  } else if (rentRatio < 3) {
    score -= 10; // Income 2.5-3x rent
  }
  // else: Income ≥ 3x rent → no deduction

  // Employment stability (max -20 points)
  const employmentMonths = extracted_data.employment_duration_months || 0;

  if (employmentMonths === 0) {
    score -= 20; // Unemployed
  } else if (employmentMonths < 12) {
    score -= 15; // < 1 year
  } else if (employmentMonths < 24) {
    score -= 5; // 1-2 years
  }
  // else: > 2 years → no deduction

  // Document quality (max -15 points)
  const docQuality = extracted_data.document_quality || 'good';

  if (docQuality === 'poor') {
    score -= 15;
  } else if (docQuality === 'good') {
    score -= 5;
  }
  // else: excellent → no deduction

  // Risk flags (variable deductions)
  if (risk_flags.includes('income_below_requirement')) score -= 20;
  if (risk_flags.includes('documents_incomplete')) score -= 10;
  if (risk_flags.includes('financial_health_poor')) score -= 10;
  if (risk_flags.includes('inconsistent_information')) score -= 15;

  // Fraud signals (severe deductions)
  if (fraud_signals.includes('forged_document')) score -= 50;
  if (fraud_signals.includes('altered_paystub')) score -= 50;
  if (fraud_signals.includes('fake_employment_letter')) score -= 40;
  if (fraud_signals.includes('suspicious_bank_statement')) score -= 30;

  // "Too good to be true" signals (flag for verification, not rejection)
  if (fraud_signals.includes('too_perfect_documents')) score -= 10;
  if (fraud_signals.includes('unusually_high_income')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
