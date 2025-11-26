import OpenAI from 'openai';
import type { Lead, LeadFile, LeadAIResult } from '~/shared/types';
import type { AIEvaluationResultInput } from '~/shared/config';

export interface AIEvaluationInput {
  lead: Lead;
  files: LeadFile[];
  propertyRent: number;
  signedUrls: Record<string, string>;
}

export async function runLeadAIEvaluation(
  openaiApiKey: string,
  input: AIEvaluationInput
): Promise<AIEvaluationResultInput> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const { lead, files, propertyRent, signedUrls } = input;
  const incomeToRentRatio = lead.monthlyIncome / propertyRent;

  // Build content for OpenAI
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: buildPrompt(lead, propertyRent, incomeToRentRatio, files),
    },
  ];

  // Add images for document analysis
  for (const file of files) {
    const url = signedUrls[file.id];
    if (url && isImageFile(file.mimeType)) {
      content.push({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      });
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert tenant screening AI assistant. Analyze the provided tenant application and documents to evaluate their suitability as a renter.

Your evaluation must be objective, fair, and based solely on the provided information. Consider:
- Income to rent ratio (standard is 3x monthly rent)
- Employment stability
- Document authenticity signals
- Overall financial capability

You MUST respond with valid JSON matching this exact structure:
{
  "score": <number 0-100>,
  "label": "<A|B|C|D>",
  "summary": "<brief summary>",
  "risk_flags": ["<flag1>", "<flag2>"],
  "recommendation": "<recommendation>",
  "fraud_signals": ["<signal1>"],
  "model_version": "v1"
}

Scoring guide:
- A (80-100): Excellent candidate, strong financials, all documents clear
- B (60-79): Good candidate, meets requirements with minor concerns
- C (40-59): Fair candidate, some risk factors present
- D (0-39): High risk, does not meet requirements`,
      },
      {
        role: 'user',
        content,
      },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('No response from AI model');
  }

  // Parse JSON response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const result = JSON.parse(jsonMatch[0]) as AIEvaluationResultInput;
  return result;
}

function buildPrompt(
  lead: Lead,
  propertyRent: number,
  incomeToRentRatio: number,
  files: LeadFile[]
): string {
  const fileList = files.map(f => `- ${f.fileType}: ${f.fileName}`).join('\n');

  return `
## Tenant Application Evaluation

### Applicant Information
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Current Address: ${lead.currentAddress || 'Not provided'}

### Financial Information
- Employment Status: ${lead.employmentStatus}
- Monthly Income: $${lead.monthlyIncome.toLocaleString()}
- Property Rent: $${propertyRent.toLocaleString()}
- Income to Rent Ratio: ${incomeToRentRatio.toFixed(2)}x (Standard requirement: 3x)

### Desired Move-in Date
${lead.moveInDate}

### Additional Message
${lead.message || 'None provided'}

### Uploaded Documents
${fileList || 'No documents uploaded'}

Please analyze this application and the attached documents (if any) to provide your evaluation.
`;
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

// Generate presigned URLs for R2 files
export async function generateSignedUrls(
  bucket: R2Bucket,
  files: LeadFile[],
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};

  for (const file of files) {
    // In production, use proper presigned URL generation
    // For now, we'll use direct R2 object access within Workers
    const object = await bucket.get(file.r2Key);
    if (object) {
      // Create a temporary URL for the object
      // Note: In production, implement proper presigned URLs
      urls[file.id] = `r2://${file.r2Key}`;
    }
  }

  return urls;
}
