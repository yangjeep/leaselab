<!-- e613574e-cf61-4342-a0bf-ec1fa8583e68 40e09039-71a1-4aa8-ba44-b595b2e28fa8 -->
# Google Drive to R2 Sync Setup Plan

## Overview

Set up the complete image sync workflow: when a property's "Image Folder URL" is updated in Airtable, it triggers a Cloudflare Worker that downloads images from Google Drive and uploads them to R2.

## Current State

- ✅ Worker code exists at `worker/src/index.ts` with full sync logic
- ✅ Worker supports API key authentication (GOOGLE_DRIVE_API_KEY)
- ✅ Next.js app already fetches images from R2
- ⚠️ Worker needs deployment and configuration
- ⚠️ Airtable webhook automation needs to be set up

## Implementation Steps

### 1. Worker Configuration & Deployment

**Files:** `worker/src/index.ts`, `worker/wrangler.toml`, `worker/package.json`

- Verify worker code handles API key authentication correctly (already implemented)
- Ensure R2 bucket binding is configured in `wrangler.toml`
- Deploy worker to Cloudflare
- Set worker secrets:
- `GOOGLE_DRIVE_API_KEY` (from Google Cloud Console)
- `AIRTABLE_WEBHOOK_SECRET` (for webhook security)

### 2. Airtable Webhook Automation Setup

**Documentation:** Update `README.md` or create `AIRTABLE_WEBHOOK_SETUP.md`

- Create step-by-step guide for Airtable automation:
- Trigger: "When record matches conditions" (Image Folder URL is not empty)
- Action: "Send webhook" to worker URL
- Configure webhook headers and body JSON template
- Include testing instructions

### 3. Testing & Validation

- Document manual testing steps using curl
- Verify worker logs show successful sync
- Test with a sample property in Airtable
- Verify images appear in R2 bucket
- Verify Next.js app displays synced images

## Key Files to Modify

- `worker/src/index.ts` - Verify API key handling (may need minor cleanup)
- `worker/README.md` - Update with deployment steps
- `README.md` - Ensure webhook setup instructions are clear
- Create `AIRTABLE_WEBHOOK_SETUP.md` - Detailed webhook configuration guide (optional)

## Environment Variables Needed

**Worker (via wrangler secrets):**

- `GOOGLE_DRIVE_API_KEY`
- `AIRTABLE_WEBHOOK_SECRET`

**Next.js (already configured):**

- `R2_PUBLIC_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## Success Criteria

1. Worker deployed and accessible at worker URL
2. Airtable automation configured and active
3. Updating "Image Folder URL" in Airtable triggers sync
4. Images successfully uploaded to R2 at `{slug}/filename.jpg`
5. Next.js app displays synced images from R2