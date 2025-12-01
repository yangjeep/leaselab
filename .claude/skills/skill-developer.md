# Skill Developer - Meta Skill for Managing Claude Code Skills

**Type:** Domain Skill (Meta)
**Priority:** High - Use this skill when creating or modifying Claude Code skills

## Overview

This meta-skill helps you create, modify, and manage Claude Code skills for the LeaseLab project.

## Skill System Architecture

### 1. Components

```
.claude/
├─ skills/
│  ├─ skill-rules.json                    # Skill activation rules
│  ├─ cloudflare-worker-guidelines.md     # Worker/Hono patterns
│  ├─ remix-frontend-guidelines.md        # Remix patterns
│  ├─ multi-tenancy-guidelines.md         # Critical: site_id isolation
│  ├─ security-guidelines.md              # Critical: password/token security
│  ├─ d1-database-guidelines.md           # D1/SQLite patterns
│  ├─ shared-types-guidelines.md          # TypeScript types
│  └─ skill-developer.md                  # This file
├─ hooks/
│  ├─ skill-activation-prompt.sh          # Auto-suggest skills
│  ├─ skill-activation-prompt.ts          # TypeScript implementation
│  └─ post-tool-use-tracker.sh            # Track file edits
├─ agents/                                # Specialized agents (future)
└─ commands/                              # Custom slash commands (future)
```

### 2. How Skills Activate

**Automatic Activation via Hooks:**
1. User types a prompt (e.g., "Create a new API endpoint")
2. `skill-activation-prompt.sh` hook runs
3. Matches keywords/patterns in `skill-rules.json`
4. Suggests relevant skills before Claude responds
5. Claude uses Skill tool to load guidelines

**Manual Activation:**
- Use `@skill-name` in your prompt
- Or specify when creating new features

## Skill Rules Configuration

### 1. skill-rules.json Structure

```json
{
  "version": "1.0.0",
  "skills": {
    "skill-name": {
      "type": "domain | guardrail",
      "enforcement": "block | suggest | warn",
      "priority": "critical | high | medium | low",
      "promptTriggers": {
        "keywords": ["keyword1", "keyword2"],
        "intentPatterns": ["regex1", "regex2"]
      },
      "fileTriggers": {
        "pathPatterns": ["glob1", "glob2"],
        "excludePatterns": ["exclude1"]
      }
    }
  }
}
```

### 2. Skill Types

**Domain Skill:**
- Provides best practices and patterns
- Enforcement: `suggest` or `warn`
- Example: cloudflare-worker-guidelines, remix-frontend-guidelines

**Guardrail Skill:**
- Enforces critical rules
- Enforcement: `block` (must acknowledge before proceeding)
- Example: multi-tenancy-guidelines, security-guidelines

### 3. Priority Levels

- **critical** - Must be acknowledged (guardrails)
- **high** - Strongly recommended (domain-specific patterns)
- **medium** - Helpful suggestions
- **low** - Optional reference

### 4. Trigger Types

**Prompt Triggers:**
- `keywords` - Simple string matching (case-insensitive)
- `intentPatterns` - Regex patterns for intent detection

**File Triggers:**
- `pathPatterns` - Glob patterns for file paths
- `excludePatterns` - Files to exclude (e.g., tests)

## Creating a New Skill

### 1. Process

```typescript
// Step 1: Create skill content file
// .claude/skills/new-skill-name.md

# Skill Title

**Type:** Domain | Guardrail
**Priority:** Critical | High | Medium | Low

## Overview
Brief description of what this skill covers

## Key Patterns
Main guidelines and patterns

## Examples
Code examples showing correct usage

## Common Mistakes
Anti-patterns to avoid

## References
Links to related files and documentation
```

```json
// Step 2: Add to skill-rules.json
{
  "skills": {
    "new-skill-name": {
      "type": "domain",
      "enforcement": "suggest",
      "priority": "medium",
      "promptTriggers": {
        "keywords": ["relevant", "keywords"],
        "intentPatterns": ["pattern.*regex"]
      },
      "fileTriggers": {
        "pathPatterns": ["path/to/**/*.ts"],
        "excludePatterns": ["**/*.test.ts"]
      }
    }
  }
}
```

