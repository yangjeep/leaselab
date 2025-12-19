# Infrastructure & Deployment - Quick Reference

**Status**: Production-ready
**Last Updated**: 2025-12-17

---

## 🎯 What It Is

Core infrastructure documentation for the LeaseLab monorepo, including architecture, deployment, and CI/CD.

---

## 📄 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [00-architecture-overview.md](./00-architecture-overview.md) | System architecture & app responsibilities | Understanding overall system design |
| [01-ci-cd-strategy.md](./01-ci-cd-strategy.md) | GitHub Actions deployment workflow | Setting up or debugging deployments |

---

## 🏗️ Architecture (30-Second Overview)

```
┌─────────────┐         ┌─────────────┐
│  apps/site  │         │  apps/ops   │
│  (Public)   │         │  (Admin)    │
│             │         │             │
│ NO BINDINGS │         │ NO BINDINGS │
│ 100% API    │         │ Signed      │
│             │         │ Cookies     │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │  /api/public/*        │  /api/ops/*
       │                       │
       └───────┬───────────────┘
               ▼
        ┌──────────────┐
        │ leaselab-    │
        │   worker     │
        │  (Backend)   │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ D1 Database  │
        │ R2 Storage   │
        └──────────────┘
```

**Key Principles**:
- ✅ **Pages apps have NO bindings** - 100% API-driven
- ✅ **Worker is single source of truth** for all data access
- ✅ **Stateless frontends** - all state in backend

---

## 🚀 Deployment Strategy

### Environments

| Environment | Trigger | URLs |
|-------------|---------|------|
| **Production** | Release published | `leaselab-worker.yangjeep.workers.dev`<br>`leaselab-ops.pages.dev`<br>`leaselab-site.pages.dev` |
| **Preview (PR)** | Pull request opened | `leaselab-worker-preview.yangjeep.workers.dev`<br>`preview-{PR}.leaselab-ops.pages.dev` |
| **Preview (main)** | Push to main | `leaselab-worker-preview.yangjeep.workers.dev`<br>`preview-main.leaselab-ops.pages.dev` |

### Deployment Order

```
1. Worker deploys first (both apps depend on it)
2. Ops + Site deploy in parallel
```

---

## 📦 App Responsibilities

### apps/site (Public Storefront)
- Display property listings
- Accept tenant applications
- **Auth**: Bearer token
- **APIs**: `/api/public/*`

### apps/ops (Admin Dashboard)
- Property/tenant/lead management
- **Auth**: Signed cookies
- **APIs**: `/api/ops/*`

### apps/worker (Backend API)
- All database access (D1)
- All file storage (R2)
- Business logic
- **Bindings**: D1, R2, Workers AI

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | API-driven, no bindings in Pages apps | Simplifies deployment, clear separation |
| **Worker Pattern** | Single worker for all APIs | Simpler than multiple workers |
| **Database** | Cloudflare D1 (SQLite) | Serverless, cost-effective |
| **Storage** | Cloudflare R2 | S3-compatible, cheap egress |
| **CI/CD** | GitHub Actions | Native integration, good DX |

---

## 📚 Related Documentation

- **Migrations**: See [archive/completed-migrations/](../archive/completed-migrations/)
  - Worker migration history
  - Deployment status logs
  - Migration guides

---

**Status**: ✅ Production-ready, fully automated CI/CD
