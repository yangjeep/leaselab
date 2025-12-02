# Centralized Environment Configuration

## Overview

All Cloudflare environment bindings (R2 buckets, D1 database, env vars) are now centralized in a **single source of truth**: [shared/config/env.ts](../shared/config/env.ts)

This eliminates duplication and makes changes easier - update once, apply everywhere.

## Problem Solved

**Before:** Bucket bindings were defined separately in multiple places:
- ❌ `apps/worker/worker.ts` - duplicate interface
- ❌ `apps/worker/routes/ops.ts` - duplicate interface
- ❌ `apps/worker/routes/public.ts` - duplicate interface
- ❌ `apps/ops/env.d.ts` - duplicate interface
- ❌ `apps/ops/app/lib/storage.server.ts` - duplicate interface

**After:** Single source of truth:
- ✅ `shared/config/env.ts` - **ONE** interface
- ✅ All apps import from this shared config
- ✅ Changes propagate automatically

## Architecture

### Centralized Type Definitions

**Location:** [shared/config/env.ts](../shared/config/env.ts)

```typescript
// R2 Bucket bindings
export interface R2Bindings {
  PUBLIC_BUCKET: R2Bucket;   // leaselab-pub
  PRIVATE_BUCKET: R2Bucket;  // leaselab-pri
}

// D1 Database bindings
export interface D1Bindings {
  DB: D1Database;  // leaselab-db
}

// Environment variables
export interface EnvVars {
  R2_PUBLIC_URL?: string;
  OPENAI_API_KEY: string;
  SESSION_SECRET: string;
  ENVIRONMENT: string;
  WORKER_INTERNAL_KEY?: string;
  SITE_API_TOKEN?: string;
}

// Complete environment (all bindings + vars)
export interface CloudflareEnv extends D1Bindings, R2Bindings, EnvVars {}

// Partial environment (for optional bindings)
export interface PartialCloudflareEnv extends D1Bindings, Partial<R2Bindings>, Partial<EnvVars> {}
```

### Configuration Helpers

The shared config also provides constants for bucket/database configuration:

```typescript
import { BUCKET_CONFIG, DATABASE_CONFIG } from '~/shared/config';

// Access bucket metadata
BUCKET_CONFIG.public.name     // 'leaselab-pub'
BUCKET_CONFIG.public.binding  // 'PUBLIC_BUCKET'
BUCKET_CONFIG.public.usedFor  // ['property images', 'unit photos', ...]

BUCKET_CONFIG.private.name    // 'leaselab-pri'
BUCKET_CONFIG.private.binding // 'PRIVATE_BUCKET'
BUCKET_CONFIG.private.usedFor // ['rental applications', 'lease agreements', ...]

// Access database metadata
DATABASE_CONFIG.name           // 'leaselab-db'
DATABASE_CONFIG.binding        // 'DB'
```

## Usage Across Apps

### Worker (apps/worker/worker.ts)

```typescript
import type { CloudflareEnv } from '../../shared/config';

export type Env = CloudflareEnv;

const app = new Hono<{ Bindings: Env }>();
```

### Worker Routes (apps/worker/routes/*.ts)

```typescript
import type { CloudflareEnv } from '../../../shared/config';

type Bindings = CloudflareEnv;

const routes = new Hono<{ Bindings: Bindings }>();
```

### Ops App (apps/ops/env.d.ts)

```typescript
import type { CloudflareEnv } from '~/shared/config';

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnv;  // Single import!
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}
```

### Storage Layer (apps/ops/app/lib/storage.server.ts)

```typescript
import type { CloudflareEnv, PartialCloudflareEnv } from '~/shared/config';

// Re-export for convenience
export type { CloudflareEnv, PartialCloudflareEnv };

export function createStorage(env: CloudflareEnv): Storage {
  // Implementation using env.PUBLIC_BUCKET, env.PRIVATE_BUCKET, etc.
}
```

## Benefits

### 1. Single Source of Truth
- ✅ All environment types defined in ONE place
- ✅ No duplicate interfaces
- ✅ TypeScript ensures consistency

### 2. Easy to Update
When adding a new binding:

