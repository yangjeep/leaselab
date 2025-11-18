# Welcome to Rent-In-Ottawa! (Next.js + Airtable)

A ready-to-deploy demo environment for a rental listings website.

## Quick Start

```bash
npm install
cp env.example .env.local
# Edit AIRTABLE_TOKEN, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_NAME (optional)
npm run dev
```

Deploy to Vercel and set the same env vars in Project Settings.

## Datasource (Airtable)

Table name: `Properties` (default, configurable via `AIRTABLE_TABLE_NAME`)

### Required Fields

- `ID` — Unique identifier (string)
- `Title` — Property title
- `Monthly Rent` — Monthly rental price (number)
- `Bedrooms` — Number of bedrooms (number)
- `Bathrooms` — Number of bathrooms (number)
- `Status` — Availability status (e.g., "Available")
- `City` — City name
- `Address` — Full address
- `Description` — Property description

### Optional Fields

- `Slug` — URL-friendly identifier (auto-generated from Title if not provided)
- `Pets` — Pet policy (e.g., "Allowed", "Not Allowed", "Conditional")
- `Parking` — Parking information (accepts "Yes/No", "True/False", "1/0", or free text like "1 spot", "Street")
- `Image Folder URL` — Google Drive folder URL or folder ID for property images

### Setting Up Images

This project uses **Cloudflare D1 database** to store image URLs directly, eliminating the need for image sync or API configuration.

#### Image Storage and Display

Images are stored as public URLs in the Cloudflare D1 database (in the `image_folder_url_r2_urls` column).

**How it works:**
- Image URLs are stored as a JSON array in the D1 database
- Example: `["https://img.rent-in-ottawa.ca/740124/3/image1.jpg", "https://img.rent-in-ottawa.ca/740124/3/image2.jpg"]`
- Next.js fetches these URLs directly from D1 and renders them
- The first image in the array is used as the listing thumbnail
- All images are displayed in the property gallery
- Images are served from Cloudflare R2 via the public domain `img.rent-in-ottawa.ca`

**No additional configuration needed** - as long as the D1 database contains valid public image URLs, they will be displayed automatically.

**Image Fallback:**
- If no images are found in the database, placeholder images will be displayed

## Security / Demo

- Basic Auth is enabled via `middleware.ts` using `DEMO_USER`/`DEMO_PASS`.
- `DEMO_NOINDEX=true` adds `X-Robots-Tag: noindex, nofollow`.
- For production, remove `robots.txt` block and set `DEMO_NOINDEX=false`.

## Revalidate

- ISR is set via `REVALIDATE_SECONDS` (default 60 for preview).
- Manual revalidate endpoint: `/api/revalidate?secret=...` with env `REVALIDATE_SECRET`.

## Performance Testing

Lighthouse CI is integrated to monitor performance, accessibility, best practices, and SEO.

### Running Lighthouse Locally

```bash
# Install dependencies first
npm install

# Set baseline from current performance (run once)
npm run build
npm run start  # In another terminal
npm run lighthouse:baseline  # Captures current performance as baseline

# Run Lighthouse CI tests
npm run lighthouse

# Or run a quick local test
npm run lighthouse:local
```

**Setting Baseline**: Run `npm run lighthouse:baseline` once to capture your current performance metrics and set them as the baseline thresholds. This ensures tests don't fail on your first run and allows you to track performance regressions.

### GitHub Actions

Lighthouse tests run automatically on:
- Every push to `main`/`master` branch
- Every pull request to `main`/`master` branch
- Manual trigger via GitHub Actions UI

Results are uploaded as artifacts and the workflow will fail if performance thresholds are not met:
- Performance: ≥ 80
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

## Tech

- Next.js App Router
- Tailwind CSS
- Lighthouse CI for performance monitoring
- No backend server needed

### Environment Variables

**Required:**
- `AIRTABLE_TOKEN` — Airtable API token
- `AIRTABLE_BASE_ID` — Airtable base ID

**Optional:**
- `AIRTABLE_TABLE_NAME` — Table name (defaults to "Properties")

**For D1 Database (required):**
- `D1_REST_API_URL` — D1 REST API endpoint URL
- `D1_REST_API_TOKEN` — Bearer token for authentication
- `D1_TABLE_NAME` — Table name (defaults to "table_740124")

**Note:** Image URLs are stored directly in the D1 database. No additional R2 or Google Drive configuration is needed for image serving.

