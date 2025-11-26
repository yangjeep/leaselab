# LeaseLab Deployment Status

**Last Updated**: 2025-11-26

## 🚀 Production Deployments

### ✅ leaselab-worker (Backend API)

**Status**: LIVE ✅
**URL**: https://leaselab-worker.yangjeep.workers.dev
**Version**: 1.0.0
**Deployed**: 2025-11-26

**Health Check**:
```bash
curl https://leaselab-worker.yangjeep.workers.dev/
# → {"status":"ok","service":"leaselab-worker","version":"1.0.0"}
```

**Bindings**:
- ✅ D1 Database: `leaselab-db` (850dc940-1021-4c48-8d40-0f18992424ac)
- ✅ R2 Bucket: `leaselab-files`

**Endpoints**:
- ✅ `GET /` - Health check
- ✅ `GET /api/public/properties` - List properties (Bearer token required)
- ✅ `GET /api/public/properties/:id` - Get property (Bearer token required)
- ✅ `GET /api/public/site-config` - Site configuration (Bearer token required)
- ✅ `POST /api/public/leads` - Submit lead (Bearer token required)
- ✅ `GET /api/ops/properties` - List properties (internal)
- ✅ `GET /api/ops/properties/:id` - Get property (internal)
- ✅ `POST /api/ops/properties` - Create/update property (internal)
- ✅ `GET /api/ops/units` - List units (internal)
- ✅ `GET /api/ops/units/:id` - Get unit (internal)
- ✅ `POST /api/ops/units` - Create/update unit (internal)
- ✅ `GET /api/ops/leads` - List leads (internal)
- ✅ `GET /api/ops/leads/:id` - Get lead (internal)
- ✅ `GET /api/ops/work-orders` - List work orders (internal)
- ✅ `POST /api/ops/work-orders` - Create/update work order (internal)

**Test Results**:
```bash
# ✅ Authentication works
curl -H "Authorization: Bearer sk_default_..." \
  https://leaselab-worker.yangjeep.workers.dev/api/public/properties
# → Returns 6 properties from production D1

# ✅ Ops API works
curl -H "X-Site-Id: default" \
  https://leaselab-worker.yangjeep.workers.dev/api/ops/properties
# → Returns 6 properties from production D1
```

---

### ⏳ apps/site (Public Storefront)

**Status**: CONFIGURED (needs deployment)
**Expected URL**: TBD
**Framework**: Remix + Cloudflare Pages

**Configuration**:
- ✅ `WORKER_URL` set to `https://leaselab-worker.yangjeep.workers.dev`
- ✅ API Token generated and stored in D1
- ✅ `.dev.vars` created for local development

**API Token**:
- Token ID: `token_4d19e63f83516331`
- Site ID: `default`
- Description: `Site Production Token`
- Created: 2025-11-26
- Status: Active

**Next Steps**:
1. Set `SITE_API_TOKEN` secret for production:
   ```bash
   cd apps/site
   wrangler pages secret put SITE_API_TOKEN
   # Paste: sk_default_1b3e1c8d88d5b5bbbe62b534c1262d002ace734852c9ebe7357302f2139a7634
   ```
2. Deploy to Cloudflare Pages
3. Test property listings on live site

---

### ⏳ apps/ops (Admin Dashboard)

**Status**: NOT MIGRATED YET
**Current**: Direct D1/R2 access
**Target**: Use worker API

**Configuration**:
- ⏳ Not configured yet
- ⏳ Needs `WORKER_URL` environment variable
- ⏳ Needs session migration to signed cookies

**Next Steps**:
1. Migrate sessions to signed cookies (see SESSION_COOKIE_MIGRATION.md)
2. Update routes to call worker API
3. Remove D1/R2 bindings
4. Deploy

---

## 🔑 API Tokens

### Production Tokens

| Token ID | Site ID | Description | Status | Created |
|----------|---------|-------------|--------|---------|
| token_412b8b4c5eb9d8e1 | default | Default site API token | Active | 2025-11-26 |
| token_4d19e63f83516331 | default | Site Production Token | Active | 2025-11-26 |

**Security Note**: Token values are only shown once during generation. Store securely!

---

## 📊 Database Status

### D1 Database (leaselab-db)

**Status**: LIVE ✅
**ID**: 850dc940-1021-4c48-8d40-0f18992424ac

**Data**:
- Properties: 6
- Units: Multiple
- Leads: Multiple
- API Tokens: 2

