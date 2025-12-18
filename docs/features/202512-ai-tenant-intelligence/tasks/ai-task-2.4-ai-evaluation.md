# Task 2.4: AI Evaluation Logic

**Estimated Time**: 2-3 hours
**Dependencies**: None (can work standalone)
**Files to Create**: `apps/ai-cron/src/lib/ai-evaluator.ts`

---

## Objective

Implement the core AI evaluation logic:
1. Format prompt with lead and document data
2. Call Workers AI multi-modal model
3. Parse AI response
4. Calculate score and label
5. Detect fraud signals

---

## Implementation

### File: `apps/ai-cron/src/lib/ai-evaluator.ts`

```typescript
import { Env } from '../types';

interface EvaluationInput {
  lead: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    move_in_date: string;
    monthly_rent: number;
  };
  documents: Array<{
    type: string;
    mimeType: string;
    data: ArrayBuffer;
  }>;
  modelVersion: string;
}

interface EvaluationResult {
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
 */
export async function evaluateWithAI(
  env: Env,
  input: EvaluationInput
): Promise<EvaluationResult> {

  // Step 1: Build prompt
  const prompt = buildEvaluationPrompt(input.lead);

  // Step 2: Prepare images for multi-modal model
  const images = input.documents
    .filter(doc => doc.mimeType.startsWith('image/'))
    .map(doc => ({
      type: doc.type,
      data: arrayBufferToBase64(doc.data)
    }));

  // Step 3: Call Workers AI
  const aiResponse = await env.AI.run(
    input.modelVersion as any,
    {
      prompt,
      images: images.map(img => img.data),
      max_tokens: 2000
    }
  );

  // Step 4: Parse AI response
  const parsed = parseAIResponse(aiResponse);

  // Step 5: Calculate score and label
  const score = calculateScore(parsed);
  const label = scoreToLabel(score);
  const recommendation = determineRecommendation(score, parsed.fraud_signals);

  return {
    score,
    label,
    recommendation,
    summary: parsed.summary,
    risk_flags: parsed.risk_flags,
    fraud_signals: parsed.fraud_signals,
    extracted_data: parsed.extracted_data
  };
}

/**
 * Build AI prompt
 */
function buildEvaluationPrompt(lead: EvaluationInput['lead']): string {
  return `You are an expert tenant screening assistant. Analyze the provided rental application documents and evaluate the applicant's suitability as a tenant.

APPLICANT INFORMATION:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Desired Move-in: ${lead.move_in_date}
- Monthly Rent: $${lead.monthly_rent}

INSTRUCTIONS:
1. Extract key information from all provided documents (ID, paystub, bank statements, employment letters)
2. Verify income meets requirements (minimum 3x monthly rent)
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
 * Parse AI response
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
 * Calculate score (0-100)
 */
function calculateScore(parsed: ReturnType<typeof parseAIResponse>): number {
  let score = 100; // Start perfect

  const { extracted_data, risk_flags, fraud_signals } = parsed;

  // Income verification (max -30 points)
  const monthlyIncome = extracted_data.monthly_income || 0;
  const rentRatio = extracted_data.rent_ratio || 0;

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
 * Convert score to label (3-tier system)
 */
function scoreToLabel(score: number): 'A' | 'B' | 'C' {
  if (score >= 80) return 'A'; // Strongly Recommend
  if (score >= 50) return 'B'; // Check Further
  return 'C'; // No Go
}

/**
 * Determine recommendation
 */
function determineRecommendation(
  score: number,
  fraudSignals: string[]
): 'approve' | 'approve_with_conditions' | 'approve_with_verification' | 'reject' {

  // Obvious fraud → reject
  if (fraudSignals.includes('forged_document') ||
      fraudSignals.includes('altered_paystub')) {
    return 'reject';
  }

  // "Too good to be true" → verify
  if (score >= 95 &&
      (fraudSignals.includes('too_perfect_documents') ||
       fraudSignals.includes('unusually_high_income'))) {
    return 'approve_with_verification';
  }

  // Standard scoring
  if (score >= 80) return 'approve';
  if (score >= 50) return 'approve_with_conditions';
  return 'reject';
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
```

---

## Testing Locally

### Create test script: `apps/ai-cron/test-ai.ts`

```typescript
import { evaluateWithAI } from './src/lib/ai-evaluator';

// Mock env (for local testing)
const mockEnv = {
  AI: {
    run: async (model: string, input: any) => {
      console.log('AI called with:', { model, prompt: input.prompt.slice(0, 200) });

      // Mock response
      return {
        response: JSON.stringify({
          extracted_data: {
            monthly_income: 6500,
            employer: "Google Inc",
            employment_duration_months: 9,
            bank_balance: 18000,
            document_quality: "excellent"
          },
          risk_flags: ["employment_duration_short"],
          fraud_signals: [],
          summary: "Strong candidate with verified income 3.25x monthly rent. Minor concern: only 9 months at current position."
        })
      };
    }
  }
};

const testInput = {
  lead: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "555-0100",
    move_in_date: "2025-02-01",
    monthly_rent: 2000
  },
  documents: [],
  modelVersion: '@cf/meta/llama-3.2-11b-vision-instruct'
};

evaluateWithAI(mockEnv as any, testInput).then(result => {
  console.log('\n✅ Evaluation Result:');
  console.log(JSON.stringify(result, null, 2));
});
```

Run test:
```bash
cd apps/ai-cron
npx tsx test-ai.ts
```

---

## Next Step

➡️ **[Task 3.1: Evaluation Button](./ai-task-3.1-evaluation-button.md)**

Build the frontend UI component to trigger AI evaluations.
