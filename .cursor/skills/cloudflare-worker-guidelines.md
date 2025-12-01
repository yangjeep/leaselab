# Cloudflare Worker Development Guidelines

**Type:** Domain Skill
**Priority:** High - Follow these patterns for Hono + Cloudflare Workers backend

## Architecture Overview

LeaseLab backend uses:
- **Hono** - Fast, lightweight web framework
- **Cloudflare Workers** - Edge compute platform
- **D1** - SQLite database at the edge
- **R2** - Object storage (public + private buckets)

## Project Structure

```
apps/worker/
├─ worker.ts              # Main Hono app with CORS and error handling
├─ routes/
│  ├─ public.ts           # Public API routes (for apps/site)
│  └─ ops.ts              # Ops API routes (for apps/ops)
├─ lib/db/                # Database operations (all multi-tenant)
│  ├─ users.ts            # User CRUD + authentication
│  ├─ properties.ts       # Property management
│  ├─ units.ts            # Unit management
│  ├─ leads.ts            # Lead management + AI evaluations
│  ├─ tenants.ts          # Tenant management
│  ├─ leases.ts           # Lease management
│  ├─ work-orders.ts      # Work order management
│  ├─ images.ts           # Image/file management
│  ├─ site-tokens.ts      # API token management
│  └─ helpers.ts          # DB normalization utilities
├─ middleware/
│  ├─ auth.ts             # Bearer token authentication
│  └─ internal.ts         # Internal API authentication
└─ migrations/            # D1 database migrations
```

## Hono App Structure

### 1. Main Worker File

```typescript
// apps/worker/worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { CloudflareEnv } from '../../shared/config';
import publicRoutes from './routes/public';
import opsRoutes from './routes/ops';

const app = new Hono<{ Bindings: CloudflareEnv }>();

// CORS configuration
app.use('/*', cors({
  origin: ['https://ops.leaselab.io', 'https://www.leaselab.io'],
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount routes
app.route('/api/public', publicRoutes);
app.route('/api/ops', opsRoutes);

// Global error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
```

### 2. Route Files

```typescript
// apps/worker/routes/ops.ts
import { Hono } from 'hono';
import type { CloudflareEnv } from '../../../shared/config';
import { authMiddleware } from '../middleware/auth';
import { getProperties, createProperty } from '../lib/db/properties';

const app = new Hono<{ Bindings: CloudflareEnv }>();

// Apply auth middleware to all routes
app.use('/*', authMiddleware);

// GET /api/ops/properties
app.get('/properties', async (c) => {
  const siteId = c.get('siteId');  // From auth middleware
  const properties = await getProperties(c.env.DB, siteId);
  return c.json({ properties });
});

// POST /api/ops/properties
app.post('/properties', async (c) => {
  const siteId = c.get('siteId');
  const data = await c.req.json();

  const property = await createProperty(c.env.DB, siteId, data);
  return c.json({ property }, 201);
});

export default app;
```

## Database Operations Pattern

### 1. Function Signature (MANDATORY)

```typescript
// All DB functions follow this pattern:
export async function getDatabaseEntity(
  dbInput: DatabaseInput,    // D1 database instance
  siteId: string,            // REQUIRED for multi-tenancy
  options?: FilterOptions    // Optional filters
): Promise<Entity[]> {
  const db = normalizeDb(dbInput);

  const results = await db.query(
    'SELECT * FROM entities WHERE site_id = ? AND is_active = 1',
    [siteId]
  );

  return results.map(mapToEntity);
}
```

### 2. Database Normalization

```typescript
import { normalizeDb } from './helpers';

// Always normalize D1 database input
const db = normalizeDb(dbInput);

// Now use db.query(), db.queryOne(), db.execute()
const results = await db.query('SELECT * FROM ...', params);
```

### 3. Type Mapping

```typescript
// Map D1 result to TypeScript type
function mapToProperty(row: any): Property {
  return {
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    address: row.address,
    // ... map all fields
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

## Middleware Patterns

### 1. Authentication Middleware

```typescript
// apps/worker/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import type { CloudflareEnv } from '../../../shared/config';
import { hashToken } from '../../../shared/utils/crypto';

export const authMiddleware = createMiddleware<{ Bindings: CloudflareEnv }>(
  async (c, next) => {
    // Extract Bearer token
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    // Hash and verify token
    const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);
    const tokenHash = await hashToken(token, salt);

    const apiToken = await getSiteApiToken(c.env.DB, tokenHash);
    if (!apiToken || !apiToken.isActive) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Set context variables
    c.set('siteId', apiToken.siteId);
    c.set('tokenId', apiToken.id);

    await next();
  }
);
```

### 2. Error Handling

```typescript
// Wrap async operations in try-catch
app.post('/properties', async (c) => {
  try {
    const siteId = c.get('siteId');
    const data = await c.req.json();

    const property = await createProperty(c.env.DB, siteId, data);
    return c.json({ property }, 201);
  } catch (error) {
    console.error('Error creating property:', error);
    return c.json({ error: 'Failed to create property' }, 500);
  }
});
```

## Environment Bindings

### 1. Binding Types

```typescript
// shared/config/index.ts
export interface CloudflareEnv {
  DB: D1Database;                    // D1 database
  PUBLIC_BUCKET: R2Bucket;           // Public files (property images)
  PRIVATE_BUCKET: R2Bucket;          // Private files (applications)
  OPENAI_API_KEY: string;            // OpenAI API key
  SESSION_SECRET: string;            // Session encryption key
  SITE_API_TOKEN_SALT: string;       // Token hashing salt
}
```

### 2. Accessing Bindings

```typescript
// In route handlers
app.post('/upload', async (c) => {
  const file = await c.req.blob();

  // Access R2 bucket
  await c.env.PUBLIC_BUCKET.put(key, file);

  // Access D1 database
  const result = await c.env.DB.prepare('SELECT ...').run();

  // Access environment variables
  const apiKey = c.env.OPENAI_API_KEY;

  return c.json({ success: true });
});
```

## D1 Database Operations

### 1. Query Patterns

```typescript
// SELECT with parameters
const results = await db.query(
  'SELECT * FROM properties WHERE site_id = ? AND is_active = 1',
  [siteId]
);

