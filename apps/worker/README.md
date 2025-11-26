# LeaseLab Worker - Backend API

Centralized API service for all LeaseLab database and storage operations.

## Architecture

```
┌─────────────┐                         ┌─────────────┐
│  apps/site  │    /api/public/*        │  apps/ops   │
│             │──────(Bearer)──────┐    │             │
│             │                    │    │             │
└─────────────┘                    │    └─────────────┘
                                   │           │
                                   ▼           │
                            ┌──────────────┐   │
                            │   leaselab-  │   │
                            │    worker    │◄──┤ /api/ops/*
                            └──────────────┘   │
                                   │           │
                                   ▼           │
                            ┌──────────────┐   │
                            │ D1 + R2      │   │
                            └──────────────┘   │
```

## Project Structure

```
apps/worker/
├── worker.ts              # Main entry point (Hono app)
├── routes/
│   ├── public.ts         # Public API routes (/api/public/*)
│   └── ops.ts            # Ops API routes (/api/ops/*)
├── middleware/
│   ├── auth.ts           # Bearer token auth for public APIs
│   └── internal.ts       # Internal auth for ops APIs
├── wrangler.toml         # Cloudflare Worker configuration
└── package.json          # Dependencies (hono, etc.)
```

## Installation

```bash
cd apps/worker
npm install
```

## Dependencies

- **hono**: Fast web framework for Cloudflare Workers
- **TypeScript**: Type safety
- **@cloudflare/workers-types**: Type definitions

## Environment Variables

Set via `wrangler secret put`:

```bash
# For AI evaluation
npx wrangler secret put OPENAI_API_KEY

# Optional: For internal ops→worker auth (if using keyMiddleware)
npx wrangler secret put WORKER_INTERNAL_KEY

# R2 public URL for serving images (required for image display)
# Example: https://files.yourdomain.com or https://pub-xxxxx.r2.dev
npx wrangler secret put R2_PUBLIC_URL
```

**Setting up R2 Public Access:**
1. Enable public access on your R2 bucket via Cloudflare dashboard
2. Set custom domain or use the default `r2.dev` URL
3. Configure `R2_PUBLIC_URL` to point to your public R2 endpoint

## Bindings

Configured in [wrangler.toml](./wrangler.toml):

- **D1 Database**: `DB` → `leaselab-db`
- **R2 Bucket**: `FILE_BUCKET` → `leaselab-files`

## API Endpoints

### Public APIs (`/api/public/*`)

**Authentication**: Bearer token (apps/site)

- `GET /api/public/properties` - List properties
  - Query params: `city`, `status`
- `GET /api/public/properties/:id` - Get property details
- `GET /api/public/site-config` - Get site configuration
- `POST /api/public/leads` - Submit tenant application

### Ops APIs (`/api/ops/*`)

**Authentication**: Internal (trust/key/context)

**Properties**:
- `GET /api/ops/properties` - List properties
- `GET /api/ops/properties/:id` - Get property
- `POST /api/ops/properties` - Create/update property

**Units**:
- `GET /api/ops/units?propertyId=xxx` - List units
- `GET /api/ops/units/:id` - Get unit
- `POST /api/ops/units` - Create/update unit

**Leads**:
- `GET /api/ops/leads` - List leads
- `GET /api/ops/leads/:id` - Get lead

**Work Orders**:
- `GET /api/ops/work-orders` - List work orders
- `POST /api/ops/work-orders` - Create/update work order

## Development

### Start local dev server:

```bash
npx wrangler dev --port 8787 --local
```

The worker will be available at `http://localhost:8787`

### Test endpoints:

```bash
# Health check
curl http://localhost:8787/

# Test public API (needs Bearer token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8787/api/public/properties

# Test ops API (with site context)
curl -H "X-Site-Id: default" \
  http://localhost:8787/api/ops/properties
```

## Deployment

### Deploy to production:

```bash
npx wrangler deploy
```

### Deploy to preview:

```bash
npx wrangler deploy --env preview
```

### View logs:

```bash
npx wrangler tail
```

## Authentication Middleware

### Public API Authentication

See [middleware/auth.ts](./middleware/auth.ts)

- Validates Bearer token from `Authorization` header
- Looks up token in `site_api_tokens` table (D1)
- Extracts `siteId` and stores in context
- Returns 401 if invalid

### Ops API Authentication

See [middleware/internal.ts](./middleware/internal.ts)

**Three options available**:

1. **Trust** (current): Trust all requests from ops
2. **Key**: Validate `X-Internal-Key` header
3. **Context**: Validate `X-User-Id` and `X-Site-Id` headers

To switch options, edit the export in `middleware/internal.ts`.

## Code Reuse

The worker **imports and reuses** functions from `apps/ops/app/lib/db.server.ts`:

```typescript
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  // ... etc
} from '../../ops/app/lib/db.server';
```

**Benefits**:
- No code duplication
- Single source of truth
- Easier maintenance

## Error Handling

All routes include try/catch blocks and return standardized error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `404` - Not found
- `500` - Internal server error

## CORS

Configured globally in [worker.ts](./worker.ts):

```typescript
app.use('*', cors({
  origin: '*', // TODO: Restrict in production
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', ...],
}));
```

## Testing

### Unit tests:

```bash
npm test
```

### Integration tests:

```bash
# Start worker in local mode
npx wrangler dev --local

# Run tests against local worker
npm run test:integration
```

## Monitoring

### View real-time logs:

```bash
npx wrangler tail
```

### View analytics:

Visit Cloudflare Dashboard → Workers & Pages → leaselab-worker

## Troubleshooting

### Error: "no such table: properties"

The local D1 database doesn't have tables. Either:
1. Run migrations: `cd apps/ops && npx wrangler d1 migrations apply DB --local`
2. Test against production D1: `npx wrangler dev --remote`

### Error: "Invalid API token"

The token is not in the `site_api_tokens` table. Generate one:

```bash
cd apps/ops
node scripts/generate-token.js default "Test Token"
```

### Worker not starting

Check wrangler.toml configuration:
- D1 database ID is correct
- R2 bucket name is correct
- No syntax errors in wrangler.toml

## Next Steps

See [docs/WORKER_MIGRATION.md](../../docs/WORKER_MIGRATION.md) for:
- Phase 2: Implement all ops API routes
- Phase 3: Add R2 file upload/download
- Phase 4: Implement AI evaluation endpoint
- Phase 5: Rate limiting and monitoring

## Related Documentation

- [WORKER_MIGRATION.md](../../docs/WORKER_MIGRATION.md) - Migration guide
- [BACKEND_API.md](../../docs/BACKEND_API.md) - API documentation
- [ARCHITECTURE_SUMMARY.md](../../docs/ARCHITECTURE_SUMMARY.md) - Architecture overview
