# LeaseLab Documentation

**Last Updated**: 2025-12-17

Welcome to the LeaseLab documentation. This directory contains all technical documentation organized by feature and initiative.

---

## 📚 Documentation Structure

Most documentation follows a **consistent pattern**:

```
feature-name/
├── 00-SUMMARY.md           ⭐ Start here - quick reference
├── 01-*.md                 Detailed docs (PRDs, specs)
├── 02-*.md                 Additional details
├── tasks/                  Implementation task guides (if applicable)
│   ├── README.md
│   └── task-*.md
└── archive/                Deprecated designs (if applicable)
```

**Directory Naming Convention**:
- Prefix every feature folder under `docs/features/` with the targeted release month using `YYYYMM-` (e.g., `202512-ai-tenant-intelligence/`) so sorting reveals the latest initiatives first.

> Some initiatives consolidate the summary, architecture snapshot, and implementation checklist into a single `README.md` (e.g., `202512-ai-tenant-intelligence/`). Follow the pattern that keeps context lightest for the team.

**File Naming Convention**:
- `00-SUMMARY.md` - Preferred entry point for a feature (or a consolidated `README.md` if explicitly noted)
- `01-`, `02-`, etc. - Detailed documentation in logical order
- `task-*.md` - Implementation task guides
- Lower case, hyphen-separated for consistency

**Folder Naming Convention**:
- Feature/initiative directories under `docs/` start with `YYYYMM-` (e.g., `202511-file-storage`) so sorting shows the freshest work first
- Always apply the current year + month prefix when creating a new folder

---

## 🎯 Features & Initiatives

### Active Features

| Feature | Status | Summary | Details |
|---------|--------|---------|---------|
| **[shadcn/ui Integration](./features/202512-shadcn-ui-integration/)** | ✅ Implemented | UI component library with Tailwind v4 | [00-SUMMARY.md](./features/202512-shadcn-ui-integration/00-SUMMARY.md) |
| **[AI Tenant Intelligence](./features/202512-ai-tenant-intelligence/)** | 🚧 In Progress | Automated tenant screening with AI | [README.md](./features/202512-ai-tenant-intelligence/README.md) |
| **[Application Progress Workflow](./features/202512-application-progress-workflow/)** | 🚧 In Progress | Stage-gated property-centric screening flow | [00-SUMMARY.md](./features/202512-application-progress-workflow/00-SUMMARY.md) |
| **[2026-01 Next Batch Features](./features/202601-next-batch/)** | 📝 Draft | Email, notices scheduling, tenant portal, RBAC, owner intelligence | [README.md](./features/202601-next-batch/README.md) |
| **[File Storage & Upload](./features/202511-file-storage/)** | ✅ Implemented | R2-based file management | [00-SUMMARY.md](./features/202511-file-storage/00-SUMMARY.md) |
| **[Property Management](./features/202511-property-management/)** | ✅ Implemented | Property & unit data model | [00-SUMMARY.md](./features/202511-property-management/00-SUMMARY.md) |
| **[Auth & Sessions](./features/202511-auth-session/)** | ✅ Implemented | Signed cookie authentication | [00-SUMMARY.md](./features/202511-auth-session/00-SUMMARY.md) |

### Infrastructure

| Component | Summary | Details |
|-----------|---------|---------|
| **[Infrastructure & Deployment](./infrastructure/)** | System architecture & CI/CD | [00-SUMMARY.md](./infrastructure/00-SUMMARY.md) |

---

## 🚀 Quick Start Guides

### For New Engineers

1. **Understand the system**: Read [Infrastructure Summary](./infrastructure/00-SUMMARY.md)
2. **Pick a feature**: Choose from the table above
3. **Read the summary**: Most features use `00-SUMMARY.md` (AI Tenant Intelligence uses `README.md`)
4. **Dive deeper**: Follow links to detailed docs or task guides

### For Product/Business

1. **Read feature summaries**: All `00-SUMMARY.md` (or consolidated READMEs) are non-technical
2. **Review costs & metrics**: Each summary includes this info
3. **Check PRDs**: Detailed requirements in `01-prd-*.md` files

### For Implementation

1. **Read the feature’s entry doc**: `00-SUMMARY.md` or README, depending on the folder
2. **Follow task guides**: If available in `tasks/` directory
3. **Reference detailed docs**: As needed during implementation

---

## 📖 Documentation by Type

### Summaries (Start Here)
Every feature exposes a quick-entry doc—most use `00-SUMMARY.md`, while some (like AI Tenant Intelligence) consolidate everything into `README.md`. These files always include:
- 30-second overview
- Architecture diagram
- Quick reference
- Links to detailed docs

### PRDs (Product Requirements)
Comprehensive product specifications:
- [AI Tenant Intelligence PRD](./features/202512-ai-tenant-intelligence/01-prd-complete.md)
- [File Upload/Download PRD](./features/202511-file-storage/01-prd-file-upload-download.md)
- [Storage Abstraction PRD](./features/202511-file-storage/02-prd-storage-abstraction.md)
- [Property Management PRD](./features/202511-property-management/01-prd-property-unit-management.md)

