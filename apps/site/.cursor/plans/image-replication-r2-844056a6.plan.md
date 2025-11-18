<!-- 844056a6-f31a-46b0-b915-32d79a988868 d64d9f1f-9336-4616-8482-c91b4e18e0c5 -->
# Image Replication to R2 with Cloudflare Worker

## Architecture Overview

When a realtor updates the "Image Folder URL" field in AirTable, an automation triggers a webhook to a Cloudflare Worker. The Worker downloads images from Google Drive and uploads them to R2 bucket. The Next.js app fetches images from R2 first, falling back to Google Drive if unavailable.

## Implementation Steps

### 1. Cloudflare R2 Bucket Setup

Create and configure R2 bucket in Cloudflare Dashboard:

- Create bucket named `rental-manager-images`
- Enable public read access for property images
- Configure CORS to allow web access from your domain
- Note the bucket URL (e.g., `https://pub-xxxxx.r2.dev`)
- Generate R2 API tokens (for Next.js app to list images)

### 2. Cloudflare Worker Project

Create new Worker project in `/worker` directory:

- Initialize with `npm create cloudflare@latest worker`
- Main file: `/worker/src/index.ts`
- Worker handles POST requests from AirTable
- Payload structure: `{ recordId, slug, imageFolderUrl }`
- Validates webhook secret (AIRTABLE_WEBHOOK_SECRET)
- Extracts Google Drive folder ID from URL
- Downloads images from Drive using Google Drive API
- Uploads images to R2 as `/properties/{slug}/image-1.jpg`, `image-2.jpg`, etc.
- First image is the thumbnail
- Cleans up old images before uploading new ones
- Returns JSON: `{ success: true, imageCount: N }` or error

**R2 Binding**: Bind R2 bucket directly to Worker (no credentials needed in code)

### 3. Worker Dependencies & Configuration

In `/worker`:

- Use native `fetch` for Google Drive API calls
- R2 bucket accessed via Worker binding (automatic authentication)
- Environment variables in `wrangler.toml`:
  - `GOOGLE_DRIVE_API_KEY` (or service account JSON)
  - `AIRTABLE_WEBHOOK_SECRET`
  - R2 bucket binding configuration
- Deploy command: `npx wrangler deploy`

### 4. Google Drive API Setup

Configure Google Cloud Console:

- Enable Google Drive API
- Create API key OR service account (with Drive read access)
- Store credentials in Worker secrets
- Worker uses Drive API v3 to list and download files from folder

### 5. Update Next.js Image Fetching

Modify `/lib/fetchListings.ts`:

- Create helper function `fetchImagesFromR2(slug)` 
- Uses R2 public URL to construct image paths: `${R2_PUBLIC_URL}/properties/{slug}/image-{N}.jpg`
- Check if `image-1.jpg` exists (HEAD request or try catch)
- Update image resolution logic (lines 112-144):

  1. Try R2 first: `fetchImagesFromR2(slug)`
  2. If R2 images found, use those
  3. Otherwise, fallback to existing DRIVE_LIST_ENDPOINT logic
  4. Finally, fallback to placeholders

- Set `imageUrl` to first image
- Set `images` array to all available images

### 6. Environment Variables

Update `/env.example` in Next.js app:

```bash
# Cloudflare R2 Public URL
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Optional: R2 API credentials for listing (if needed)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# Keep existing DRIVE_LIST_ENDPOINT for fallback
DRIVE_LIST_ENDPOINT=
```

Update `/worker/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "rental-manager-images"

[vars]
AIRTABLE_WEBHOOK_SECRET = "your-secret"
GOOGLE_DRIVE_API_KEY = "your-api-key"
```

### 7. AirTable Automation Configuration

Document setup for realtor in README:

- Go to AirTable Automations
- Trigger: "When record updated" → Watch field "Image Folder URL"
- Condition: "Image Folder URL" is not empty
- Action: "Send webhook"
- URL: `https://your-worker.workers.dev/sync-images` (Worker URL)
- Method: POST
- Body (JSON):
```json
{
  "recordId": "{{Record ID}}",
  "slug": "{{Slug}}",
  "imageFolderUrl": "{{Image Folder URL}}"
}
```

- Add webhook secret in headers: `X-Webhook-Secret: <your-secret>`

### 8. Worker Deployment

- Run `npx wrangler deploy` from `/worker` directory
- Note the Worker URL (e.g., `https://image-sync.your-subdomain.workers.dev`)
- Configure custom domain if desired
- Test with curl or Postman before connecting AirTable

### 9. Testing Checklist

- [ ] Test Worker locally with `npx wrangler dev`
- [ ] Send test POST with mock AirTable payload
- [ ] Verify images appear in R2 bucket
- [ ] Verify images accessible via R2 public URL
- [ ] Test Next.js app fetches from R2
- [ ] Test Drive fallback when R2 images missing
- [ ] Confirm first image used as thumbnail

## Key Files to Create/Modify

**New Worker Project**:

- `/worker/src/index.ts` - Main Worker handler
- `/worker/wrangler.toml` - Worker configuration
- `/worker/package.json` - Worker dependencies

**Next.js App**:

- **Modify**: `/lib/fetchListings.ts` - Add R2-first image fetching
- **Update**: `/env.example` - Add R2_PUBLIC_URL
- **Update**: `/README.md` - Document AirTable automation setup

## Dependencies

**Worker**: No external dependencies (uses native fetch and R2 binding)

**Next.js**: No new dependencies needed (just configuration)

### To-dos

- [ ] Set up Cloudflare R2 bucket with public access and generate API credentials
- [ ] Install required npm packages: @aws-sdk/client-s3, googleapis
- [ ] Create /lib/r2-client.ts with upload, list, and delete functions
- [ ] Create /lib/drive-client.ts to download images from Google Drive folders
- [ ] Create /app/api/sync-images/route.ts webhook handler
- [ ] Modify /lib/fetchListings.ts to check R2 first, fallback to Drive
- [ ] Update env.example with R2, Drive, and webhook credentials
- [ ] Document AirTable automation setup steps in README