**Tables**:
- ✅ properties
- ✅ units
- ✅ leads
- ✅ lead_files
- ✅ lead_ai_evaluations
- ✅ work_orders
- ✅ tenants
- ✅ users
- ✅ user_access
- ✅ site_api_tokens
- ✅ site_configs

---

## 🗄️ R2 Storage

**Status**: CONFIGURED ✅
**Bucket**: `leaselab-files`

**Key Patterns**:
- `leads/{leadId}/{uniqueId}/{fileName}` - Lead documents
- `{siteId}/property/{propertyId}/{timestamp}-{filename}` - Property images
- `{siteId}/unit/{unitId}/{timestamp}-{filename}` - Unit images

---

## 🔐 Secrets Configuration

### Worker Secrets

```bash
cd apps/worker

# Optional: For AI evaluation
wrangler secret put OPENAI_API_KEY

# Optional: For internal auth (if using keyMiddleware)
wrangler secret put WORKER_INTERNAL_KEY
```

### Site Secrets

```bash
cd apps/site

# Required: API token for worker authentication
wrangler pages secret put SITE_API_TOKEN
# Value: sk_default_1b3e1c8d88d5b5bbbe62b534c1262d002ace734852c9ebe7357302f2139a7634
```

### Ops Secrets (Future)

```bash
cd apps/ops

# Required: Session cookie signing key
wrangler secret put SESSION_SECRET
# Value: Generate with: openssl rand -hex 32

# Optional: Worker internal auth
wrangler secret put WORKER_INTERNAL_KEY
```

---

## 🧪 Testing Commands

### Test Worker Endpoints

```bash
# Health check
curl https://leaselab-worker.yangjeep.workers.dev/

# Public API (with token)
curl -H "Authorization: Bearer sk_default_1b3e1c8d88d5b5bbbe62b534c1262d002ace734852c9ebe7357302f2139a7634" \
  https://leaselab-worker.yangjeep.workers.dev/api/public/properties

# Ops API (internal)
curl -H "X-Site-Id: default" \
  https://leaselab-worker.yangjeep.workers.dev/api/ops/properties
```

### Local Development

```bash
# Run worker locally
cd apps/worker
npx wrangler dev --port 8787 --local

# Run site locally (with .dev.vars)
cd apps/site
npm run dev

# Run ops locally
cd apps/ops
npm run dev
```

---

## 📝 Migration Progress

### Phase 1: Worker Implementation ✅
- [x] Install Hono
- [x] Create middleware (auth, internal)
- [x] Implement public API routes
- [x] Implement ops API routes
- [x] Deploy to production
- [x] Generate API token
- [x] Test endpoints

### Phase 2: Site Migration ⏳
- [x] Configure WORKER_URL
- [x] Configure SITE_API_TOKEN (local)
- [ ] Set SITE_API_TOKEN secret (production)
- [ ] Deploy site to production
- [ ] Test site → worker → D1 flow
- [ ] Remove direct D1 binding from site

### Phase 3: Ops Migration ⏳
- [ ] Migrate sessions to signed cookies
- [ ] Create worker-client.ts helper
- [ ] Update admin routes to use worker
- [ ] Remove D1/R2 bindings from ops
- [ ] Deploy ops

### Phase 4: Cleanup ⏳
- [ ] Remove old direct DB access code
- [ ] Update documentation
- [ ] Monitor performance
- [ ] Optimize as needed

---

## 🚨 Rollback Plan

If issues occur, rollback steps:

### Worker Rollback
```bash
cd apps/worker
wrangler rollback --message "Rolling back to previous version"
```

### Site Rollback
- Site still has D1 binding configured
- Can revert to direct D1 access if needed
- No breaking changes yet

### Ops Rollback
- Not migrated yet, no rollback needed

---

## 📈 Next Steps

1. **Deploy apps/site to production**
   - Set SITE_API_TOKEN secret
   - Deploy to Cloudflare Pages
   - Test property listings

2. **Migrate apps/ops sessions**
   - Follow SESSION_COOKIE_MIGRATION.md
   - Replace KV with signed cookies
   - Remove KV binding

3. **Complete ops migration**
   - Implement all ops API routes in worker
   - Update ops to use worker
   - Remove D1/R2 bindings

4. **Monitor and optimize**
   - Track API latency
   - Monitor error rates
   - Optimize slow queries

---

**For detailed migration guides, see**:
- [WORKER_MIGRATION.md](./WORKER_MIGRATION.md)
- [SESSION_COOKIE_MIGRATION.md](./SESSION_COOKIE_MIGRATION.md)
- [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)