// Single row query
const property = await db.queryOne(
  'SELECT * FROM properties WHERE id = ? AND site_id = ?',
  [propertyId, siteId]
);

// INSERT
await db.execute(
  'INSERT INTO properties (id, site_id, name, ...) VALUES (?, ?, ?, ...)',
  [id, siteId, name, ...]
);

// UPDATE
await db.execute(
  'UPDATE properties SET name = ?, updated_at = ? WHERE id = ? AND site_id = ?',
  [name, new Date().toISOString(), id, siteId]
);

// DELETE (soft delete)
await db.execute(
  'UPDATE properties SET is_active = 0 WHERE id = ? AND site_id = ?',
  [id, siteId]
);
```

### 2. Transactions

```typescript
// D1 doesn't support multi-statement transactions yet
// Use batch operations for atomicity
const results = await c.env.DB.batch([
  c.env.DB.prepare('INSERT INTO ...').bind(...),
  c.env.DB.prepare('UPDATE ...').bind(...),
]);
```

## R2 Storage Operations

### 1. File Upload

```typescript
import { generateRandomToken } from '../../../shared/utils/crypto';

// Upload to public bucket (property images)
const key = `properties/${propertyId}/${generateRandomToken(16)}.jpg`;
await c.env.PUBLIC_BUCKET.put(key, file, {
  httpMetadata: {
    contentType: 'image/jpeg',
  },
});

// Upload to private bucket (applications)
const key = `leads/${leadId}/${originalFilename}`;
await c.env.PRIVATE_BUCKET.put(key, file);
```

### 2. File Retrieval

```typescript
// Get from R2
const object = await c.env.PUBLIC_BUCKET.get(key);
if (!object) {
  return c.json({ error: 'File not found' }, 404);
}

// Stream response
return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
  },
});
```

### 3. Signed URLs for Private Files

```typescript
import { generateSignedUrl } from '../../../shared/utils';

// Generate temporary signed URL (1 hour expiration)
const signedUrl = await generateSignedUrl(
  c.env.PRIVATE_BUCKET,
  fileKey,
  3600
);

return c.json({ url: signedUrl });
```

## API Response Patterns

### 1. Success Responses

```typescript
// List response
return c.json({
  properties: [...],
  total: properties.length,
});

// Single item response
return c.json({
  property: { ... },
});

// Created response (201)
return c.json({ property }, 201);

// No content (204)
return c.body(null, 204);
```

### 2. Error Responses

```typescript
// Bad request (400)
return c.json({ error: 'Invalid input', details: { ... } }, 400);

// Unauthorized (401)
return c.json({ error: 'Unauthorized' }, 401);

// Forbidden (403)
return c.json({ error: 'Access denied' }, 403);

// Not found (404)
return c.json({ error: 'Resource not found' }, 404);

// Server error (500)
return c.json({ error: 'Internal server error' }, 500);
```

## Testing

### 1. Local Development

```bash
# Run worker locally with Wrangler
npm run dev --workspace=leaselab-worker

# Worker runs at http://localhost:8787
```

### 2. Database Migrations

```bash
# Apply migrations to local D1
npx wrangler d1 execute leaselab-db --local --file=apps/worker/migrations/0000_init.sql

# Apply migrations to production D1
npx wrangler d1 execute leaselab-db --file=apps/worker/migrations/0000_init.sql
```

## Common Patterns

### 1. Validation with Zod

```typescript
import { LeadSubmissionSchema } from '../../../shared/config';

app.post('/leads', async (c) => {
  const data = await c.req.json();

  // Validate with Zod
  const result = LeadSubmissionSchema.safeParse(data);
  if (!result.success) {
    return c.json({ error: 'Validation failed', details: result.error }, 400);
  }

  const lead = await createLead(c.env.DB, siteId, result.data);
  return c.json({ lead }, 201);
});
```

### 2. Pagination

```typescript
app.get('/properties', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;

  const properties = await getProperties(c.env.DB, siteId, { limit, offset });
  const total = await getPropertiesCount(c.env.DB, siteId);

  return c.json({
    properties,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
```

## References

- Hono docs: https://hono.dev/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- D1 Database: https://developers.cloudflare.com/d1/
- R2 Storage: https://developers.cloudflare.com/r2/
- Worker code: [apps/worker/](../apps/worker/)
- Project guide: [CLAUDE.md](../CLAUDE.md)
