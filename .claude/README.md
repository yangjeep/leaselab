# Claude Code Infrastructure for LeaseLab

This directory contains the Claude Code infrastructure integrated from the [claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase).

## 📁 Directory Structure

```
.claude/
├── README.md                           # This file (infrastructure guide)
├── DEVELOPMENT_GUIDE.md                # Main technical reference (AI/developer guide)
├── BACKEND_API.md                      # Complete Worker API reference
├── CODEBASE_ANALYSIS.md                # Codebase structure analysis
├── CENTRALIZED_CONFIG.md               # Configuration reference
├── settings.json                       # Hook configurations
├── settings.local.json                 # Local permissions
├── hooks/                              # Automation hooks
│   ├── skill-activation-prompt.sh      # Auto-suggest skills
│   ├── skill-activation-prompt.ts      # TypeScript implementation
│   └── post-tool-use-tracker.sh        # Track file edits
├── skills/                             # Development guidelines
│   ├── skill-rules.json                # Activation rules
│   ├── cloudflare-worker-guidelines.md # Hono + Workers patterns
│   ├── remix-frontend-guidelines.md    # Remix patterns
│   ├── multi-tenancy-guidelines.md     # ⚠️ Critical: site_id isolation
│   ├── security-guidelines.md          # ⚠️ Critical: auth/crypto
│   ├── d1-database-guidelines.md       # D1/SQLite patterns
│   ├── shared-types-guidelines.md      # TypeScript patterns
│   └── skill-developer.md              # Meta-skill for managing skills
├── agents/                             # Specialized agents (future)
└── commands/                           # Custom slash commands (future)
```

## 🎯 What This Does

### Auto-Activation System

