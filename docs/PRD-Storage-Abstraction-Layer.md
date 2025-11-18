# PRD: Storage Abstraction Layer

## Overview

Abstract Cloudflare-specific storage services (D1, KV, R2) behind a provider-agnostic abstraction layer to enable swapping underlying technologies (MySQL/PostgreSQL, Redis, S3).

## Problem Statement

The current LeaseLab implementation is tightly coupled to Cloudflare services:
- **D1** for relational data (58+ operations across 38 routes)
- **KV** for session storage (4 operations across 3 routes)
- **R2** for file storage (4 operations across 17 routes)

This coupling:
- Limits deployment flexibility (cannot run on AWS, GCP, or self-hosted)
- Increases vendor lock-in risk
- Complicates local development and testing
- Prevents hybrid cloud architectures

## Proposed Solution

Implement a **Storage Provider Interface** pattern with:
1. Abstract interfaces for each storage type
2. Cloudflare implementations (current behavior)
3. Alternative implementations (MySQL/PostgreSQL, Redis, S3)
4. Provider factory with runtime configuration

## Technical Design

### Architecture

```
packages/
├─ storage-core/           # Abstract interfaces
│  ├─ src/
│  │  ├─ database.ts      # IDatabase interface
│  │  ├─ cache.ts         # ICache interface
│  │  ├─ object-store.ts  # IObjectStore interface
│  │  └─ factory.ts       # Provider factory
│
├─ storage-cloudflare/     # Cloudflare implementations
│  ├─ src/
│  │  ├─ d1-database.ts
│  │  ├─ kv-cache.ts
│  │  └─ r2-object-store.ts
│
├─ storage-standard/       # Standard implementations
│  ├─ src/
│  │  ├─ sql-database.ts  # MySQL/PostgreSQL via Drizzle
│  │  ├─ redis-cache.ts
│  │  └─ s3-object-store.ts
```

### Interface Definitions

#### IDatabase (Relational)

```typescript
interface IDatabase {
  // Core operations
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastRowId: number }>;

  // Transaction support
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;

  // Connection management
  close(): Promise<void>;
}
```

#### ICache (Key-Value)

```typescript
interface ICache {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: unknown, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}
```

#### IObjectStore (File Storage)

```typescript
interface IObjectStore {
  put(key: string, data: ArrayBuffer | ReadableStream, metadata?: ObjectMetadata): Promise<void>;
  get(key: string): Promise<{ data: ReadableStream; metadata: ObjectMetadata } | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<ObjectInfo[]>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

interface ObjectMetadata {
  contentType?: string;
  contentLength?: number;
  customMetadata?: Record<string, string>;
}
```

### Configuration

```typescript
// Environment-based configuration
const config: StorageConfig = {
  database: {
    provider: process.env.DB_PROVIDER || 'cloudflare-d1', // 'd1' | 'postgresql' | 'mysql'
    // Provider-specific options
    connectionString: process.env.DATABASE_URL,
    d1Binding: env.DB,
  },
  cache: {
    provider: process.env.CACHE_PROVIDER || 'cloudflare-kv', // 'kv' | 'redis'
    redisUrl: process.env.REDIS_URL,
    kvBinding: env.SESSION_KV,
  },
  objectStore: {
    provider: process.env.STORAGE_PROVIDER || 'cloudflare-r2', // 'r2' | 's3'
    s3Config: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    r2Binding: env.FILE_BUCKET,
  },
};
```

## Current State Analysis

### What's Already Abstracted (Low Effort)

| Service | Current State | Location | Effort to Abstract |
|---------|--------------|----------|-------------------|
| D1 | Centralized in `db.server.ts` | `apps/ops/app/lib/` | **Medium** - 58 operations need interface |
| KV | Centralized in `auth.server.ts` | `apps/ops/app/lib/` | **Low** - Only 4 operations |
| R2 | Partially centralized | Multiple routes | **Medium** - Needs consolidation first |

### D1 Operations Breakdown

