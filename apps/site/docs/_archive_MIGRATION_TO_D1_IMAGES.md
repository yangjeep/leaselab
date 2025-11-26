# Migration to D1-Stored Image URLs

## Overview

As of this migration, image URLs are stored directly in the Cloudflare D1 database (in the `image_folder_url_r2_urls` column as a JSON array).

**Previous workflow:**
- Images stored in Google Drive
- Airtable webhook triggered Cloudflare Worker to sync images to R2
- Next.js used R2 API to list images from buckets
- Required R2 API credentials and Google Drive API setup

**New workflow:**
- Image URLs stored directly in D1 as JSON arrays
- Example: `["https://img.rent-in-ottawa.ca/740124/3/image1.jpg", "https://img.rent-in-ottawa.ca/740124/3/image2.jpg"]`
- Next.js fetches URLs directly from D1 and renders them
- No R2 API credentials or Google Drive setup needed

## What Changed

### Environment Variables (REMOVED)
- ❌ `R2_PUBLIC_URL` - No longer needed
- ❌ `R2_ACCOUNT_ID` - No longer needed
- ❌ `R2_ACCESS_KEY_ID` - No longer needed
- ❌ `R2_SECRET_ACCESS_KEY` - No longer needed
- ❌ `R2_BUCKET_NAME` - No longer needed
- ❌ `DRIVE_LIST_ENDPOINT` - No longer needed

### Environment Variables (KEPT)
- ✅ `D1_REST_API_URL` - Required for D1 database access
- ✅ `D1_REST_API_TOKEN` - Required for authentication
- ✅ `D1_TABLE_NAME` - Table name (defaults to "table_740124")

### Next.js Configuration (KEPT)
- ✅ `remotePatterns` for `img.rent-in-ottawa.ca` - Required for Next.js Image optimization
- ✅ Image caching headers

### Code Changes
- ✅ `lib/fetchListings.ts` - Parses `image_folder_url_r2_urls` JSON array
- ✅ `lib/types.ts` - Updated comments to reflect new workflow
- ✅ Components already work with URL arrays

## Obsolete Documentation

The following documentation files are for the **legacy workflow** and are kept for reference only:

- `docs/R2_SETUP.md` - R2 bucket setup with API access
- `docs/R2_CONFIGURATION.md` - R2 API configuration
- `docs/R2_IMAGE_NAMING.md` - R2 image naming conventions
- `docs/GOOGLE_DRIVE_SETUP.md` - Google Drive API setup
- `docs/AIRTABLE_WEBHOOK_SETUP.md` - Webhook for syncing images from Drive to R2

## How Images Work Now

1. Image URLs are stored in D1 database column `image_folder_url_r2_urls`
2. Format: JSON array of public URLs
3. `fetchListings()` parses the JSON array
4. First image becomes the thumbnail (`imageUrl`)
5. All images are available in the `images` array
6. Components render images directly from these URLs
7. Next.js optimizes images via the configured `remotePatterns`

## Benefits

- ✅ Simpler configuration (no R2 API credentials)
- ✅ Faster data fetching (no R2 API calls)
- ✅ More reliable (no API rate limits)
- ✅ Easier to manage (direct URL storage)
- ✅ Still uses R2 for serving (via public URLs)
