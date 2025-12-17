# AI Development Task Guide (Claude Code Ready)
LeaseLab.io - AI-First Rental Ops Platform – Monorepo Architecture

**Repo Name:** leaselab2

**Primary Goal:**
Build a unified rental management platform using Remix + Cloudflare Pages for admin ops and Hono + Cloudflare Workers for the backend API, with shared types, configs, and utilities in a monorepo structure.

**Current Status:**
- ✅ Worker API (Hono + Cloudflare Workers) - Complete
- ✅ Ops Admin (Remix + Cloudflare Pages) - Complete
- ⏳ Site Storefront (Remix + Cloudflare Pages) - Planned

This document is written for AI Agents (Claude Code, Cursor) to follow safely.

---

## 📁 1. Monorepo Directory Structure (Current Implementation)

The repository follows this layout:

```
leaselab2/
├─ apps/
│  ├─ worker/      # Backend API (Hono + Cloudflare Workers) ✅
│  ├─ ops/         # Admin dashboard (Remix + Cloudflare Pages) ✅
│  └─ site/        # Public storefront (Remix + Cloudflare Pages) ⏳
│
├─ shared/
│  ├─ types/           # Shared TypeScript types and domain models
│  ├─ utils/           # Shared utilities (crypto, date, money, image)
│  ├─ config/          # Shared configuration, Zod schemas, and enums
│  ├─ storage-core/    # Storage abstraction interfaces
│  └─ storage-cloudflare/ # Cloudflare storage adapters
│
├─ scripts/            # Database migrations and utilities
├─ package.json        # Root workspace config (npm workspaces)
└─ README.md
```

---

## ⚠️ 2. Critical Architecture Principles

### **Multi-Tenancy (MANDATORY)**
- **ALL database operations MUST include `site_id` filtering**
- Each site has isolated data (properties, units, leads, tenants, etc.)
- Users can have access to multiple sites via `user_access` table
- Super admins can access any site with active API tokens
- Database queries MUST filter by `site_id` to prevent data leaks

### **Security (MANDATORY)**
- **ALL passwords MUST use PBKDF2-SHA256 hashing** (100,000 iterations)
- **API tokens MUST be hashed** using shared crypto utilities
- Use `shared/utils/crypto.ts` for all hashing operations:
  - `hashPassword(password)` - Hash passwords with random salt
  - `verifyPassword(password, storedHash)` - Verify password
  - `hashToken(token, salt)` - Hash API tokens deterministically
  - `generateRandomToken(length)` - Generate secure tokens
- **Never store plaintext passwords or tokens**
- All sensitive data in R2 `PRIVATE_BUCKET` (not `PUBLIC_BUCKET`)

### **App Isolation & Data Flow**
```
┌─────────┐     HTTP/Bearer Token      ┌─────────────┐
│ apps/   │ ─────────────────────────> │ apps/worker │
│ ops     │                             │   (Hono)    │
└─────────┘                             └──────┬──────┘
                                               │
┌─────────┐     HTTP/Bearer Token             │
│ apps/   │ ─────────────────────────>        │
│ site    │                                    │
└─────────┘                                    │
                                               ▼
                                        ┌─────────────┐
                                        │ D1 Database │
                                        │ R2 Storage  │
                                        └─────────────┘
```

**Rules:**
- `apps/worker/` - Centralized API for ALL D1/R2 operations
- `apps/ops/` - Admin dashboard (NO direct DB access)
- `apps/site/` - Public storefront (NO direct DB access)
- Apps communicate with worker via HTTP + Bearer tokens
- Worker enforces site isolation at the database layer

---

## 🔧 3. Root package.json (Current Workspace Setup)

The workspace is configured with npm workspaces:

```json
{
  "name": "leaselab",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:site": "npm run dev --workspace=@leaselab/site",
    "dev:ops": "npm run dev --workspace=@leaselab/ops",
    "dev:worker": "npm run dev --workspace=leaselab-worker",
    "dev": "npm-run-all --parallel dev:ops dev:worker",
    "build": "npm-run-all build:site build:ops",
    "build:site": "npm run build --workspace=@leaselab/site",
    "build:ops": "npm run build --workspace=@leaselab/ops",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "vitest run"
  }
}
```

**Note:** Worker app uses plain package.json (not workspace-aware due to Wrangler compatibility)

---

## 🧱 4. Shared Packages – Current Implementation

### **shared/types/index.ts** exports:

**Property Management:**
- `Property`, `PropertyType`, `Unit`, `UnitStatus`, `UnitHistory`, `UnitEventType`
- `PropertyImage` (for both properties and units)

**Lead Processing:**
- `Lead`, `LeadStatus`, `LeadFile`, `LeadFileType`
- `LeadAIEvaluation`, `AILabel`, `LeadHistory`
- `EmploymentStatus`

**Operations:**
- `Tenant`, `TenantStatus`
- `Lease`, `LeaseStatus`
- `WorkOrder`, `WorkOrderCategory`, `WorkOrderPriority`, `WorkOrderStatus`

**Auth & Access:**
- `User`, `UserRole`, `Session`
- `SiteApiToken`, `UserAccess`, `Site`

### **shared/config/index.ts** contains:

- **Zod enums** for all status types (PropertyTypeEnum, UnitStatusEnum, etc.)
- **API_ROUTES** - Centralized route definitions
- **Zod validation schemas** (LeadSubmissionSchema, etc.)
- **CloudflareEnv** type for environment bindings

### **shared/utils/index.ts** contains:

- **Date helpers:** `formatDate`, `parseDate`, `calculateAge`, `daysBetween`, `addDays`, `isDateInPast`, `isDateInFuture`
- **Income/rent calculators:** `calculateIncomeToRentRatio`, `meetsIncomeRequirement`, `getIncomeRatioLabel`
- **Money formatting:** `formatCurrency`, `formatNumber`, `parseCurrency`
- **R2 utilities:** `generateSignedUrl`, `getPublicUrl`

### **shared/utils/crypto.ts** contains:

- `hashPassword(password): Promise<string>` - PBKDF2-SHA256 with random salt
- `verifyPassword(password, storedHash): Promise<boolean>` - Verify password
- `hashToken(token, salt): Promise<string>` - Hash API tokens with provided salt
- `generateRandomToken(length = 32): string` - Generate secure random tokens

### **shared/utils/image.ts** contains:

- Image upload/download helpers
- R2 bucket operations
- Image metadata extraction
- Thumbnail generation utilities

---

## 🔌 5. Import Paths (No Path Mapping Required)

Shared packages are imported using **relative paths** from the monorepo root:

```typescript
// In apps/worker or apps/ops
import type { Property, Unit, Lead } from '../../shared/types';
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';
import { API_ROUTES, LeadSubmissionSchema } from '../../shared/config';
import { formatCurrency, formatDate } from '../../shared/utils';
```

**Benefits:**
- Works natively with TypeScript and bundlers
- No tsconfig path mapping needed
- Clearer dependency relationships
- Better IDE support (auto-complete, go-to-definition)

---

## ⚡ 6. Worker App (Hono + Cloudflare Workers) – Current Implementation

**Location:** `apps/worker/`

### Architecture:

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
   ├─ 0000_init_from_production.sql  # Full schema
   ├─ 0001_test_data.sql             # Sample data
   └─ 0002_reset_hashes.sql          # Password hash upgrade
```

### wrangler.toml bindings:

```toml
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"

[[r2_buckets]]
binding = "PUBLIC_BUCKET"
bucket_name = "leaselab-pub"    # Property images, public assets