Current operations in `apps/ops/app/lib/db.server.ts`:

| Entity | SELECT | INSERT | UPDATE | DELETE | Total |
|--------|--------|--------|--------|--------|-------|
| Leads | 4 | 1 | 1 | 0 | 6 |
| Lead Files | 2 | 1 | 0 | 0 | 3 |
| AI Evaluations | 1 | 1 | 0 | 0 | 2 |
| Properties | 4 | 1 | 1 | 1 | 7 |
| Units | 5 | 1 | 1 | 1 | 8 |
| Unit History | 1 | 1 | 0 | 0 | 2 |
| Images | 2 | 1 | 2 | 1 | 6 |
| Work Orders | 2 | 1 | 1 | 1 | 5 |
| Tenants | 2 | 0 | 0 | 0 | 2 |
| Users | 2 | 0 | 0 | 0 | 2 |
| **Total** | **25** | **8** | **6** | **4** | **43** |

### KV Operations

Location: `apps/ops/app/lib/auth.server.ts`
- `createSession()` - put with TTL
- `getSession()` - get
- `deleteSession()` - delete

### R2 Operations

| Route | Operations |
|-------|------------|
| `api.images.upload.tsx` | put |
| `api.images.$id.file.tsx` | get |
| `api.images.$id.tsx` | get, delete |
| `ai.server.ts` | get (for AI evaluation) |

## Effort Estimation

### Phase 1: Core Abstraction Layer (8-12 days)

| Task | Description | Effort |
|------|-------------|--------|
| **1.1** Create `storage-core` package | Interfaces, types, factory | 2-3 days |
| **1.2** Implement Cloudflare adapters | D1, KV, R2 wrappers | 3-4 days |
| **1.3** Refactor `db.server.ts` | Use database interface | 2-3 days |
| **1.4** Refactor `auth.server.ts` | Use cache interface | 1 day |
| **1.5** Centralize R2 operations | Create file service, use interface | 1-2 days |

**Subtotal: 9-13 days**

### Phase 2: Alternative Implementations (10-15 days)

| Task | Description | Effort |
|------|-------------|--------|
| **2.1** SQL Database adapter | Drizzle ORM with PostgreSQL/MySQL | 3-4 days |
| **2.2** Redis cache adapter | ioredis implementation | 2-3 days |
| **2.3** S3 object store adapter | AWS SDK v3 implementation | 3-4 days |
| **2.4** Schema migrations | Drizzle migrations for SQL DBs | 2-4 days |

**Subtotal: 10-15 days**

### Phase 3: Testing & Documentation (5-8 days)

| Task | Description | Effort |
|------|-------------|--------|
| **3.1** Unit tests | Test each adapter with mocks | 2-3 days |
| **3.2** Integration tests | Test with real services | 2-3 days |
| **3.3** Documentation | Setup guides, migration docs | 1-2 days |

**Subtotal: 5-8 days**

### Phase 4: Migration Support (3-5 days)

| Task | Description | Effort |
|------|-------------|--------|
| **4.1** Data migration scripts | D1 → PostgreSQL/MySQL | 2-3 days |
| **4.2** File migration tools | R2 → S3 sync | 1-2 days |

**Subtotal: 3-5 days**

## Total Effort Estimate

| Phase | Optimistic | Pessimistic |
|-------|------------|-------------|
| Phase 1: Core Abstraction | 8 days | 12 days |
| Phase 2: Alternative Implementations | 10 days | 15 days |
| Phase 3: Testing & Documentation | 5 days | 8 days |
| Phase 4: Migration Support | 3 days | 5 days |
| **Total** | **26 days** | **40 days** |

**Estimated Range: 5-8 weeks** (1 developer)

## Complexity Factors

### High Complexity Areas

1. **SQL Dialect Differences**
   - D1 uses SQLite syntax
   - PostgreSQL/MySQL have different syntax for:
     - UPSERT operations
     - JSON handling
     - Date functions
     - Auto-increment vs SERIAL
   - **Mitigation**: Use Drizzle ORM for query building

