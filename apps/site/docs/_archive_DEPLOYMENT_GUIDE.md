# Deployment Guide

## Overview

The rental manager application fetches property listings and images directly from a Cloudflare D1 database. Images are stored as public URLs in the database, eliminating the need for complex image sync workflows.

## Architecture

**Data Flow:**
1. Property data stored in Cloudflare D1 database
2. Image URLs stored as JSON arrays in `image_folder_url_r2_urls` column
3. Next.js fetches data via D1 REST API
4. Images rendered directly from public URLs
5. Images served from Cloudflare R2 via `img.rent-in-ottawa.ca` domain

**No image sync or API credentials needed!** ✨

---

## Deployment Checklist

### ✅ Step 1: Configure D1 Database Access

**Required environment variables:**

```bash
D1_REST_API_URL=https://your-d1-rest-api.workers.dev
D1_REST_API_TOKEN=your_bearer_token
D1_TABLE_NAME=table_740124
```

**How to get these:**
1. Deploy the `d1-secret-rest` Cloudflare Worker (provides REST API for D1)
2. Note the Worker URL (`D1_REST_API_URL`)
3. Generate a secure token for authentication (`D1_REST_API_TOKEN`)
4. Confirm your table name (`D1_TABLE_NAME`)

**Database Schema:**

Your D1 table should have these columns:
- `id` - INTEGER (primary key)
- `title` - TEXT
- `slug` - INTEGER
- `city` - TEXT
- `address` - TEXT
- `status` - TEXT (JSON string with "value" property)
- `monthly_rent` - REAL
- `bedrooms` - INTEGER
- `bathrooms` - REAL
- `parking` - TEXT
- `pets` - TEXT (JSON string with "value" property)
- `description` - TEXT
- `image_folder_url` - TEXT (legacy, optional)
- `image_folder_url_r2_urls` - TEXT (JSON array of image URLs) **← Important!**
- `created_at` - TEXT
- `updated_at` - TEXT

---

### ✅ Step 2: Configure Airtable (Optional)

If you're using the contact form:

```bash
AIRTABLE_TOKEN=your_token
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_NAME=Properties
```

The contact form submits to a "tenant-leads" table in the same Airtable base.

---

### ✅ Step 3: Configure Next.js Image Optimization