**Before (5 files to update):**
```diff
# apps/worker/worker.ts
+ NEW_BINDING: KVNamespace;

# apps/worker/routes/ops.ts
+ NEW_BINDING: KVNamespace;

# apps/worker/routes/public.ts
+ NEW_BINDING: KVNamespace;

# apps/ops/env.d.ts
+ NEW_BINDING: KVNamespace;

# apps/ops/app/lib/storage.server.ts
+ NEW_BINDING: KVNamespace;
```

**After (1 file to update):**
```diff
# shared/config/env.ts
export interface EnvVars {
  // ... existing vars
+ NEW_BINDING: KVNamespace;
}

# All apps automatically get the update! ✨
```

### 3. Better Documentation
The shared config includes JSDoc comments explaining:
- What each binding is for
- Bucket names and purposes
- Access patterns (public vs private)
- Use cases for each bucket

### 4. Type Guards
Built-in type guards for runtime checks:

```typescript
import { hasRequiredBindings, hasR2Bindings } from '~/shared/config';

// Check if environment has all required bindings
if (!hasRequiredBindings(env)) {
  throw new Error('Missing required environment bindings');
}

// Check specific binding groups
if (hasR2Bindings(env)) {
  // Safe to access env.PUBLIC_BUCKET and env.PRIVATE_BUCKET
}
```

## Examples

### Adding a New Bucket

If you need to add a third bucket (e.g., for backups):

1. **Update shared/config/env.ts:**
```typescript
export interface R2Bindings {
  PUBLIC_BUCKET: R2Bucket;
  PRIVATE_BUCKET: R2Bucket;
  BACKUP_BUCKET: R2Bucket;  // ← Add here only
}

export const BUCKET_CONFIG = {
  // ... existing
  backup: {
    binding: 'BACKUP_BUCKET',
    name: 'leaselab-backup',
    description: 'Backup storage',
    access: 'private',
  },
} as const;
```

2. **Update wrangler.toml files:**
```toml
[[r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "leaselab-backup"
```

3. **Done!** All apps automatically have the new binding typed correctly.

### Adding a New Environment Variable

1. **Update shared/config/env.ts:**
```typescript
export interface EnvVars {
  // ... existing
  STRIPE_API_KEY: string;  // ← Add here only
}
```

2. **Update wrangler.toml files:**
```toml
[vars]
STRIPE_API_KEY = "sk_test_..."
```

3. **Done!** TypeScript knows about it everywhere.

## Migration Summary

### Files Changed

| File | Change |
|------|--------|
| **shared/config/env.ts** | ✅ Created - centralized config |
| **shared/config/index.ts** | ✅ Updated - exports env types |
| **apps/worker/worker.ts** | ✅ Now imports from shared config |
| **apps/worker/routes/ops.ts** | ✅ Now imports from shared config |
| **apps/worker/routes/public.ts** | ✅ Now imports from shared config |
| **apps/ops/env.d.ts** | ✅ Now imports from shared config |
| **apps/ops/app/lib/storage.server.ts** | ✅ Now imports from shared config |

### Files Removed
None - old interfaces were replaced with imports.

### Backward Compatibility
✅ All existing code continues to work - types are re-exported for convenience.

## Best Practices

### DO ✅
- Always import environment types from `shared/config`
- Update `shared/config/env.ts` when adding new bindings
- Use the `BUCKET_CONFIG` and `DATABASE_CONFIG` constants for metadata
- Use type guards for runtime checks

### DON'T ❌
- Don't define new environment interfaces in individual apps
- Don't duplicate binding names or types
- Don't hardcode bucket names - use `BUCKET_CONFIG`

## Future Improvements

Potential enhancements:
1. Auto-generate wrangler.toml from shared config
2. Runtime validation of environment bindings on startup
3. Generate TypeScript types from wrangler.toml (reverse direction)
4. Add more type guards for specific binding combinations

## Related Documentation

- [R2 Bucket Migration Guide](R2_BUCKET_MIGRATION.md)
- [Storage Abstraction Layer](PRD-Storage-Abstraction-Layer.md)
- [Cloudflare Workers Types](https://github.com/cloudflare/workers-types)
