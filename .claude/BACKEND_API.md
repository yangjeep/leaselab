# Backend API Architecture

## Overview

LeaseLab uses a centralized backend worker (`leaselab-worker`) that handles all database, cache, and storage operations. This provides:

- **Security**: No direct database access from frontend apps
- **Scalability**: Multiple sites can use the same backend with token-based authentication
- **Configurability**: Site-specific branding and content stored in the database
- **Multi-tenancy**: Each site has its own isolated data via `site_id`
- **Separation of Concerns**: UI apps (site/ops) focus on presentation, worker handles data

## Architecture

```
┌─────────────┐                                    ┌─────────────┐
│  apps/site  │         /api/public/*              │  apps/ops   │
│  (Frontend) │──────────(Bearer Token)───────┐    │  (Admin UI) │
└─────────────┘                               │    └─────────────┘
                                              │            │
                                              ▼            │
                                       ┌──────────────┐    │
                                       │   leaselab-  │    │
                                       │    worker    │◄───┤
                                       │  (Backend)   │    │ /api/ops/*
                                       └──────────────┘    │ (Session Auth)
                                              │            │
                                              ▼            │
                                       ┌──────────────┐    │
                                       │ D1 Database  │    │
                                       │ KV Sessions  │    │
                                       │  R2 Files    │    │
                                       └──────────────┘    │
```

## Worker vs. Ops

- **leaselab-worker**: Cloudflare Worker that owns all D1/KV/R2 operations
  - Handles all CRUD operations
  - Manages file uploads/downloads (R2)
  - Runs AI evaluation pipeline
  - Provides both public and ops APIs

- **apps/ops**: Remix app for admin UI only
  - No direct database access (eventually)
  - Calls worker APIs for all data operations
  - Handles authentication and session management
  - Renders admin interface

## API Endpoints

### Public APIs (Token Required)

These endpoints are served by `leaselab-worker` and used by `apps/site`.

All public APIs require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer <your-api-token>
```

**Base URL**: `https://leaselab-worker.yangjeep.workers.dev` (or use `WORKER_URL` environment variable)

#### 1. **GET /api/public/properties**
Fetch all properties for the authenticated site.

**Query Parameters:**
- `city` (optional): Filter by city
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prop_123",
      "title": "Beautiful 2BR Apartment",
      "slug": "prop_123",
      "price": 2000,
      "city": "San Francisco",
      "address": "123 Main St, San Francisco, CA 94102",
      "status": "Available",
      "bedrooms": 2,
      "bathrooms": 1,
      "description": "...",
      "images": ["https://..."],
      "imageUrl": "https://...",
      "pets": "Conditional",
      "parking": "Available"
    }
  ]
}
```

#### 2. **GET /api/public/properties/:id**
Fetch a single property by ID.

**Response:** Same format as individual property in list above.

#### 3. **GET /api/public/site-config**
Fetch site configuration (branding, about page content).

**Response:**
```json
{
  "success": true,
  "data": {
    "siteId": "default",
    "siteName": "LeaseLab Property Management",
    "about": {
      "title": "About Us",
      "description": "We are a professional...",
      "stats": [
        { "label": "Properties Managed", "value": "100+" },
        { "label": "Happy Tenants", "value": "500+" },
        { "label": "Years Experience", "value": "10+" }
      ]
    },
    "branding": {
      "logoUrl": null,
      "primaryColor": null
    },
    "contact": {
      "email": "info@leaselab.io",
      "phone": "+1-555-0100"
    }
  }
}
```

#### 4. **POST /api/public/leads**
Submit a tenant application (already existed, now with token auth).

**Request:**
```json
{
  "propertyId": "prop_123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "employmentStatus": "employed",
  "monthlyIncome": 5000,
  "moveInDate": "2025-01-01",
  "message": "I'm interested..."
}
```

### Ops APIs (Session Auth Required)

These endpoints are served by `leaselab-worker` and used by `apps/ops` admin interface.

All ops APIs require session authentication (cookie or session header).

**Base URL**: `https://leaselab-worker.yangjeep.workers.dev` (or use `WORKER_URL` environment variable)

