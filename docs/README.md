# LeaseLab.io - Design Documentation

This directory contains high-level design documents, product requirements, architecture decisions, and project planning materials for the LeaseLab platform. These docs are written for **human readers** - product managers, architects, and developers.

> **For AI Agents & Technical Reference:** See [`.claude/`](../.claude/) directory

## 📁 Directory Structure

```
docs/
├── README.md                           # This file
├── TODO.md                             # Active development tasks
├── ARCHITECTURE_SUMMARY.md             # High-level system architecture
├── DEPLOYMENT_STATUS.md                # Deployment tracking and status
├── CI_CD_STRATEGY.md                   # CI/CD pipeline design
├── PRD-*.md                            # Product requirement documents
├── *_MIGRATION.md                      # Migration guides and history
└── archive_*.md                        # Historical/completed documents
```

## 📋 Active Development

### [TODO.md](TODO.md)
**Current development priorities and task tracking**

Contains:
- Active feature development tasks
- Completed work items
- Implementation status

**Use this when:**
- Planning sprint work
- Tracking progress
- Reviewing what's been built

## 🏗️ Architecture & Design

### [ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md)
**High-level system architecture overview**

Contains:
- System components (Worker API, Ops Admin, Site Storefront)
- Technology stack decisions
- Data flow diagrams
- Infrastructure design

**Use this when:**
- Understanding the overall system
- Making architectural decisions
- Onboarding new team members

### [CI_CD_STRATEGY.md](CI_CD_STRATEGY.md)
**Continuous integration and deployment strategy**

Contains:
- Build pipeline design
- Deployment workflows
- Environment management
- Testing strategy

**Use this when:**
- Setting up CI/CD
- Troubleshooting deployments
- Planning release processes

### [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
**Current deployment status and environment info**

Contains:
- Production/staging URLs
- Environment configurations
- Deployment history
- Known issues

**Use this when:**
- Checking what's deployed
- Verifying environment status
- Tracking deployment history

## 📝 Product Requirements

### PRD Documents
Product requirement documents defining features and functionality:

- **[PRD-property-unit-management.md](PRD-property-unit-management.md)**
  - Property and unit CRUD operations
  - Image management
  - Multi-unit property support

- **[PRD-Storage-Abstraction-Layer.md](PRD-Storage-Abstraction-Layer.md)**
  - Storage interface design
  - R2 implementation
  - File management patterns

- **[PRD-File-Upload-Download.md](PRD-File-Upload-Download.md)**
  - File upload workflows
  - Download and viewing
  - Security considerations

**Use these when:**
- Understanding feature requirements
- Planning new features
- Reviewing business logic

## 🔄 Migration Guides

Historical migration documentation:

- **[OPS_MIGRATION_GUIDE.md](OPS_MIGRATION_GUIDE.md)**
  - Ops app migration from monolith
  - Route structure changes
  - Component updates

- **[WORKER_MIGRATION.md](WORKER_MIGRATION.md)**
  - Worker API refactoring
  - Database operation patterns
  - API endpoint changes

- **[SESSION_COOKIE_MIGRATION.md](SESSION_COOKIE_MIGRATION.md)**
  - Session management changes
  - Cookie configuration
  - Authentication updates

- **[R2_BUCKET_MIGRATION.md](R2_BUCKET_MIGRATION.md)**
  - R2 storage setup
  - File migration process
  - Bucket configuration

**Use these when:**
- Understanding past architectural changes
- Troubleshooting legacy issues
- Planning similar migrations

## 📦 Archived Documents

Documents in `archive_*` format are historical and no longer actively maintained but kept for reference:

- `archive_MIGRATION_NOTES_lead_notes_history.md` - Lead notes implementation
- `archive_DEPLOYMENT_COMPLETE.md` - Completed deployment records
- `archive_plan-applicantNotesHistory.prompt.md` - Planning documents
- `archive_IMPLEMENTATION_SUMMARY.md` - Implementation summaries
- `archive_task.md` - Completed task lists

## 🎯 Document Types

### Design Documents
High-level system design, architecture decisions, and technical planning.
- **Audience:** Architects, senior developers, product managers
- **Examples:** ARCHITECTURE_SUMMARY.md, CI_CD_STRATEGY.md

### Product Requirements
Feature specifications, business logic, and user stories.
- **Audience:** Product managers, developers, QA
- **Examples:** PRD-*.md files

### Migration Guides
Step-by-step guides for major system changes.
- **Audience:** Developers performing migrations
- **Examples:** *_MIGRATION.md files

### Status & Tracking
Current state, progress, and task management.
- **Audience:** Project managers, team leads
- **Examples:** TODO.md, DEPLOYMENT_STATUS.md

## 🔗 Related Documentation

### For AI Agents & Developers
Technical implementation details, API reference, and coding guidelines:
- **Location:** [`.claude/`](../.claude/)
- **Key files:**
  - `DEVELOPMENT_GUIDE.md` - Primary technical reference
  - `BACKEND_API.md` - Complete API documentation
  - `CODEBASE_ANALYSIS.md` - Code structure analysis
  - `skills/` - AI agent guidelines

### For End Users
User-facing documentation and help guides:
- **Location:** TBD (future: help.leaselab.io)

## ✍️ Contributing to Documentation

### Adding New Design Docs
1. Create file in `/docs/` with descriptive name
2. Use markdown format
3. Include table of contents for long docs
4. Add entry to this README
5. Link from related documents

### Updating Existing Docs
1. Update the content
2. Add "Last Updated" date at bottom
3. Document major changes in git commit message
4. Notify team of significant updates

### Archiving Completed Docs
1. Rename file with `archive_` prefix
2. Update references in other docs
3. Add entry to "Archived Documents" section
4. Keep file for historical reference

## 📊 Documentation Health

### Active Documents
Documents actively maintained and referenced:
- ✅ TODO.md
- ✅ ARCHITECTURE_SUMMARY.md
- ✅ DEPLOYMENT_STATUS.md
- ✅ All PRD-*.md files

### Periodic Review Needed
Documents that should be reviewed quarterly:
- ⚠️ CI_CD_STRATEGY.md
- ⚠️ Migration guides (*_MIGRATION.md)

### Historical Reference Only
Documents kept for context but not actively maintained:
- 📦 All archive_*.md files

## 🎓 Getting Started

### New Developers
1. Read [ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md)
2. Review [TODO.md](TODO.md) for current priorities
3. Check [`.claude/DEVELOPMENT_GUIDE.md`](../.claude/DEVELOPMENT_GUIDE.md) for technical details
4. Read relevant PRD documents for your work area

### Product Managers
1. Review all PRD-*.md files
2. Check [TODO.md](TODO.md) for development status
3. Reference [ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md) for technical context

### DevOps/Infrastructure
1. Read [CI_CD_STRATEGY.md](CI_CD_STRATEGY.md)
2. Review [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
3. Check migration guides for deployment patterns

---

**Last Updated:** 2024-12-02
**Maintained By:** Product & Engineering Teams
