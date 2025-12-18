# AI Tenant Intelligence - Executive Summary

## Quick Reference Guide

### 🎯 Three-Tier Labeling System

| Label | Score Range | Meaning | Action |
|-------|-------------|---------|--------|
| **A - Strongly Recommend** | 80-100 | High-quality candidate | Move quickly to secure this tenant |
| **B - Check Further, Keep Warm** | 50-79 | Promising but verify | Additional verification needed, maintain contact |
| **C - No Go** | 0-49 | Significant issues | Recommend reject |

### 🔍 Four Recommendation Types

1. **`approve`** - Score ≥80, no fraud signals → Standard approval
2. **`approve_with_conditions`** - Score 50-79 → Higher deposit, co-signer, or guarantor
3. **`approve_with_verification`** - Score ≥80 BUT "too good to be true" flags → Verify directly with employer/bank
4. **`reject`** - Score <50 OR serious fraud → Decline application

---

## 🚨 "Too Good to Be True" Detection (Critical Feature)

### Why It Matters
Sophisticated fraudsters create **perfect-looking applications** that pass basic checks but are entirely fabricated. Traditional screening misses these because all numbers add up correctly.

### Detection Signals

| Signal | What It Means | Example |
|--------|---------------|---------|
| `too_perfect_documents` | Documents are suspiciously pristine, no natural scanning artifacts | All PDFs are native (not scanned), zero imperfections |
| `unusually_high_income` | Income far exceeds typical range for job title | "Junior Analyst" earning $200k/year |
| `perfect_score_red_flag` | All criteria met with no natural variation | Every document perfect, every ratio exact |
| `inconsistent_lifestyle` | Bank transactions don't match claimed income | High income but only fast food purchases, no rent/mortgage |

### Example Scenario

**Applicant Profile**:
- Job: "Marketing Coordinator"
- Claimed Income: $180,000/year ($15,000/month)
- Documents: Pristine PDFs, perfect formatting, all ratios ideal

**AI Analysis**:
- Score: 95/100 (mathematically perfect)
- Label: A (but flagged)
- Recommendation: **APPROVE_WITH_VERIFICATION** ⚠️
- Fraud Signals: `["unusually_high_income", "too_perfect_documents"]`
- Summary: "Excellent credentials on paper, but income is 3x typical for job title and documents appear template-generated. **Verify directly with employer before approval.**"

**Landlord Action**:
1. Calls stated employer → "No employee by that name"
2. Application rejected, fraud prevented ✅

**Impact**: Without this check, landlord would have approved a fraudulent application with a 95/100 score.

---

## 🖼️ Multi-Modal AI Architecture (No OCR)

### Why Multi-Modal is Critical

**Traditional Approach** (Two-Step - NOT USED):
```
Documents → OCR Service → Text Extraction → LLM Analysis → Result
            ❌ Loses visual fraud signals
            ❌ Can't detect photoshopped images
            ❌ Two API calls (more expensive)
```

**Our Approach** (Single-Step - RECOMMENDED):
```
Documents → Multi-Modal AI (LLaMA 3.2 Vision) → Result
            ✅ Detects visual fraud (altered fonts, pixelation)
            ✅ Verifies logos and letterheads
            ✅ One API call (faster, cheaper)
```

### Visual Fraud Detection Capabilities

The multi-modal model can detect:

1. **Font Inconsistencies**
   - Example: Paystub where income amount uses different font than rest of document
   - Signal: Numbers were digitally altered

2. **Pixelated Logos**
   - Example: Company logo is blurry (copied from Google Images)
   - Signal: Not an authentic document from the company

3. **Template Mismatches**
   - Example: "Chase Bank" statement with incorrect formatting
   - Signal: Fake statement using wrong template

4. **Digital Alteration Artifacts**
   - Example: Cloning patterns around numbers, airbrushing edges
   - Signal: Document was photoshopped

