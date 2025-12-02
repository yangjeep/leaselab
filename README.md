# LeaseLab

AI-First Rental Operations Platform - Monorepo with Remix + Cloudflare

## Overview

LeaseLab is a comprehensive property management platform built on Cloudflare's edge infrastructure. The platform features:

- **Multi-tenant architecture** with site isolation
- **AI-powered tenant screening** using OpenAI
- **Secure authentication** with PBKDF2-SHA256 password hashing
- **Centralized API** for all database and storage operations
- **Real-time operations** for property, unit, and lease management
- **Secure file upload/download** with multi-layer validation (5MB limit)
- **CDN-optimized image delivery** for property/unit photos

## Project Structure

```
leaselab2/
├── apps/
│   ├── worker/      # Backend API (Hono + Cloudflare Workers) ✅
│   ├── ops/         # Admin dashboard (Remix + Cloudflare Pages) ✅
│   └── site/        # Public storefront (Planned) ⏳
├── shared/
│   ├── types/       # Shared TypeScript types and domain models
│   ├── utils/       # Shared utilities (crypto, date, money, image)
│   ├── config/      # Shared configuration and Zod schemas
│   ├── storage-core/         # Storage abstraction interfaces
│   └── storage-cloudflare/   # Cloudflare storage adapters
└── scripts/         # Database migrations and utilities
```

## Architecture

### Data Flow

```
┌─────────────┐                    ┌──────────────┐
│  apps/ops   │ ──── HTTP ────────>│ apps/worker  │
│  (Remix)    │    Bearer Token    │   (Hono)     │
└─────────────┘                    └──────┬───────┘
                                          │
┌─────────────┐                           │
│  apps/site  │ ──── HTTP ────────>       │
│  (Remix)    │    Bearer Token           │
└─────────────┘                           │
                                          ▼
                                   ┌─────────────┐
                                   │ D1 Database │
                                   │ R2 Storage  │
                                   └─────────────┘
```

### Key Principles