The infrastructure automatically suggests relevant skills based on:
- **Keywords in prompts** (e.g., "create API endpoint" → cloudflare-worker-guidelines)
- **Files being edited** (e.g., apps/worker/lib/db/*.ts → multi-tenancy-guidelines)
- **Intent patterns** (e.g., "add password hashing" → security-guidelines)

### Critical Guardrails (Block Enforcement)

**multi-tenancy-guidelines:**
- Enforces `site_id` filtering in ALL database operations
- Prevents data leaks between sites
- Type: Guardrail, Priority: Critical

**security-guidelines:**
- Enforces proper password hashing (PBKDF2-SHA256)
- Enforces API token hashing
- Prevents security vulnerabilities
- Type: Guardrail, Priority: Critical

### Domain Skills (Suggest Enforcement)

**cloudflare-worker-guidelines:**
- Hono + Cloudflare Workers patterns
- D1 database operations
- R2 storage operations

**remix-frontend-guidelines:**
- Remix route patterns (loaders/actions)
- Worker API client usage
- Session management

**d1-database-guidelines:**
- Database migration patterns
- Schema design for multi-tenancy
- Query optimization

**shared-types-guidelines:**
- TypeScript type patterns
- Zod schema usage
- Type safety best practices

**skill-developer:**
- Meta-skill for managing the skill system
- How to create/modify skills
- Hook development

## 🚀 How It Works

### 1. User Prompt Hook (UserPromptSubmit)

**When:** Before Claude responds to your prompt

**What it does:**
1. Analyzes your prompt for keywords and patterns
2. Loads skill-rules.json
3. Matches against prompt triggers
4. Suggests relevant skills

**Example:**
```
You: "Create a new API endpoint to get all properties"

Hook detects: "api endpoint", "properties"
Suggests: cloudflare-worker-guidelines, multi-tenancy-guidelines

Claude: [Loads skills before responding]
```

### 2. Post Tool Use Hook (PostToolUse)

**When:** After Edit, Write, or MultiEdit tool is used

**What it does:**
1. Tracks which files were edited
2. Detects which app/package (worker, ops, site, shared)
3. Logs to `.claude/tsc-cache/{session}/edited-files.log`
4. Stores build/typecheck commands for later

**Example:**
```
You: [Edit apps/worker/lib/db/properties.ts]

Hook detects: apps/worker/lib/db/**/*.ts
Logs: Property database operations modified
Suggests: Run TypeScript check
```

## 📝 Skill Activation Examples

### Example 1: Database Operations

```
You: "Add a new field to the properties table"

Auto-activates:
- multi-tenancy-guidelines (CRITICAL - ensures site_id handling)
- d1-database-guidelines (migration patterns)
- cloudflare-worker-guidelines (database operations)
```

### Example 2: Authentication

```
You: "Implement user password reset"

Auto-activates:
- security-guidelines (CRITICAL - password hashing)
- cloudflare-worker-guidelines (API route patterns)
```

### Example 3: Frontend Development

```
You: "Create a new page to manage work orders"

Auto-activates:
- remix-frontend-guidelines (route patterns)
- shared-types-guidelines (TypeScript types)
```

### Example 4: File-Based Activation

```
You: [Edit apps/worker/middleware/auth.ts]

Auto-activates:
- security-guidelines (CRITICAL - token handling)
- cloudflare-worker-guidelines (middleware patterns)
```

## 🔧 Configuration

### Hook Configuration (settings.json)

```json
{
  "hooks": {
    "UserPromptSubmit": {
      "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.sh"
    },
    "PostToolUse": {
      "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use-tracker.sh",
      "matchers": ["Edit", "MultiEdit", "Write"]
    }
  },
  "acceptEdits": true
}
```

### Skill Rules (skill-rules.json)

Each skill has:
- **type** - "domain" (best practices) or "guardrail" (critical rules)
- **enforcement** - "suggest", "warn", or "block"
- **priority** - "critical", "high", "medium", "low"
- **promptTriggers** - Keywords and intent patterns
- **fileTriggers** - File path patterns

## 🧪 Testing the Integration

### 1. Test Skill Activation by Keywords

Try these prompts and verify the suggested skills:

```bash
# Should suggest: cloudflare-worker-guidelines, multi-tenancy-guidelines
"Create a new API endpoint to get all units"

# Should suggest: security-guidelines
"Add password hashing to user creation"

# Should suggest: d1-database-guidelines
"Create a migration to add a new column"

# Should suggest: remix-frontend-guidelines
"Create a new page for the ops dashboard"
```

### 2. Test Skill Activation by File Editing

Edit these files and check for skill suggestions:

```bash
# Should trigger: multi-tenancy-guidelines, security-guidelines
apps/worker/lib/db/users.ts

# Should trigger: remix-frontend-guidelines
apps/ops/app/routes/properties._index.tsx

# Should trigger: d1-database-guidelines
apps/worker/migrations/0003_new_migration.sql

# Should trigger: shared-types-guidelines
shared/types/index.ts
```

### 3. Verify Hook Execution

```bash
# Check hook permissions (should be executable)
ls -la .claude/hooks/
# Expected: -rwxr-xr-x for .sh files

# Validate skill-rules.json syntax
jq empty .claude/skills/skill-rules.json
# Expected: No output (valid JSON)

# Check settings.json syntax
jq empty .claude/settings.json
# Expected: No output (valid JSON)
```

## 📚 Adapting from Showcase

This integration was adapted from the showcase repository with the following changes:

### Tech Stack Differences

**Showcase uses:**
- Express + Node.js
- React + MUI
- Prisma ORM

**LeaseLab uses:**
- Hono + Cloudflare Workers
- Remix + TailwindCSS
- D1 (SQLite)

### Adaptations Made

1. **Skills adapted for LeaseLab stack:**
   - cloudflare-worker-guidelines (instead of backend-dev-guidelines)
   - remix-frontend-guidelines (instead of frontend-dev-guidelines)
   - d1-database-guidelines (D1-specific patterns)

2. **New LeaseLab-specific skills:**
   - multi-tenancy-guidelines (critical for site_id isolation)
   - security-guidelines (PBKDF2 hashing, API tokens)
   - shared-types-guidelines (monorepo type patterns)

3. **Hooks customized:**
   - post-tool-use-tracker.sh adapted for apps/* structure
   - Removed showcase-specific hooks (tsc-check, trigger-build-resolver)

4. **Path patterns updated:**
   - `apps/worker/**/*.ts` (instead of backend/src/**/*.ts)
   - `apps/ops/app/**/*.tsx` (instead of frontend/src/**/*.tsx)
   - `shared/**/*.ts` (monorepo shared packages)

## 🛠️ Maintenance

### Adding a New Skill

1. Create skill content file in `.claude/skills/`
2. Add entry to `skill-rules.json`
3. Define prompt triggers (keywords + patterns)
4. Define file triggers (path patterns)
5. Test activation
6. Update this README

See [skill-developer.md](skills/skill-developer.md) for detailed instructions.

### Modifying an Existing Skill

1. Edit skill content file (`.md`)
2. Update triggers in `skill-rules.json` if needed
3. Test activation with new patterns
4. Document changes

### Troubleshooting

**Skill not activating:**
- Check keyword spelling in skill-rules.json
- Verify file path matches pathPatterns
- Ensure hooks are executable (`chmod +x`)
- Validate JSON syntax (`jq empty`)

**Too many skills suggested:**
- Make keywords more specific
- Narrow path patterns
- Adjust priority levels

**Hook not running:**
- Check file permissions (`ls -la .claude/hooks/`)
- Verify settings.json syntax
- Check Claude Code logs

## 📖 References

### Technical Documentation (AI/Developer Reference)
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - **Primary reference** - Complete development guide
- [BACKEND_API.md](BACKEND_API.md) - Complete Worker API documentation
- [CODEBASE_ANALYSIS.md](CODEBASE_ANALYSIS.md) - In-depth codebase structure
- [CENTRALIZED_CONFIG.md](CENTRALIZED_CONFIG.md) - Configuration and schemas

### Skill Guidelines
- [skill-developer.md](skills/skill-developer.md) - Meta-skill for managing skills
- [multi-tenancy-guidelines.md](skills/multi-tenancy-guidelines.md) - Critical: site_id isolation
- [security-guidelines.md](skills/security-guidelines.md) - Critical: auth/crypto
- [cloudflare-worker-guidelines.md](skills/cloudflare-worker-guidelines.md) - Worker patterns
- [remix-frontend-guidelines.md](skills/remix-frontend-guidelines.md) - Remix patterns
- [d1-database-guidelines.md](skills/d1-database-guidelines.md) - Database patterns
- [shared-types-guidelines.md](skills/shared-types-guidelines.md) - TypeScript patterns

### Design Documentation (Human Reference)
See [/docs/README.md](../docs/README.md) for architecture, PRDs, and project planning

### External Resources
- [Claude Code Infrastructure Showcase](https://github.com/diet103/claude-code-infrastructure-showcase)
- [Integration Guide](https://raw.githubusercontent.com/diet103/claude-code-infrastructure-showcase/refs/heads/main/CLAUDE_INTEGRATION_GUIDE.md)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)

## 🎓 Learning Resources

### Understanding the System

1. **Start here:** Read this README
2. **Learn skill system:** [skill-developer.md](skills/skill-developer.md)
3. **Explore a domain skill:** [cloudflare-worker-guidelines.md](skills/cloudflare-worker-guidelines.md)
4. **Study a guardrail:** [multi-tenancy-guidelines.md](skills/multi-tenancy-guidelines.md)

### Creating Your First Skill

1. Identify a pattern that needs documentation
2. Follow the process in skill-developer.md
3. Create skill content file (200-500 lines)
4. Add to skill-rules.json
5. Test activation
6. Iterate based on usage

## ✅ Integration Checklist

- [x] Created .claude directory structure
- [x] Installed essential hooks (skill-activation-prompt, post-tool-use-tracker)
- [x] Created skill-rules.json adapted for LeaseLab
- [x] Created critical guardrails (multi-tenancy, security)
- [x] Created domain skills (worker, remix, d1, shared-types)
- [x] Created meta-skill (skill-developer)
- [x] Configured settings.json with hooks
- [x] Made hooks executable
- [x] Validated JSON syntax
- [x] Documented integration (this README)

## 🔜 Future Enhancements

Potential additions:
- [ ] Custom agents for complex multi-step tasks
- [ ] Slash commands for common operations
- [ ] Stop hooks for build/typecheck automation
- [ ] Additional domain skills (testing, deployment, monitoring)
- [ ] Skill versioning and migration patterns

---

**Last Updated:** 2024-11-28
**Version:** 1.0
**Integration Status:** Complete ✅