```bash
# Step 3: Test activation
# Edit a file matching pathPatterns
# Or use keywords in a prompt
# Verify skill is suggested
```

### 2. Skill Content Guidelines

**Structure:**
- Start with metadata (Type, Priority)
- Overview section (what/why)
- Key patterns with code examples
- ✅/❌ examples (correct vs incorrect)
- Common mistakes section
- References to related files

**Length:**
- Main skill file: 200-500 lines (keep focused)
- Use progressive disclosure: link to detailed docs for complex topics
- Include code examples (not just prose)

**Tone:**
- Directive and specific ("MUST", "NEVER", "ALWAYS")
- Use examples over explanations
- Focus on "what" and "how", not "why" (unless critical)

## Modifying Existing Skills

### 1. Adding Patterns

```markdown
## New Pattern Section

Description of the pattern

### Example

\`\`\`typescript
// ✅ CORRECT - Following the pattern
const goodExample = ...;

// ❌ WRONG - Anti-pattern
const badExample = ...;
\`\`\`
```

### 2. Updating Triggers

```json
// Add more keywords to improve activation
{
  "skills": {
    "cloudflare-worker-guidelines": {
      "promptTriggers": {
        "keywords": [
          "worker",
          "hono",
          "api endpoint",  // NEW
          "route handler"  // NEW
        ]
      }
    }
  }
}
```

### 3. Refining Path Patterns

```json
{
  "fileTriggers": {
    "pathPatterns": [
      "apps/worker/**/*.ts",
      "apps/worker/routes/**/*.ts",  // More specific
      "apps/worker/lib/db/**/*.ts"    // Target specific areas
    ],
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/__tests__/**"  // Exclude test directories
    ]
  }
}
```

## LeaseLab-Specific Patterns

### 1. Required Skills (Critical)

**multi-tenancy-guidelines:**
- Type: Guardrail
- Enforcement: Block
- MUST be used for all database operations
- Ensures `site_id` filtering

**security-guidelines:**
- Type: Guardrail
- Enforcement: Block
- MUST be used for auth/crypto operations
- Ensures proper password/token hashing

### 2. Domain Skills (High Priority)

**cloudflare-worker-guidelines:**
- Hono + Cloudflare Workers patterns
- D1 database operations
- R2 storage operations

**remix-frontend-guidelines:**
- Remix route patterns
- Loader/action patterns
- Worker API client usage

**d1-database-guidelines:**
- Migration patterns
- Schema design
- Query optimization

**shared-types-guidelines:**
- TypeScript type patterns
- Zod schema usage
- Type safety best practices

## Skill Activation Examples

### 1. Automatic Activation

```
User: "Create a new API endpoint to get all properties"

Hook detects: "api endpoint", "properties"
Suggests: cloudflare-worker-guidelines, multi-tenancy-guidelines

Claude: Loading skills before responding...
```

### 2. File-Based Activation

```
User: [Edits apps/worker/lib/db/properties.ts]

Hook detects: apps/worker/lib/db/**/*.ts
Suggests: multi-tenancy-guidelines, security-guidelines

Claude: Ensuring site_id filtering...
```

### 3. Manual Activation

```
User: "@cloudflare-worker-guidelines Create a new route for work orders"

Claude: [Loads skill and applies patterns]
```

## Testing Skills

### 1. Keyword Testing

```bash
# Test if keywords trigger activation
echo "I want to create a new API endpoint" | ...
# Should suggest: cloudflare-worker-guidelines

echo "Add password hashing to user creation" | ...
# Should suggest: security-guidelines

echo "Create a new database migration" | ...
# Should suggest: d1-database-guidelines
```

### 2. File Pattern Testing