1. **Centralized Data Access**: All database and storage operations happen in `apps/worker`
2. **Multi-Tenancy**: Every database query filters by `site_id` for data isolation
3. **Security First**: PBKDF2-SHA256 for passwords, hashed API tokens, signed cookies
4. **Type Safety**: Shared types across all apps, Zod validation for all API inputs

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (comes with Node.js)
- [**Wrangler CLI**](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- **Cloudflare account** (free tier works for development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspace apps (ops, worker).

### 2. Set Up Environment

Create a `.env.local` file in the root directory:

```bash
# Worker API URL (local development)
WORKER_URL=http://localhost:8787

# OpenAI API Key (for AI tenant screening)
OPENAI_API_KEY=your_openai_api_key

# Session Secret (for cookie signing)
SESSION_SECRET=your_random_secret_at_least_32_chars_long

# Database IDs (from Cloudflare)
D1_DATABASE_ID=your_d1_database_id

# R2 Public URL (from Cloudflare)
R2_PUBLIC_URL=https://pub-your-r2-id.r2.dev
```

### 3. Run Database Migrations

```bash
cd apps/worker
npx wrangler d1 execute leaselab-db --local --file=migrations/0000_init_from_production.sql
npx wrangler d1 execute leaselab-db --local --file=migrations/0001_test_data.sql
cd ../..
```

### 4. Start Development Servers

```bash
# Run both worker and ops in parallel
npm run dev

# Or run individually
npm run dev:worker   # http://localhost:8787 (Worker API)
npm run dev:ops      # http://localhost:5173 (Ops Dashboard)
```

### 5. Access the Admin Dashboard

1. Open http://localhost:5173
2. Login with test credentials:
   - Email: `admin@leaselab.io`
   - Password: `password123`

## Development

### Workspace Scripts

```bash
# Development
npm run dev              # Run worker + ops in parallel
npm run dev:worker       # Run worker API only
npm run dev:ops          # Run ops dashboard only

# Building
npm run build            # Build all apps
npm run build:ops        # Build ops dashboard

# Type Checking
npm run typecheck        # Check types in all apps

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
```

### Database Operations

```bash
# Local development database
cd apps/worker
npx wrangler d1 execute leaselab-db --local --command "SELECT * FROM properties"

# Production database
npx wrangler d1 execute leaselab-db --command "SELECT * FROM properties"

# Run migration
npx wrangler d1 execute leaselab-db --local --file=migrations/0000_init_from_production.sql
```

### Working with Shared Packages

Shared packages are imported using relative paths:

```typescript
// In apps/worker or apps/ops
import type { Property, Unit, Lead } from '../../shared/types';
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';
import { API_ROUTES } from '../../shared/config';
```

### Adding New Features

When adding new features, follow this order:

1. **Define types** in `shared/types/index.ts`
2. **Add Zod schemas** in `shared/config/index.ts`
3. **Create DB operations** in `apps/worker/lib/db/` (MUST include `site_id` filtering)
4. **Add API routes** in `apps/worker/routes/`
5. **Create UI** in `apps/ops/app/routes/`

Example DB operation:

```typescript
// apps/worker/lib/db/properties.ts
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

## Deployment

### Prerequisites

1. Authenticate with Cloudflare:

```bash
wrangler login
```

2. Create Cloudflare resources:

```bash
# Create D1 database
wrangler d1 create leaselab-db

# Create R2 buckets
wrangler r2 bucket create leaselab-pub    # Public assets
wrangler r2 bucket create leaselab-pri    # Private documents
```

3. Update `apps/worker/wrangler.toml` with your database and bucket IDs.

### Deploy Worker API

```bash
cd apps/worker

# Run migrations on production database
npx wrangler d1 execute leaselab-db --file=migrations/0000_init_from_production.sql

# Deploy worker
npx wrangler deploy
```

### Deploy Ops Dashboard

```bash
cd apps/ops

# Build the app
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy ./build/client --project-name=leaselab-ops
```

### Environment Variables (Production)

Set production secrets using Wrangler:

```bash
# Worker API secrets
cd apps/worker
npx wrangler secret put OPENAI_API_KEY

# Ops app secrets
cd apps/ops
npx wrangler pages secret put SESSION_SECRET --project-name=leaselab-ops
npx wrangler pages secret put WORKER_URL --project-name=leaselab-ops
```

## Security Features

### Password Security

- **PBKDF2-SHA256** hashing with 100,000 iterations
- Random 16-byte salt per password
- Passwords stored as `salt:hash` in hex format
- Uses Web Crypto API (works in Node.js 19+ and Cloudflare Workers)

```typescript
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';

// Hashing
const hash = await hashPassword('plaintext');  // Returns "salt:hash"

// Verification
const isValid = await verifyPassword('plaintext', storedHash);
```

### API Token Security

- Site API tokens hashed using PBKDF2-SHA256
- Shared salt constant for deterministic token lookup
- Tokens verified via middleware in `apps/worker/middleware/auth.ts`

### Multi-Tenancy

- Every database query MUST filter by `site_id`
- Users can access multiple sites via `user_access` table
- Super admins can access any site with active API tokens
- Worker middleware enforces site isolation

## Database Schema

### Core Tables

**Multi-Tenancy:**
- `sites` - Site/tenant configuration
- `users` - User accounts with role-based access
- `user_access` - Many-to-many user-site relationships
- `site_api_tokens` - API tokens for site access (hashed)
- `sessions` - User session management

**Property Management:**
- `properties` - Property listings
- `units` - Individual rental units
- `unit_history` - Unit event tracking
- `images` - Property/unit images (R2 references)

**Lead Processing:**
- `leads` - Rental applications
- `lead_files` - Application documents
- `lead_ai_evaluations` - AI screening results
- `lead_history` - Lead event tracking

**Operations:**
- `tenants` - Current/past tenants
- `leases` - Lease agreements
- `work_orders` - Maintenance requests

All tables include `site_id` for multi-tenancy (except shared tables like `users`, `sessions`).

## File Upload/Download System

### Overview

The platform implements a secure file upload/download system with multi-layer validation:

**Download Workflow (Property Images):**
- Direct public URLs from R2 for SEO and CDN performance
- Images organized by property/unit with automatic URL generation
- Combined gallery: property images first, then unit images

**Upload Workflow (Applicant Files):**
- Multi-layer validation (5MB max per file, 10 files per application)
- Temporary storage before lead submission
- Automatic file association after lead creation
- Supported formats: PDF, JPG, PNG, HEIC, DOC, DOCX

### File Organization (R2)

```
PUBLIC_BUCKET (leaselab-pub):
  {siteId}/properties/{propertyId}/{imageId}.jpg    # Property photos
  {siteId}/units/{unitId}/{imageId}.jpg             # Unit photos

PRIVATE_BUCKET (leaselab-pri):
  {siteId}/leads/temp/{fileId}-{filename}           # Temporary uploads
  {siteId}/leads/{leadId}/{fileId}-{filename}       # Associated files
```

### File Upload Constraints

```typescript
FILE_UPLOAD_CONSTRAINTS = {
  maxFileSize: 5 * 1024 * 1024,    // 5MB per file
  maxFilesPerLead: 10,              // 10 files max per application
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};
```

### Multi-Layer Validation

1. **Layer 1:** Content-Length header check (before reading body)
2. **Layer 2:** MIME type whitelist validation
3. **Layer 3:** File object size check
4. **Layer 4:** Post-upload verification from R2

All layers enforce the 5MB limit to prevent oversized uploads.

## API Documentation

### Worker API Endpoints

**Health Check:**
```
GET /
```

**Public API** (for storefront):
```
GET  /api/public/properties              # List properties
GET  /api/public/properties/:id          # Get property with images (direct CDN URLs)
GET  /api/public/units/:id               # Get unit with combined gallery (property + unit images)
POST /api/public/leads/files/upload      # Upload applicant file (5MB limit)
POST /api/public/leads                   # Submit lead application (with optional fileIds)
```

**Ops API** (for admin dashboard):
```
POST /api/ops/properties                 # Property management
POST /api/ops/units                      # Unit management
POST /api/ops/leads                      # Lead management
GET  /api/ops/leads/:id/files            # Get lead files with signed URLs (24h expiry)
POST /api/ops/leads/:id/files            # Upload file for existing lead
POST /api/ops/leads/:id/ai               # Run AI evaluation
POST /api/ops/tenants                    # Tenant management
POST /api/ops/leases                     # Lease management
POST /api/ops/work-orders                # Work order management
POST /api/ops/images                     # Image management
```

All Ops API requests require:
- `Authorization: Bearer <token>` header
- `X-Site-Id: <site_id>` header
- `X-User-Id: <user_id>` header

### Example: File Upload Workflow

**1. Upload file (before lead submission):**
```bash
curl -X POST http://localhost:8787/api/public/leads/files/upload \
  -H "Authorization: Bearer <token>" \
  -H "X-Site-Id: site_123" \
  -F "file=@paystub.pdf" \
  -F "fileType=paystub"
```

Response:
```json
{
  "success": true,
  "data": {
    "fileId": "file_abc123",
    "fileName": "paystub.pdf",
    "fileSize": 245839,
    "fileType": "paystub",
    "uploadedAt": "2025-11-28T12:34:56Z"
  }
}
```

**2. Submit lead with uploaded files:**
```bash
curl -X POST http://localhost:8787/api/public/leads \
  -H "Authorization: Bearer <token>" \
  -H "X-Site-Id: site_123" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "employmentStatus": "employed",
    "moveInDate": "2025-12-01",
    "fileIds": ["file_abc123", "file_def456"]
  }'
```

**3. View files as ops admin (with signed URLs):**
```bash
curl http://localhost:8787/api/ops/leads/lead_123/files \
  -H "Authorization: Bearer <token>" \
  -H "X-Site-Id: site_123" \
  -H "X-User-Id: user_456"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "file_abc123",
      "fileName": "paystub.pdf",
      "fileType": "paystub",
      "fileSize": 245839,
      "signedUrl": "https://leaselab-pri.r2.dev/...?X-Amz-Signature=...",
      "expiresAt": "2025-11-29T12:34:56Z"
    }
  ]
}
```

### Example: Property Images

**Get property with images:**
```bash
curl http://localhost:8787/api/public/properties/prop_123 \
  -H "Authorization: Bearer <token>" \
  -H "X-Site-Id: site_123"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "prop_123",
    "name": "Sunset Apartments",
    "images": [
      {
        "id": "img_1",
        "url": "https://pub-abc.r2.dev/site1/properties/prop_123/img_1.jpg",
        "sortOrder": 0,
        "isCover": true,
        "altText": "Building exterior"
      }
    ]
  }
}
```

**Get unit with combined gallery (property + unit images):**
```bash
curl http://localhost:8787/api/public/units/unit_456 \
  -H "Authorization: Bearer <token>" \
  -H "X-Site-Id: site_123"