2. **Transaction Semantics**
   - D1 has limited transaction support
   - PostgreSQL has full ACID transactions
   - **Impact**: May need to update some operations

3. **Signed URL Generation**
   - R2 and S3 have different signing mechanisms
   - **Mitigation**: Abstract behind `getSignedUrl()` method

### Low Complexity Areas

1. **KV → Redis**: Nearly 1:1 mapping
2. **Basic CRUD operations**: Similar across all databases
3. **File put/get/delete**: Same semantics across R2/S3

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SQL dialect incompatibility | High | Medium | Use Drizzle ORM, comprehensive tests |
| Performance regression | Medium | Low | Benchmark before/after, optimize hot paths |
| Session incompatibility | Medium | Low | Design cache interface carefully |
| Breaking changes | High | Medium | Feature flags, gradual rollout |

## Benefits

### Immediate Benefits
- **Local development**: Use PostgreSQL + Redis + MinIO locally
- **Testing**: Easier mocking and integration tests
- **Code clarity**: Clear separation of concerns

### Long-term Benefits
- **Multi-cloud**: Deploy to AWS, GCP, Azure, or hybrid
- **Cost optimization**: Choose cheapest provider per service
- **Compliance**: Keep data in specific regions/providers
- **Scaling**: Use managed database services at scale

## Recommendation

### Suggested Approach: Phased Rollout

1. **Week 1-2**: Phase 1 - Core abstractions with Cloudflare adapters
   - No behavioral change, just refactoring
   - Easy to validate correctness

2. **Week 3-4**: Phase 2 - PostgreSQL + Redis adapters
   - Most common alternative stack
   - Good local development story

3. **Week 5**: Phase 3 - Testing
   - Ensure both stacks work identically

4. **Week 6+**: Phase 4 - S3 adapter & migrations
   - Lower priority than database/cache

### MVP Scope (Phase 1 Only)

If full implementation is too large, consider **Phase 1 only**:
- **Effort**: 8-12 days
- **Benefit**: Clean architecture, easier future extension
- **Risk**: Minimal - just refactoring existing code

This creates the foundation without requiring alternative implementations immediately.

## Success Criteria

1. All existing functionality works unchanged with Cloudflare providers
2. Alternative providers pass same integration test suite
3. Provider can be swapped via environment configuration
4. No performance regression >10% on critical paths
5. Clear documentation for each provider setup

## Dependencies

### Required Packages

```json
{
  "storage-standard": {
    "drizzle-orm": "^0.29.0",
    "drizzle-kit": "^0.20.0",
    "pg": "^8.11.0",
    "mysql2": "^3.6.0",
    "ioredis": "^5.3.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0"
  }
}
```

### Infrastructure for Testing

- PostgreSQL (local Docker or managed)
- Redis (local Docker or managed)
- S3-compatible storage (MinIO for local, AWS S3 for prod)

## Appendix: File Locations to Modify

### Primary Files (Phase 1)

| File | Changes |
|------|---------|
| `apps/ops/app/lib/db.server.ts` | Refactor to use IDatabase |
| `apps/ops/app/lib/auth.server.ts` | Refactor to use ICache |
| `apps/ops/app/lib/ai.server.ts` | Refactor R2 calls to use IObjectStore |
| `apps/ops/app/routes/api.images.*.tsx` | Use centralized file service |

### Routes Using Storage (38 total)

All routes in `apps/ops/app/routes/` and `apps/site/app/routes/` that import from `db.server.ts` will automatically get the abstraction through the dependency injection.

## Conclusion

The storage abstraction layer is a **medium-sized refactoring effort** with significant long-term benefits. The current codebase is already partially abstracted (centralized `db.server.ts`), which reduces the effort significantly.

**Recommended timeline**: 5-8 weeks for full implementation, or 1-2 weeks for MVP (Phase 1 only).

The MVP approach provides immediate architectural benefits with minimal risk, while setting the foundation for alternative providers when needed.