5. **Native vs. Scanned PDFs**
   - Example: "Official" paystub is a pristine PDF (not scanned)
   - Signal: May be template-generated, not authentic

### Cost & Performance

| Metric | Multi-Modal (Chosen) | OCR + LLM (Not Used) |
|--------|----------------------|----------------------|
| **API Calls** | 1 | 2 |
| **Processing Time** | 5-10 seconds | 8-15 seconds |
| **Fraud Detection** | High (visual + text) | Low (text only) |
| **Cost per Eval** | ~75 neurons | ~100 neurons |
| **Free Tier Capacity** | 133 evals/day | 100 evals/day |

---

## 🔐 Fraud Signal Categories

### Tier 1: Obvious Fraud (Auto-Reject)
- `forged_document` - Clear visual forgery
- `altered_paystub` - Digital manipulation detected
- `fake_employment_letter` - Generic template, no letterhead
- `suspicious_bank_statement` - Wrong formatting/logos
- `identity_mismatch` - Name discrepancies

**Action**: Immediate rejection, no manual review needed

---

### Tier 2: Sophisticated Fraud (Require Verification)
- `too_perfect_documents` - Suspiciously pristine, may be AI-generated
- `unusually_high_income` - Income far exceeds job title norms
- `perfect_score_red_flag` - All criteria met perfectly (unnatural)
- `inconsistent_lifestyle` - Bank activity doesn't match income

**Action**: Flag for manual verification (call employer, verify bank)

---

## 📊 Score Calculation (100 Points Total)

| Factor | Weight | Scoring |
|--------|--------|---------|
| **Income Verification** | 30 pts | Income ≥3x rent: 30 pts<br>2.5-3x: 20 pts<br>2-2.5x: 10 pts |
| **Employment Stability** | 20 pts | Full-time >2yr: 20 pts<br>Full-time 1-2yr: 15 pts<br>Self-employed: 10 pts |
| **Document Completeness** | 15 pts | All docs: 15 pts<br>Missing 1: 10 pts |
| **Document Authenticity** | 15 pts | No fraud: 15 pts<br>Minor concerns: 10 pts |
| **Financial Health** | 10 pts | Savings ≥6mo rent: 10 pts<br>3-6mo: 7 pts |
| **Application Quality** | 10 pts | Complete/professional: 10 pts<br>Minor issues: 5 pts |

### Label Assignment
- **80-100 points** → Label A (Strongly Recommend)
- **50-79 points** → Label B (Check Further, Keep Warm)
- **0-49 points** → Label C (No Go)

---

## 💰 Cost Control & Quotas

### Free Tier Quotas
- **Per Site**: 20 evaluations/month
- **Super Admin**: Aggregate across all sites ≤ free tier (10k neurons/day)
- **Auto-reset**: 1st of each month (UTC)

### Cost Projections

| Usage Scenario | Monthly Evals | Neurons Used | Cost |
|----------------|---------------|--------------|------|
| Small Landlord (1-3 properties) | 10 | 750 | $0 (free tier) |
| Property Manager (5-20 properties) | 100 | 7,500 | $0 (free tier) |
| Large Operator (50+ units) | 500 | 37,500 | $5 + $0.30 = **$5.30** |

**Free tier capacity**: 300,000 neurons/month = ~4,000 evaluations

---

## 🎨 UI/UX Quick Reference

### Label Colors
- **Label A**: Green badge (Strongly Recommend)
- **Label B**: Blue badge (Check Further)
- **Label C**: Red badge (No Go)

### Recommendation Chips
- **APPROVE** ✓ - Green chip
- **APPROVE WITH CONDITIONS** ⚠️ - Yellow chip with note (e.g., "Require co-signer")
- **APPROVE WITH VERIFICATION** ⚠️ - Orange chip with warning icon
- **REJECT** ✗ - Red chip

### Warning Levels
1. **No warnings** - Clean approval (green)
2. **Yellow warning** - "⚠️ HIGH SCORE BUT VERIFY FIRST" (too perfect)
3. **Red warning** - "⚠️ FRAUD SIGNALS DETECTED" (obvious fraud)