[[r2_buckets]]
binding = "PRIVATE_BUCKET"
bucket_name = "leaselab-pri"    # Applications, leases, sensitive docs
```

### API Routes:

```
GET  /                           # Health check
POST /api/public/*               # Public APIs (Bearer token auth)
POST /api/ops/*                  # Ops APIs (Internal auth + Bearer)
```

### Database Operations Pattern:

**ALL database operations follow this pattern:**

```typescript
export async function getProperties(
  dbInput: DatabaseInput,
  siteId: string,  // ← REQUIRED for multi-tenancy
  options?: FilterOptions
): Promise<Property[]> {
  const db = normalizeDb(dbInput);
  const results = await db.query(
    'SELECT * FROM properties WHERE site_id = ? AND is_active = 1',
    [siteId]  // ← Always filter by site_id
  );
  return results.map(mapToProperty);
}
```

**CRITICAL:** Every DB function MUST:
1. Accept `siteId` as the second parameter (after `dbInput`)
2. Filter ALL queries by `site_id`
3. Use parameterized queries to prevent SQL injection

---

## 🏢 7. Ops App (Remix + Cloudflare Pages) – Current Implementation

**Location:** `apps/ops/`

### Architecture:

```
apps/ops/
├─ app/
│  ├─ routes/              # Remix routes (UI + API)
│  │  ├─ _index.tsx        # Dashboard
│  │  ├─ properties/       # Property management
│  │  ├─ units/            # Unit management
│  │  ├─ leads/            # Lead management
│  │  ├─ tenants/          # Tenant management
│  │  ├─ leases/           # Lease management
│  │  ├─ work-orders/      # Work order management
│  │  └─ api/              # Resource routes (proxy to worker)
│  ├─ components/          # Reusable UI components
│  └─ lib/                 # Utilities
│     └─ worker-client.ts  # HTTP client for worker API
├─ wrangler.toml           # Cloudflare Pages config
└─ package.json
```

### Data Access Pattern:

```typescript
// In Remix loader (app/routes/properties._index.tsx)
export async function loader({ request, context }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const siteId = session.user.siteId;

  // Call worker API (NOT direct DB access)
  const response = await fetch(`${WORKER_URL}/api/ops/properties`, {
    headers: {
      'Authorization': `Bearer ${siteToken}`,
      'X-Site-Id': siteId,
      'X-User-Id': session.user.id,
    },
  });

  const properties = await response.json();
  return json({ properties });
}
```

**CRITICAL:** Ops app NEVER accesses D1 directly - always through worker API.

---

## 🏠 8. Site App (Remix + Cloudflare Pages) – Planned

**Location:** `apps/site/` (To be implemented)

### Migration Strategy:

1. **Feature parity** - All existing pages and functionality preserved
2. **Incremental migration** - Convert one route/component at a time
3. **Worker API integration** - Use worker for all data operations
4. **Consistent patterns** - Same auth, data fetching, and styling approach

### Planned Routes:

```
app/routes/
├─ _index.tsx              # Home page with property listings
├─ properties.$slug.tsx    # Property detail page
├─ thank-you.tsx           # Form submission confirmation
└─ api/
   └─ leads.tsx            # Lead submission (proxy to worker)
```

### Data Flow:

```
Site → Worker API → D1/R2
  ↓
POST /api/public/leads
{
  propertyId, firstName, lastName, email, phone,
  employmentStatus, monthlyIncome, moveInDate, message
}
```

---

## 🪄 9. AI Evaluation Pipeline (Implemented in Worker)

### API Endpoint:

```
POST /api/ops/leads/:id/ai
```

### Implementation:

```typescript
// In apps/worker/routes/ops.ts
1. Fetch lead + files + property rent from D1
2. Generate signed URLs from R2 (PRIVATE_BUCKET)
3. Call OpenAI Vision + Text API with documents
4. Parse JSON response:
   {
     "score": 0-100,
     "label": "A/B/C/D",
     "summary": "...",
     "risk_flags": [...],
     "recommendation": "...",
     "fraud_signals": [...],
     "model_version": "v1"
   }
5. Save to lead_ai_evaluations table
6. Update leads.ai_score and leads.ai_label
7. Record event in lead_history
```

### Dashboard Integration:

- Leads sorted by `ai_score DESC`
- Color-coded by `ai_label` (A=green, B=yellow, C=orange, D=red)
- Risk flags and fraud signals highlighted

---

## 📄 10. D1 Schema (Current Implementation)

**Location:** `apps/worker/migrations/0000_init_from_production.sql`

### Core Tables (all include `site_id` for multi-tenancy):

**Multi-Tenancy:**
- `sites` - Site/tenant configuration
- `users` - User accounts with role-based access
- `user_access` - Many-to-many user-site relationships (with `granted_at`, `granted_by`)
- `site_api_tokens` - API tokens for site access (hashed)
- `sessions` - User session management

**Property Management:**
- `properties` - Property listings (with slug, address, lat/lng)
- `units` - Individual rental units (with bedrooms, bathrooms, rent)
- `unit_history` - Unit event tracking (move-in, move-out, rent changes)
- `images` - Property/unit images (R2 references with sort order, cover flag)

**Lead Processing:**
- `leads` - Rental applications (with AI score/label, status)
- `lead_files` - Application documents (R2 references)
- `lead_ai_evaluations` - AI screening results (score, label, summary, flags)
- `lead_history` - Lead event tracking

**Operations:**
- `tenants` - Current/past tenants (linked to leads)
- `leases` - Lease agreements (with DocuSign integration)
- `work_orders` - Maintenance requests (with category, priority, status)

### Key Indexes:

```sql
CREATE INDEX idx_properties_site_id ON properties(site_id);
CREATE INDEX idx_units_site_id ON units(site_id);
CREATE INDEX idx_leads_site_id ON leads(site_id);
CREATE INDEX idx_leads_ai_score ON leads(site_id, ai_score DESC);
CREATE INDEX idx_site_api_tokens_hash ON site_api_tokens(token_hash);
CREATE INDEX idx_user_access_lookup ON user_access(user_id, site_id);
```

---

## 🔐 11. Authentication System (Current Implementation)

### Password Security:

```typescript
// When creating a user
const passwordHash = await hashPassword(plainPassword);
await db.execute(
  'INSERT INTO users (id, email, password_hash, ...) VALUES (?, ?, ?, ...)',
  [userId, email, passwordHash, ...]
);

// When verifying login
const user = await getUserByEmail(db, siteId, email);
const isValid = await verifyPassword(plainPassword, user.passwordHash);
```

**Implementation:**
- PBKDF2-SHA256 with 100,000 iterations
- Random 16-byte salt per password
- Stored as `salt:hash` in hex format
- Uses Web Crypto API (works in Node.js 19+ and Cloudflare Workers)

### API Token Security:

```typescript
// When creating a site API token
const rawToken = generateRandomToken(32);  // Show to user ONCE
const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);  // Shared constant
const tokenHash = await hashToken(rawToken, salt);

await db.execute(
  'INSERT INTO site_api_tokens (id, site_id, token_hash, ...) VALUES (?, ?, ?, ...)',
  [tokenId, siteId, tokenHash, ...]
);

// When verifying a token
const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);
const tokenHash = await hashToken(providedToken, salt);
const token = await db.queryOne(
  'SELECT * FROM site_api_tokens WHERE token_hash = ? AND is_active = 1',
  [tokenHash]
);
```

### Session Management:

- Cookie-based sessions with signed cookies
- Session secret stored in environment (`SESSION_SECRET`)
- User session stored in D1 `sessions` table
- Expires after 7 days of inactivity

### Multi-Tenant Access Control:

```typescript
// Get sites accessible to a user
const accessibleSites = await db.query(
  'SELECT site_id, role FROM user_access WHERE user_id = ?',
  [userId]
);

// Super admin access (uses active site API tokens)
if (user.isSuperAdmin) {
  const tokens = await db.query(
    'SELECT DISTINCT site_id FROM site_api_tokens WHERE is_active = 1'
  );
  // Super admin can access any site with active tokens
}
```

---

## 🚀 12. Development Tasks (Current Status)

### ✅ Completed Tasks:

- [x] Task 1 - Scaffold monorepo folders
- [x] Task 2 - Create root workspace config
- [x] Task 3 - Create shared packages (types, utils, config)
- [x] Task 4 - Create Worker app (Hono + Cloudflare Workers)
- [x] Task 5 - Implement multi-tenancy (site_id, user_access)
- [x] Task 6 - Implement security (PBKDF2 hashing, API tokens)
- [x] Task 7 - Create Ops app (Remix + Cloudflare Pages)
- [x] Task 8 - Implement database operations (all models)
- [x] Task 9 - Implement authentication & authorization
- [x] Task 10 - Create admin UI (properties, units, leads, tenants, leases, work orders)
- [x] Task 11 - Implement AI evaluation pipeline
- [x] Task 12 - Implement image upload/management

### ⏳ Remaining Tasks:

- [ ] Task 13 - Migrate Site to Remix (storefront)
- [ ] Task 14 - Implement tenant portal
- [ ] Task 15 - Integrate DocuSign for lease signing
- [ ] Task 16 - Integrate screening providers (Certn/SingleKey)
- [ ] Task 17 - Add payment processing (Stripe/Square)

---

## 🎯 13. Acceptance Criteria (Current Status)

### ✅ Achieved:

- [x] Worker app deployed to Cloudflare Workers
- [x] Ops app deployed to Cloudflare Pages
- [x] Multi-tenancy fully implemented (site_id isolation)
- [x] Secure password hashing (PBKDF2-SHA256)
- [x] API token authentication (hashed tokens)
- [x] D1 database with full schema
- [x] R2 storage (public + private buckets)
- [x] AI evaluation pipeline functional
- [x] Admin UI usable (all CRUD operations)
- [x] Image upload/management working

### ⏳ Pending:

- [ ] Site storefront deployed
- [ ] Lead form submits to Worker API
- [ ] Google Maps integration
- [ ] DocuSign integration
- [ ] Screening provider integration

---

## 💡 14. Best Practices & Guidelines

### When Adding New Features:

1. **Add types to `shared/types/index.ts`** first
2. **Add Zod schemas to `shared/config/index.ts`** for validation
3. **Implement DB operations in `apps/worker/lib/db/`** (MUST include `site_id`)
4. **Add API routes to `apps/worker/routes/`**
5. **Add UI in `apps/ops/app/routes/`**
6. **Test multi-tenancy** - Ensure data isolation between sites

### When Modifying Database:

1. **Create a migration file** in `apps/worker/migrations/`
2. **Update TypeScript types** in `shared/types/`
3. **Update DB operations** in `apps/worker/lib/db/`
4. **Add indexes** for frequently queried columns
5. **Always include `site_id`** in WHERE clauses

### Security Checklist:

- [ ] All passwords hashed with `hashPassword()`
- [ ] All API tokens hashed with `hashToken()`
- [ ] All DB queries filter by `site_id`
- [ ] All sensitive files in `PRIVATE_BUCKET`
- [ ] All API endpoints require authentication
- [ ] All user input validated with Zod schemas
- [ ] All SQL queries use parameterized queries

---

## 📚 Additional Resources

- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Cloudflare D1:** https://developers.cloudflare.com/d1/
- **Cloudflare R2:** https://developers.cloudflare.com/r2/
- **Remix:** https://remix.run/docs
- **Hono:** https://hono.dev/
- **Zod:** https://zod.dev/

---

**Last Updated:** 2024-11-28
**Version:** 2.0 (Reflects current implementation with multi-tenancy and security enhancements)
