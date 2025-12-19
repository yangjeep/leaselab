/**
 * Test script for Workers AI integration
 *
 * This script tests the AI evaluator with mock data to ensure
 * all functions work correctly before deploying to production.
 *
 * Run with: npx tsx test-ai-integration.ts
 */

import { evaluateWithAI, EvaluationResult } from './src/lib/ai-evaluator';

// Mock environment for testing
const mockEnv = {
  AI: {
    run: async (model: string, input: any) => {
      console.log('\n📊 Mock Workers AI Called:');
      console.log('  Model:', model);
      console.log('  Prompt length:', input.prompt?.length || 0);
      console.log('  Images count:', input.images?.length || 0);
      console.log('  Max tokens:', input.max_tokens);

      // Simulate Workers AI response
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
          summary: "Strong candidate with verified income 3.25x monthly rent. Stable employment at reputable company with healthy savings. Minor concern: only 9 months at current position, but employer is well-known and income is well above requirement."
        })
      };
    }
  },
  DB: {} as any,
  R2_PRIVATE: {} as any,
  USE_REAL_AI_MODEL: 'true'
};

// Test data
const testInput = {
  lead: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "555-0100",
    move_in_date: "2025-02-01",
    monthly_rent: 2000
  },
  documents: [
    {
      type: 'government_id',
      mimeType: 'image/jpeg',
      data: new ArrayBuffer(1024) // Mock image data
    },
    {
      type: 'paystub',
      mimeType: 'image/jpeg',
      data: new ArrayBuffer(2048)
    },
    {
      type: 'bank_statement',
      mimeType: 'application/pdf',
      data: new ArrayBuffer(4096)
    }
  ],
  modelVersion: '@cf/meta/llama-3.2-11b-vision-instruct'
};

async function runTest() {
  console.log('🧪 Testing Workers AI Integration\n');
  console.log('=' .repeat(60));
  console.log('Test Input:');
  console.log(`  Applicant: ${testInput.lead.first_name} ${testInput.lead.last_name}`);
  console.log(`  Email: ${testInput.lead.email}`);
  console.log(`  Monthly Rent: $${testInput.lead.monthly_rent}`);
  console.log(`  Documents: ${testInput.documents.length}`);
  console.log(`  Model: ${testInput.modelVersion}`);
  console.log('=' .repeat(60));

  try {
    const result: EvaluationResult = await evaluateWithAI(mockEnv as any, testInput);

    console.log('\n✅ Evaluation Complete!\n');
    console.log('=' .repeat(60));
    console.log('📋 Results:');
    console.log('=' .repeat(60));
    console.log(`Score:          ${result.score}/100`);
    console.log(`Label:          ${result.label}`);
    console.log(`Recommendation: ${result.recommendation}`);
    console.log(`\nSummary:\n${result.summary}`);

    if (result.risk_flags.length > 0) {
      console.log(`\n⚠️  Risk Flags (${result.risk_flags.length}):`);
      result.risk_flags.forEach(flag => console.log(`  - ${flag}`));
    }

    if (result.fraud_signals.length > 0) {
      console.log(`\n🚨 Fraud Signals (${result.fraud_signals.length}):`);
      result.fraud_signals.forEach(signal => console.log(`  - ${signal}`));
    }

    console.log(`\n📊 Extracted Data:`);
    console.log(JSON.stringify(result.extracted_data, null, 2));
    console.log('=' .repeat(60));

    // Validate results
    console.log('\n🔍 Validation:');
    const checks = [
      { name: 'Score in range', pass: result.score >= 0 && result.score <= 100 },
      { name: 'Label valid', pass: ['A', 'B', 'C'].includes(result.label) },
      { name: 'Recommendation valid', pass: ['approve', 'approve_with_conditions', 'approve_with_verification', 'reject'].includes(result.recommendation) },
      { name: 'Summary exists', pass: result.summary.length > 0 },
      { name: 'Risk flags array', pass: Array.isArray(result.risk_flags) },
      { name: 'Fraud signals array', pass: Array.isArray(result.fraud_signals) },
      { name: 'Extracted data exists', pass: typeof result.extracted_data === 'object' }
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    console.log('\n' + '=' .repeat(60));
    if (allPassed) {
      console.log('🎉 All validation checks passed!');
    } else {
      console.log('❌ Some validation checks failed!');
    }
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  console.log('\n✨ Test completed successfully!\n');
}).catch((error) => {
  console.error('\n💥 Test error:', error);
  process.exit(1);
});
