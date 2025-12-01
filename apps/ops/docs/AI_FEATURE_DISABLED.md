# AI Feature - Temporarily Disabled

**Date**: November 29, 2025  
**Reason**: OpenAI SDK removed to reduce bundle size (~500KB). Feature will be redesigned.

## What Was Removed

### Package Dependencies
- `openai` package (v6.9.1) removed from `package.json`

### Disabled Files (Preserved for Redesign)

1. **`app/lib/ai.server.ts.disabled`**
   - Contains AI evaluation logic
   - OpenAI GPT-4o integration for tenant screening
   - Document analysis functionality
   - R2 presigned URL generation

2. **`app/routes/api.leads.$id.ai.tsx.disabled`**
   - API endpoint for running AI evaluations
   - Orchestrates lead data, files, and property context
   - Calls worker API to save results

## What Still Works

### Database Schema
- `lead_ai_evaluations` table still exists in D1
- Columns: `id`, `lead_id`, `site_id`, `score`, `label`, `summary`, etc.

### Worker API Functions
The following functions in `app/lib/worker-client.ts` are still present:
- `runAIEvaluationToWorker()` - Saves AI evaluation results
- `fetchAIEvaluationFromWorker()` - Retrieves AI evaluation results

### Lead Status Types
The following lead statuses still exist in types:
- `ai_evaluating` - Lead is being evaluated by AI
- `ai_evaluated` - AI evaluation complete

### UI Components
- Status badges in `admin.leads._index.tsx` still show AI statuses
- No UI buttons or forms currently trigger AI evaluation

## Future Redesign Considerations

### Potential Improvements
1. **Edge AI**: Use Cloudflare Workers AI instead of OpenAI
   - Much smaller bundle size
   - Lower latency (runs on edge)
   - Better cost structure for this use case

2. **Async Processing**: Queue-based evaluation
   - Don't block UI while evaluation runs
   - Use Durable Objects or Queues for processing

3. **Hybrid Approach**: Rules + AI
   - Basic rules engine for quick screening
   - AI only for complex cases

4. **Alternative Providers**:
   - Anthropic Claude (via Workers AI)
   - Cloudflare Workers AI models
   - Custom fine-tuned models

### Files to Review for Redesign
1. `.disabled` files in this directory (contain original logic)
2. `shared/types/index.ts` - AI evaluation types
3. `apps/worker/lib/db/lead-ai-evaluations.ts` - Database functions
4. `apps/worker/routes/lead-ai-evaluations.ts` - Worker API endpoints

## Bundle Size Impact

**Before removal**: 3.3MB worker bundle  
**After removal**: Expected ~2.7-2.8MB (saving ~500KB from OpenAI SDK)

## How to Re-enable (Temporary)

If you need the old OpenAI integration temporarily:

```bash
# 1. Install OpenAI package
npm install openai@6.9.1 --workspace=@leaselab/ops

# 2. Rename disabled files
mv app/lib/ai.server.ts.disabled app/lib/ai.server.ts
mv app/routes/api.leads.$id.ai.tsx.disabled app/routes/api.leads.$id.ai.tsx

# 3. Add OPENAI_API_KEY to wrangler.toml secrets
wrangler pages secret put OPENAI_API_KEY --project-name=leaselab-ops
```

## Related Documentation
- Worker API: `apps/worker/routes/lead-ai-evaluations.ts`
- Database schema: `apps/worker/migrations/`
- Types: `shared/types/index.ts`