---

## 🏗️ Implementation Phases

### Phase 1: MVP (Weeks 1-2)
✅ Core Features:
- Basic AI evaluation endpoint
- Multi-modal document analysis (LLaMA 3.2 Vision)
- 3-tier labeling (A/B/C)
- Quota tracking (20/site/month)
- "Run AI Evaluation" button in UI

### Phase 2: Enhanced Intelligence (Weeks 3-4)
✅ Advanced Features:
- "Too good to be true" detection
- Visual fraud signal analysis
- Manual override workflow with audit trail
- Usage analytics dashboard

### Phase 3: Optimization (Weeks 5-6)
✅ Performance:
- Async evaluation for slow responses
- Batch evaluation (multiple leads at once)
- Email notifications for A-rated candidates

---

## 📋 Compliance Checklist

✅ **Fair Housing Act Compliance**:
- Never considers: Race, religion, family status, disability, national origin
- Only considers: Financial qualifications, employment, document quality
- Human-readable explanations for all decisions
- 3-year data retention with full audit trail

✅ **Data Privacy**:
- Presigned R2 URLs with 5-minute expiration
- No PII in AI prompts beyond what's necessary
- GDPR-compliant data deletion on request

✅ **Audit Trail**:
- Every evaluation logged in `ai_evaluation_audit` table
- Manual overrides require written justification
- Model version tracking for reproducibility

---

## 🚀 Getting Started (For Developers)

### 1. Model Selection (FINAL)
```toml
# Use this model - multi-modal, free tier
@cf/meta/llama-3.2-11b-vision-instruct
```

### 2. Key API Endpoint
```typescript
POST /api/ops/leads/:id/evaluate

Response:
{
  score: 82,
  label: "A",  // "A" | "B" | "C"
  recommendation: "approve",  // "approve" | "approve_with_conditions" | "approve_with_verification" | "reject"
  summary: "Strong candidate with verified income...",
  risk_flags: ["employment_duration_short"],
  fraud_signals: []  // Can include "too_perfect_documents", "unusually_high_income", etc.
}
```

### 3. Fraud Detection Logic
```typescript
// Check "too good to be true" FIRST
if (score >= 95 && hasSuspiciouslyPerfectDocuments()) {
  return {
    recommendation: 'approve_with_verification',
    fraud_signals: ['too_perfect_documents']
  };
}

// Then check obvious fraud
if (fraud_signals.includes('forged_document')) {
  return { recommendation: 'reject' };
}

// Standard scoring
if (score >= 80) return { recommendation: 'approve' };
if (score >= 50) return { recommendation: 'approve_with_conditions' };
return { recommendation: 'reject' };
```

---

## 🎯 Success Metrics (3 Months Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption Rate** | 60% of leads evaluated | `COUNT(ai_evaluated) / COUNT(total_leads)` |
| **Fraud Detection** | 15-20% catch rate | `COUNT(fraud_signals > 0)` |
| **AI Accuracy** | 85% vs. manual review | Spot check 100 evaluations |
| **Time Savings** | 30 min → 30 sec | User survey |
| **Manual Override Rate** | <20% | `COUNT(overrides) / COUNT(evaluations)` |
| **Cost Compliance** | 100% within free tier | Never exceed 10k neurons/day |

---

## 📞 Key Contacts

- **Product Owner**: [TBD]
- **Engineering Lead**: [TBD]
- **Legal/Compliance**: [TBD]

---

## 📚 Related Documents

- [Full PRD](./prd-ai-tenant-intelligence.md) - Comprehensive product requirements
- [Database Schema](../apps/worker/migrations/) - D1 table definitions
- [API Documentation](../apps/worker/README.md) - Worker API endpoints
- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/) - Model reference

---

**Last Updated**: 2025-12-17
**Version**: 1.0
**Status**: Ready for Implementation