**Already configured in `next.config.mjs`:**

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'img.rent-in-ottawa.ca',
      pathname: '/**',
    },
  ],
}
```

This allows Next.js to optimize images from your R2 public domain.

**No additional configuration needed!**

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect your repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository

2. **Configure environment variables:**
   - Add all required variables from `.env.example`
   - Include `D1_REST_API_URL`, `D1_REST_API_TOKEN`, `D1_TABLE_NAME`

3. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically detect Next.js and build

4. **Set up custom domain (optional):**
   - Go to Project Settings → Domains
   - Add your custom domain

### Option 2: Self-Hosted

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

**Environment variables:**
- Copy `.env.example` to `.env.local`
- Fill in all required values
- Never commit `.env.local` to Git

---

## Testing Your Deployment

### Test 1: Data Fetching

```bash
# Check D1 API is accessible
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-d1-rest-api.workers.dev/tables/table_740124
```

Expected: JSON array of property records

### Test 2: Image URLs

Verify that your D1 database has valid image URLs in the `image_folder_url_r2_urls` column:

```json
["https://img.rent-in-ottawa.ca/740124/3/image1.jpg", "https://img.rent-in-ottawa.ca/740124/3/image2.jpg"]
```

Visit these URLs directly in your browser to ensure they're accessible.

### Test 3: Next.js Application

1. Visit your deployment URL
2. Check that properties are displayed
3. Verify images load correctly
4. Test the contact form (if configured)

---

## Updating Image URLs

To add or update images for a property:

1. **Upload images to Cloudflare R2** bucket with public access
2. **Get public URLs** for each image
3. **Update D1 database** - set `image_folder_url_r2_urls` column to JSON array:
   ```json
   ["https://img.rent-in-ottawa.ca/PROPERTY_ID/1/photo1.jpg", "https://img.rent-in-ottawa.ca/PROPERTY_ID/1/photo2.jpg"]
   ```
4. **Trigger revalidation** (optional):
   ```bash
   curl https://your-app.vercel.app/api/revalidate?secret=YOUR_REVALIDATE_SECRET
   ```

---

## Troubleshooting

### Images not displaying

1. **Check image URLs in D1:**
   - Query your D1 database
   - Verify `image_folder_url_r2_urls` contains valid JSON array
   - Test URLs in browser

2. **Check Next.js logs:**
   - Look for image loading errors
   - Verify `remotePatterns` configuration

3. **Check CORS:**
   - Ensure R2 bucket allows public access
   - Verify image domain matches `remotePatterns`

### Properties not loading

1. **Check D1 API access:**
   - Verify `D1_REST_API_URL` is correct
   - Verify `D1_REST_API_TOKEN` is valid
   - Test API endpoint with curl

2. **Check Next.js logs:**
   - Look for fetch errors
   - Verify environment variables are set

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

### Contact form not working

1. **Check Airtable credentials:**
   - Verify `AIRTABLE_TOKEN` is valid
   - Verify `AIRTABLE_BASE_ID` is correct
   - Verify "tenant-leads" table exists

2. **Check Airtable table schema:**
   - Required fields: Title (from Property), Name, Email, Phone Number

---

## Cost Estimates

### Cloudflare Free Tier
- **R2 Storage:** 10 GB/month free
- **R2 Bandwidth:** Unlimited free ✨
- **D1 Database:** 5 GB storage free, 5M reads/day free
- **Worker Requests:** 100,000/day free

### Vercel Free Tier
- **Bandwidth:** 100 GB/month
- **Serverless Function Executions:** 100 GB-hours/month
- **Image Optimization:** 1,000 source images, 5,000 optimizations/month

### Estimated Usage (50 properties, 5 images each)
- **R2 Storage:** ~125 MB (well under 10 GB)
- **D1 Queries:** ~10,000/month (well under 5M/day)
- **Vercel:** Within free tier limits
- **Cost:** $0/month 🎉

---

## Performance Optimization

### ISR (Incremental Static Regeneration)

The homepage uses ISR with a 60-second revalidation period (configurable via `REVALIDATE_SECONDS`):

```typescript
export const revalidate = Number(process.env.REVALIDATE_SECONDS || 60);
```

**Benefits:**
- Fast page loads (static HTML)
- Fresh data (revalidates every 60 seconds)
- Low server load

### Manual Revalidation

Force immediate revalidation using the API endpoint:

```bash
curl https://your-app.vercel.app/api/revalidate?secret=YOUR_SECRET
```

Set `REVALIDATE_SECRET` in your environment variables.

---

## Security

### Basic Auth (Optional)

Enable Basic Auth for demo/staging environments:

```bash
DEMO_USER=demo
DEMO_PASS=demo123
```

Leave `DEMO_USER` unset in production for public access.

### Search Engine Indexing

Control search engine indexing:

```bash
# Block search engines in demo/staging
DEMO_NOINDEX=true

# Allow search engines in production (leave unset or false)
# DEMO_NOINDEX=false
```

---

## Migration from Old System

If you're migrating from the old Google Drive + R2 API workflow:

📖 See `MIGRATION_TO_D1_IMAGES.md` for detailed migration guide.

**Key changes:**
- ❌ No R2 API credentials needed
- ❌ No Google Drive API setup needed
- ❌ No Cloudflare Worker for image sync needed
- ✅ Image URLs stored directly in D1
- ✅ Simpler, faster, more reliable

---

## Support

- **Main Documentation:** `README.md`
- **Migration Guide:** `MIGRATION_TO_D1_IMAGES.md`
- **API Routes:** Check `/app/api/` directory for endpoint implementations

Happy deploying! 🚀