**Note**: All operations use GET (read) and POST (create/update) only.

**Planned Endpoints** (see [WORKER_MIGRATION.md](./WORKER_MIGRATION.md) for full list):

- `GET /api/ops/properties` - List properties
- `GET /api/ops/properties/:id` - Get property details
- `POST /api/ops/properties` - Create or update property
- `GET /api/ops/units` - List units
- `GET /api/ops/units/:id` - Get unit details
- `POST /api/ops/units` - Create or update unit
- `GET /api/ops/leads` - List leads
- `GET /api/ops/leads/:id` - Get lead details
- `POST /api/ops/leads/:id/ai` - Run AI evaluation
- `POST /api/ops/images/upload` - Upload image to R2
- `GET /api/ops/images/:id/file` - Download image from R2
- `GET /api/ops/work-orders` - List work orders
- `POST /api/ops/work-orders` - Create or update work order
- And more...

See [WORKER_MIGRATION.md](./WORKER_MIGRATION.md) for the complete migration plan.

## Token Generation

### Generate a New Token

```bash
cd apps/ops
node scripts/generate-token.js <site-id> [token-name]
```

**Example:**
```bash
node scripts/generate-token.js default "Production Site Token"
```

This will output:
1. The API token (save this securely!)
2. SQL command to insert the token into the database
3. Command to insert locally
4. Environment variable configuration

### Insert Token into Database

**Local (Development):**
```bash
cd apps/ops
npx wrangler d1 execute DB --local --command "INSERT INTO site_api_tokens ..."
```

**Production:**
```bash
cd apps/ops
npx wrangler d1 execute DB --remote --command "INSERT INTO site_api_tokens ..."
```

## Configuration

### apps/site Environment Variables

Create `apps/site/.env.local`:

```bash
# Backend API URL
OPS_API_URL=http://localhost:8788  # or your production URL

# API Token (generate using script above)
SITE_API_TOKEN=your-64-character-hex-token-here
```

### apps/ops (No changes needed)

The ops backend automatically validates tokens from the database.

## Database Schema

### site_configs Table

Stores site-specific configuration:

```sql
CREATE TABLE site_configs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  about_title TEXT,
  about_description TEXT,
  about_stats TEXT DEFAULT '[]',  -- JSON
  branding_logo_url TEXT,
  branding_primary_color TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### site_api_tokens Table

Stores hashed API tokens:

```sql
CREATE TABLE site_api_tokens (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash
  token_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT  -- NULL = no expiration
);
```

## Adding a New Site

1. **Insert site configuration:**
   ```sql
   INSERT INTO site_configs (id, site_id, site_name, about_title, about_description, about_stats)
   VALUES (
     'cfg_newsite',
     'newsite',
     'New Site Property Management',
     'About New Site',
     'We manage properties in the New Site area',
     '[{"label":"Properties","value":"50+"}]'
   );
   ```

2. **Generate API token:**
   ```bash
   node scripts/generate-token.js newsite "New Site Production Token"
   ```

3. **Insert token into database** (use SQL from step 2 output)

4. **Deploy new site instance:**
   - Set `SITE_API_TOKEN` environment variable
   - Set `OPS_API_URL` to point to backend
   - Deploy to Cloudflare Pages or your hosting platform

## Security Notes

- **Never commit** `.env.local` or actual tokens to git
- Tokens are stored as SHA-256 hashes in the database
- Use HTTPS in production for token transmission
- Tokens can be revoked by setting `is_active = 0`
- Monitor `last_used_at` for unusual activity

## Future Enhancements

- [ ] Admin UI for managing site configurations
- [ ] Admin UI for generating and managing API tokens
- [ ] Token rotation support
- [ ] Rate limiting per token
- [ ] API usage analytics dashboard
- [ ] File upload support for lead applications
