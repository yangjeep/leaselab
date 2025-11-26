# R2 Bucket Migration: Public and Private Storage

## Overview

The LeaseLab application now uses **two separate R2 buckets** for file storage:

1. **`leaselab-pub`** - Public bucket for property images and publicly accessible files
2. **`leaselab-pri`** - Private bucket for applications, leases, N11s, and other confidential documents

## Changes Made

### 1. Wrangler Configuration Updates

Updated all `wrangler.toml` files to include both buckets:

- **apps/worker/wrangler.toml**
- **apps/ops/wrangler.toml** (both development and production environments)

**Bindings:**
- `PUBLIC_BUCKET` → `leaselab-pub`
- `PRIVATE_BUCKET` → `leaselab-pri`

### 2. Environment Type Definitions

Updated type definitions to reflect the new bucket bindings:

- **apps/ops/env.d.ts** - Updated `AppLoadContext` interface
- **apps/worker/worker.ts** - Updated `Env` interface
- **apps/worker/routes/ops.ts** - Updated `Bindings` type
- **apps/worker/routes/public.ts** - Updated `Bindings` type

### 3. Storage Abstraction Layer

Updated **shared/storage-cloudflare/index.ts**:
- Added `initCloudflareStorageV2()` function for multi-bucket support
- Kept legacy `initCloudflareStorage()` function as deprecated

Updated **apps/ops/app/lib/storage.server.ts**:
- Modified `CloudflareEnv` interface to include both buckets
- Updated `Storage` interface with `publicBucket` and `privateBucket`
- Added `getPublicBucket()` helper function
- Added `getPrivateBucket()` helper function

### 4. File Upload Routes

#### Private Bucket (Application Files)
Updated to use `PRIVATE_BUCKET`:
- [api.leads.$id.files.tsx](../apps/ops/app/routes/api.leads.$id.files.tsx:19) - Lead application file uploads
- [api.leads.$id.ai.tsx](../apps/ops/app/routes/api.leads.$id.ai.tsx:18) - AI evaluation file access

#### Public Bucket (Property Images)
Updated to use `PUBLIC_BUCKET`:
- [api.images.upload.tsx](../apps/ops/app/routes/api.images.upload.tsx:16) - Image upload endpoint
- [api.images.presign.tsx](../apps/ops/app/routes/api.images.presign.tsx:32) - Presigned URL generation
- [api.images.$id.file.tsx](../apps/ops/app/routes/api.images.$id.file.tsx:9) - Image file serving
- [api.images.$id.tsx](../apps/ops/app/routes/api.images.$id.tsx:36) - Image CRUD operations
- [api.images._index.tsx](../apps/ops/app/routes/api.images._index.tsx:8) - Image listing

## Required: Create R2 Buckets in Cloudflare

You must create the two R2 buckets in your Cloudflare account before deploying.

### Step 1: Create the Public Bucket

```bash
# Create public bucket for property images
npx wrangler r2 bucket create leaselab-pub

# Enable public access
npx wrangler r2 bucket domain add leaselab-pub --domain <your-public-domain>
```

**Important:** Configure the public bucket with:
- Public read access
- Custom domain for direct image URLs
- CORS settings if needed

### Step 2: Create the Private Bucket

```bash
# Create private bucket for application files
npx wrangler r2 bucket create leaselab-pri
```

**Important:** The private bucket should:
- **NOT** have public access enabled
- Require signed URLs for all access
- Store sensitive documents (applications, leases, N11s)

### Step 3: Migrate Existing Files (if applicable)

If you have existing files in `leaselab-files`, you'll need to migrate them:

```bash
# List files in old bucket
npx wrangler r2 object list leaselab-files

# Migrate property images to public bucket
# (Use R2 API or custom script to copy files matching pattern: property/*, unit/*)

# Migrate application files to private bucket
# (Use R2 API or custom script to copy files matching pattern: leads/*)
```

### Step 4: Update R2_PUBLIC_URL

Update the `R2_PUBLIC_URL` environment variable in your wrangler.toml files to point to the public bucket's domain:

```toml
[vars]
R2_PUBLIC_URL = "https://pub-your-bucket-id.r2.dev"
```

Or if using a custom domain:

```toml
[vars]
R2_PUBLIC_URL = "https://images.yourdomain.com"
```

## File Organization

### Public Bucket (`leaselab-pub`)
```
property/{propertyId}/{timestamp}-{filename}
unit/{unitId}/{timestamp}-{filename}
```

**Used for:**
- Property listing images
- Unit photos
- Gallery images
- Publicly viewable content

**Access:**
- Direct public URLs via `R2_PUBLIC_URL`
- No authentication required for reads
- Cloudflare Image Resizing enabled

### Private Bucket (`leaselab-pri`)
```
leads/{leadId}/{uniqueId}/{filename}
leases/{leaseId}/{filename}
documents/{type}/{id}/{filename}
```

**Used for:**
- Rental application documents (ID, pay stubs, references)
- Signed lease agreements
- N11 forms and tenant documents
- Any confidential/private files

**Access:**
- Signed URLs only (time-limited)
- Authentication required
- No public access

## Testing

### Verify Bucket Configuration

1. **Check bindings are available:**
```typescript
// In any route handler
console.log('Public bucket:', context.cloudflare.env.PUBLIC_BUCKET);
console.log('Private bucket:', context.cloudflare.env.PRIVATE_BUCKET);
```

2. **Test image upload:**
- Upload a property image
- Verify it's stored in `leaselab-pub`
- Verify public URL works

3. **Test application file upload:**
- Submit a lead with documents
- Verify files are stored in `leaselab-pri`
- Verify files are NOT publicly accessible

## Security Considerations

### Public Bucket
- ✅ Read-only public access
- ✅ Custom domain with CDN
- ✅ Image optimization via Cloudflare
- ❌ No sensitive data

### Private Bucket
- ✅ No public access
- ✅ Signed URLs with expiration
- ✅ Audit trail for access
- ✅ Encryption at rest
- ❌ Never expose direct R2 URLs

## Rollback Plan

If you need to rollback to the single bucket approach:

1. Revert wrangler.toml changes
2. Restore `FILE_BUCKET` binding
3. Update code to use `FILE_BUCKET` instead of `PUBLIC_BUCKET`/`PRIVATE_BUCKET`
4. Keep the old `initCloudflareStorage()` function

## Next Steps

1. ✅ Code changes complete
2. ⏳ Create `leaselab-pub` bucket
3. ⏳ Create `leaselab-pri` bucket
4. ⏳ Configure public domain for `leaselab-pub`
5. ⏳ Migrate existing files (if any)
6. ⏳ Update `R2_PUBLIC_URL` environment variable
7. ⏳ Deploy and test

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 Presigned URLs](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#presigned-urls)