```bash
# Test file path matching
# Edit: apps/worker/lib/db/users.ts
# Should trigger: multi-tenancy-guidelines, security-guidelines

# Edit: apps/ops/app/routes/properties._index.tsx
# Should trigger: remix-frontend-guidelines
```

### 3. Validation

```bash
# Validate skill-rules.json syntax
jq empty .claude/skills/skill-rules.json

# Check hook permissions
ls -la .claude/hooks/
# Should show -rwxr-xr-x (executable)
```

## Hook Development

### 1. skill-activation-prompt Hook

**Purpose:** Auto-suggest skills based on user prompts

**Files:**
- `skill-activation-prompt.sh` - Shell wrapper
- `skill-activation-prompt.ts` - TypeScript implementation

**How it works:**
1. Receives user prompt via stdin (JSON)
2. Loads skill-rules.json
3. Matches keywords and intent patterns
4. Outputs formatted suggestions to stdout
5. Claude sees suggestions before responding

### 2. post-tool-use-tracker Hook

**Purpose:** Track edited files and suggest relevant skills

**Files:**
- `post-tool-use-tracker.sh` - Shell script

**How it works:**
1. Runs after Edit/Write tools
2. Detects which app/package was edited
3. Logs to `.claude/tsc-cache/{session}/edited-files.log`
4. Stores build/typecheck commands for later

## Best Practices

### 1. Skill Creation

- **Start small** - Create focused skills, not monoliths
- **Use examples** - Show code, not just text
- **Be directive** - Use "MUST", "NEVER", "ALWAYS"
- **Test thoroughly** - Verify keywords trigger correctly

### 2. Keyword Selection

- **Be specific** - "api endpoint" > "api"
- **Include variations** - "worker", "workers", "cloudflare workers"
- **Domain terms** - "site_id", "multi-tenant", "bearer token"
- **Action words** - "create", "modify", "add", "implement"

### 3. Path Patterns

- **Use glob patterns** - `apps/worker/**/*.ts`
- **Exclude tests** - `**/*.test.ts`
- **Be specific** - Target exact directories when possible

### 4. Skill Maintenance

- **Review regularly** - Update patterns based on usage
- **Refine triggers** - Improve keyword/pattern accuracy
- **Add examples** - Document new patterns as they emerge
- **Remove stale content** - Keep skills current

## Common Issues

### Issue 1: Skill Not Activating

**Diagnosis:**
- Check keyword spelling in skill-rules.json
- Verify file path matches pathPatterns
- Test hook execution permissions

**Fix:**
```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Validate JSON syntax
jq empty .claude/skills/skill-rules.json

# Test keyword matching
echo "your test prompt" | npx tsx .claude/hooks/skill-activation-prompt.ts
```

### Issue 2: Too Many Skills Suggested

**Diagnosis:**
- Keywords too broad
- Path patterns too generic

**Fix:**
```json
// Make keywords more specific
"keywords": ["api endpoint"] // Instead of just ["api"]

// Narrow path patterns
"pathPatterns": ["apps/worker/routes/**/*.ts"] // Instead of ["**/*.ts"]
```

### Issue 3: Wrong Skills Suggested

**Diagnosis:**
- Keyword overlap between skills
- Intent patterns too broad

**Fix:**
- Use more specific keywords
- Add intent patterns for disambiguation
- Adjust priority levels

## Integration Checklist

When adding a new skill:

- [ ] Create skill content file (.md)
- [ ] Add entry to skill-rules.json
- [ ] Define prompt triggers (keywords + patterns)
- [ ] Define file triggers (path patterns)
- [ ] Set correct type (domain/guardrail)
- [ ] Set appropriate priority
- [ ] Test keyword activation
- [ ] Test file path activation
- [ ] Validate JSON syntax
- [ ] Document in this skill-developer guide

## References

- Skill content: [.claude/skills/](../)
- Skill rules: [skill-rules.json](skill-rules.json)
- Hooks: [.claude/hooks/](../hooks/)
- Claude Code docs: https://docs.anthropic.com/claude-code
- Project guide: [CLAUDE.md](../../CLAUDE.md)