```

Response includes property images first, then unit images, all with direct CDN URLs.

## Troubleshooting

### Database Issues

```bash
# Check local database
npx wrangler d1 execute leaselab-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# Check production database
npx wrangler d1 execute leaselab-db --command "SELECT name FROM sqlite_master WHERE type='table'"

# View recent leads
npx wrangler d1 execute leaselab-db --local --command "SELECT * FROM leads LIMIT 10"
```

### View Logs

```bash
# Worker logs
cd apps/worker
npx wrangler tail

# Ops deployment logs
cd apps/ops
npx wrangler pages deployment tail --project-name=leaselab-ops
```

### Reset Local Database

```bash
cd apps/worker
rm -rf .wrangler/state
npx wrangler d1 execute leaselab-db --local --file=migrations/0000_init_from_production.sql
npx wrangler d1 execute leaselab-db --local --file=migrations/0001_test_data.sql
```

### Common Issues

**"Module not found" errors:**
- Run `npm install` in the root directory
- Make sure you're using Node.js 18+

**Type errors in shared packages:**
- Run `npm run typecheck` to identify issues
- Check that imports use correct relative paths

**Database connection errors:**
- Make sure wrangler is running in local mode
- Check that D1 database ID is correct in `wrangler.toml`

**Authentication errors:**
- Verify `SESSION_SECRET` is set in environment
- Check that cookies are being set correctly
- Ensure site API tokens are active in database

## Tech Stack

- **Remix** - Full-stack React framework
- **Hono** - Fast web framework for Cloudflare Workers
- **Cloudflare Workers** - Serverless compute platform
- **Cloudflare D1** - Serverless SQLite database
- **Cloudflare R2** - Object storage (S3-compatible)
- **Cloudflare Pages** - JAMstack hosting platform
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zod** - TypeScript-first schema validation
- **Vitest** - Fast unit testing framework

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing code structure and patterns
- Run `npm run typecheck` before committing
- Add Zod schemas for all API inputs
- Include `site_id` filtering in all DB queries

### Security Guidelines

- Never store plaintext passwords or tokens
- Always use `hashPassword()` for passwords
- Always use `hashToken()` for API tokens
- Filter all queries by `site_id`
- Validate all user input with Zod schemas
- Use parameterized queries to prevent SQL injection
- Enforce file upload limits (5MB max, MIME type whitelist)
- Use signed URLs for private file access (24-hour expiry)
- Store sensitive files in PRIVATE_BUCKET, never PUBLIC_BUCKET

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Create an issue in the repository
- Contact the development team

---

**Built with ❤️ using Cloudflare's edge platform**

Last updated: 2025-11-28

## Documentation

### For Developers & AI Agents
**Technical reference, API docs, and implementation guidelines**

📂 [`.claude/`](.claude/) - AI Agent & Developer Reference
- [**DEVELOPMENT_GUIDE.md**](.claude/DEVELOPMENT_GUIDE.md) - Primary technical reference
- [**BACKEND_API.md**](.claude/BACKEND_API.md) - Complete API documentation
- [**CODEBASE_ANALYSIS.md**](.claude/CODEBASE_ANALYSIS.md) - Code structure analysis
- [**Skills**](.claude/skills/) - AI agent guidelines (multi-tenancy, security, patterns)

### For Product & Design
**Architecture, PRDs, and project planning**

📂 [`docs/`](docs/) - Design Documentation
- [**ARCHITECTURE_SUMMARY.md**](docs/ARCHITECTURE_SUMMARY.md) - System architecture overview
- [**TODO.md**](docs/TODO.md) - Current development tasks
- [**PRD Documents**](docs/) - Product requirements (PRD-*.md)
- [**Migration Guides**](docs/) - Historical migrations (*_MIGRATION.md)

### Quick Links
- 🚀 [Getting Started for Developers](.claude/DEVELOPMENT_GUIDE.md)
- 🏗️ [System Architecture](docs/ARCHITECTURE_SUMMARY.md)
- 📋 [Active Tasks](docs/TODO.md)
- 🔐 [Security Guidelines](.claude/skills/security-guidelines.md)
- 🏢 [Multi-Tenancy Guidelines](.claude/skills/multi-tenancy-guidelines.md)