### Architecture Docs
Technical deep dives:
- [System Architecture](./infrastructure/00-architecture-overview.md)
- [AI Tenant Intelligence Architecture Snapshot](./features/202512-ai-tenant-intelligence/README.md#architecture-snapshot-cron-worker)

### Task Guides (Implementation)
Step-by-step implementation:
- [AI Tenant Intelligence Tasks](./features/202512-ai-tenant-intelligence/tasks/)

### Migration History
See [archive/completed-migrations/](./archive/completed-migrations/) for:
- Worker migration logs
- Session cookie migration
- R2 bucket migration
- Deployment status logs

---

## 🎓 Documentation Principles

This documentation follows these principles:

1. **Progressive Disclosure**: Summary → Details → Deep dive
2. **Consistent Structure**: Every feature follows the same overall pattern (with explicit exceptions noted)
3. **Standalone Entry Docs**: Each feature's entry doc (`00-SUMMARY.md` or README) is self-contained
4. **Minimal Context**: Load only what you need
5. **Clear Naming**: Numeric prefixes show reading order

---

## 📁 Directory Structure

```
docs/
├── README.md                          # This file (repo-level index)
│
├── features/                          # Feature-specific documentation (prefix folders with YYYYMM-)
│   ├── 202512-ai-tenant-intelligence/ # AI screening feature
│   │   ├── README.md                  # ⭐ Start here (consolidated)
│   │   ├── 01-prd-complete.md
│   │   ├── tasks/                     # Implementation guides
│   │   │   ├── ai-task-1.1-database-schema.md
│   │   │   ├── ai-task-1.2-cron-worker-setup.md
│   │   │   └── ... (6 task files total)
│   │   └── archive/                   # Deprecated designs
│   │       ├── deprecated-queue-architecture.md
│   │       └── deprecated-workflow-architecture.md
│   │
│   ├── 202511-file-storage/           # File upload/download
│   │   ├── 00-SUMMARY.md              # ⭐ Start here
│   │   ├── 01-prd-file-upload-download.md
│   │   └── 02-prd-storage-abstraction.md
│   │
│   ├── 202511-property-management/    # Property & unit management
│   │   ├── 00-SUMMARY.md              # ⭐ Start here
│   │   └── 01-prd-property-unit-management.md
│   │
│   └── 202511-auth-session/           # Authentication & sessions
│       └── 00-SUMMARY.md              # ⭐ Start here
│
├── infrastructure/                    # System-wide infrastructure
│   ├── 00-SUMMARY.md                  # ⭐ Start here
│   ├── 00-architecture-overview.md
│   └── 01-ci-cd-strategy.md
│
└── archive/                           # Historical reference
    └── completed-migrations/          # Completed migration logs
        ├── r2-bucket-migration.md
        ├── session-cookie-migration.md
        ├── ops-migration-guide.md
        ├── worker-migration.md
        └── deployment-status.md
```

---

## 🔍 Finding Documentation

### By Feature
1. Go to `features/{yyyymm}-{feature-name}/`
2. Open the entry doc (`00-SUMMARY.md` or README per folder)
3. Follow links to detailed docs

### By Topic
- **Architecture**: [infrastructure/00-architecture-overview.md](./infrastructure/00-architecture-overview.md)
- **Deployment**: [infrastructure/01-ci-cd-strategy.md](./infrastructure/01-ci-cd-strategy.md)
- **AI Screening**: [features/202512-ai-tenant-intelligence/README.md](./features/202512-ai-tenant-intelligence/README.md)
- **File Storage**: [features/202511-file-storage/00-SUMMARY.md](./features/202511-file-storage/00-SUMMARY.md)

### By Status
- **In Progress**: [AI Tenant Intelligence](./features/202512-ai-tenant-intelligence/)
- **Implemented**: [File Storage](./features/202511-file-storage/), [Property Management](./features/202511-property-management/), [Auth](./features/202511-auth-session/)
- **Completed Migrations**: [archive/completed-migrations/](./archive/completed-migrations/)

---

## ✍️ Contributing Documentation

When adding new documentation:

1. **Create feature directory**: `features/{yyyymm}-{feature-name}/` (example: `features/202511-file-storage/`)
2. **Start with summary**: Create `00-SUMMARY.md` (or a consolidated `README.md` if you're intentionally merging docs) using the template below
3. **Add detailed docs**: Number sequentially (`01-`, `02-`, etc.)
4. **Update this README**: Add to the features table

### Summary Template

```markdown
# {Feature Name} - Quick Reference

**Status**: {In Progress | Implemented | Deprecated}
**Last Updated**: YYYY-MM-DD

---

## 🎯 What It Does

{1-2 sentence description}

**Key Features**:
- ✅ Feature 1
- ✅ Feature 2

---

## 🏗️ Architecture (30-Second Overview)

{Simple diagram or flow}

**Why this works**: {Brief rationale}

---

## 📄 Documentation

| Document | Purpose |
|----------|---------|
| [01-prd-*.md](./01-prd-*.md) | {Description} |

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **{Aspect}** | {Choice} | {Why} |

---

**Status**: {Summary of current state}
```

---

## 📞 Need Help?

- **Can't find what you're looking for?** Check the [directory structure](#-directory-structure) above
- **Want to implement a feature?** Look for `tasks/` directories
- **Need architecture context?** Start with [infrastructure/00-SUMMARY.md](./infrastructure/00-SUMMARY.md)

---

**Documentation follows the "summary → breakdown" pattern for optimal vibe coding**
