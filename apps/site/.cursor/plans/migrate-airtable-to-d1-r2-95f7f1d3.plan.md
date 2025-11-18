<!-- 95f7f1d3-5646-4317-9671-673ca3cf3a54 f78ddf0a-bf33-48d8-96ad-05b0b9f53da8 -->
# Migrate from Airtable to D1 and R2

## Overview

Replace Airtable data fetching with Cloudflare D1 database queries using the HTTP API. Images will be retrieved from the `image_folder_url_r2_urls` column in D1 (JSON array string) instead of fetching from R2 by slug.

## D1 Schema

The D1 table structure:

```sql
CREATE TABLE table_740124 (
  id INTEGER PRIMARY KEY,
  title TEXT,
  slug INTEGER,
  city TEXT,
  address TEXT,
  status TEXT,
  monthly_rent REAL,
  bedrooms REAL,
  bathrooms REAL,
  parking TEXT,
  description TEXT,
  image_folder_url TEXT,
  pets TEXT,
  interest TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  image_folder_url_r2_urls TEXT
)
```

**Column Mapping:**

- `id` → Listing.id (convert INTEGER to string)
- `title` → Listing.title
- `slug` → Listing.slug (convert INTEGER to string)
- `city` → Listing.city
- `address` → Listing.address
- `status` → Listing.status
- `monthly_rent` → Listing.price
- `bedrooms` → Listing.bedrooms
- `bathrooms` → Listing.bathrooms
- `parking` → Listing.parking
- `description` → Listing.description
- `image_folder_url` → Listing.imageFolderUrl
- `pets` → Listing.pets
- `image_folder_url_r2_urls` → Listing.images (parse JSON array string)

**Image Format:**

`image_folder_url_r2_urls` contains a JSON array string like:

```json
["https://your-r2-domain.com/740124/3/image1.jpg","https://your-r2-domain.com/740124/3/image2.jpg"]
```

## Implementation Steps

### 1. Add Environment Variables

- Add to `env.example` and document:
- `D1_DATABASE_ID` (required - UUID from Cloudflare Dashboard)
- `D1_TABLE_NAME` (default: `table_740124`, configurable)
- `CLOUDFLARE_ACCOUNT_ID` (required for D1 HTTP API)
- `CLOUDFLARE_API_TOKEN` (required for D1 HTTP API)

### 2. Create D1 Client Utility

- Create `lib/d1Client.ts`:
- Implement D1 HTTP API client using Cloudflare REST API
- Support SQL queries via POST to `/accounts/{account_id}/d1/database/{database_id}/query`
- Endpoint: `https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query`
- Handle authentication with API token in `Authorization: Bearer {token}` header
- Add error handling and logging
- Return typed query results

### 3. Update fetchListings Function

- Modify `lib/fetchListings.ts`:
- Replace Airtable API calls with D1 queries
- Query D1 table using `SELECT * FROM {table_name} ORDER BY title`
- Map D1 columns to Listing type using exact column names from schema:
  - Convert `id` (INTEGER) to string for Listing.id
  - Convert `slug` (INTEGER) to string for Listing.slug
  - Map `monthly_rent` to `price`
  - Parse `image_folder_url_r2_urls` (TEXT containing JSON array string) to populate `images` array
  - Handle null/empty `image_folder_url_r2_urls` gracefully
- Set `imageUrl` to first image from parsed array, or placeholder if empty
- Keep existing helper functions (slugify, toNum, parseBoolish)
- Remove Airtable-specific code (fetchImagesFromR2 by slug, since images come from D1 column)
- Keep placeholder fallback logic for missing images
- Add Next.js caching: `next: { revalidate: 60 }` similar to Airtable fetch
- Handle D1 API errors gracefully (return empty array in CI/production like Airtable)

### 4. Update Types

- Update `lib/types.ts`:
- Remove `airtableRecordId` field (no longer needed)
- Ensure `imageUrl` and `images` fields remain
- Keep all other Listing fields unchanged

### 5. Update API Route

- Modify `app/api/properties/route.ts`:
- Replace `airtableRecordId` with D1 `id` field (convert to string)
- Update `recordId` in response to use D1 row ID
- Ensure it works with new D1-based listings

### 6. Testing Considerations

- Ensure backward compatibility during migration
- Handle cases where `image_folder_url_r2_urls` is null/empty/invalid JSON
- Verify image URLs from D1 are accessible
- Test with environment variables
- Test JSON array parsing for `image_folder_url_r2_urls`
- Test INTEGER to string conversion for `id` and `slug` fields

## Files to Modify

- `lib/fetchListings.ts` - Replace Airtable logic with D1 queries
- `lib/types.ts` - Update if needed
- `app/api/properties/route.ts` - Update record ID reference
- `env.example` - Add D1 and Cloudflare API credentials
- `lib/d1Client.ts` - New file for D1 HTTP API client

## Notes

- The `image_folder_url_r2_urls` column contains a JSON array string (not comma-separated)
- Parse JSON array string to extract image URLs
- Keep placeholder fallback logic if D1 column is null/empty/invalid
- Remove R2 image fetching by slug (no longer needed since images come from D1)
- Maintain same Listing type structure for minimal component changes
- Tenant-leads migration will be handled separately (out of scope for this plan)
- D1 database ID must be obtained from Cloudflare Dashboard and set as environment variable

### To-dos

- [ ] Add D1_DATABASE_ID, D1_TABLE_NAME, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN to env.example
- [ ] Create lib/d1Client.ts with D1 HTTP API client implementation (POST to /accounts/{account_id}/d1/database/{database_id}/query)
- [ ] Replace Airtable API calls in lib/fetchListings.ts with D1 queries
- [ ] Map D1 columns to Listing type (id→string, slug→string, monthly_rent→price, etc.)
- [ ] Parse image_folder_url_r2_urls JSON array string to populate images array
- [ ] Remove fetchImagesFromR2 by slug logic (images come from D1 column)
- [ ] Update app/api/properties/route.ts to use D1 id field instead of airtableRecordId
- [ ] Remove airtableRecordId from lib/types.ts