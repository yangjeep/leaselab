# Quick Start Guide for Cursor

This guide helps you quickly understand and use the `.cursor` infrastructure.

## How It Works

The `.cursor` directory provides:
1. **Auto-activating skills** - Guidelines that activate based on your prompts
2. **Hooks** - Scripts that run automatically to suggest relevant skills
3. **Rules** - Configuration that determines when skills activate

## Immediate Usage

### Option 1: Reference Skills Directly
When working on a task, reference the relevant skill:
```
@.cursor/skills/multi-tenancy-guidelines.md Create a new database function
```

### Option 2: Let Hooks Auto-Activate
Just start coding! The hooks will automatically suggest relevant skills based on:
- Keywords in your prompt (e.g., "database query" → multi-tenancy-guidelines)
- Files you're editing (e.g., `apps/worker/lib/db/*.ts` → multi-tenancy-guidelines)

### Option 3: Use .cursorrules
The `.cursorrules` file at the root provides quick context. Cursor reads this automatically.

## Critical Rules (Always Follow)

1. **Multi-Tenancy**: Every database operation MUST filter by `site_id`
2. **Security**: Never store plaintext passwords/tokens - use crypto utilities
3. **Frontend**: Never access D1 directly - use HTTP API calls to worker

## File Locations

- **Skills**: `.cursor/skills/*.md`
- **Hooks**: `.cursor/hooks/*.sh` and `*.ts`
- **Configuration**: `.cursor/settings.json`
- **Quick Rules**: `.cursorrules` (at project root)

## Testing

To verify hooks are working:
1. Make a prompt like "Create a new API endpoint"
2. Check if cloudflare-worker-guidelines is suggested
3. Edit a file in `apps/worker/lib/db/`
4. Check if multi-tenancy-guidelines is suggested

## Troubleshooting

**Hooks not running?**
- Check file permissions: `ls -la .cursor/hooks/` (should show executable)
- Verify settings.json syntax: `jq empty .cursor/settings.json`

**Skills not activating?**
- Check `.cursor/skills/skill-rules.json` for keyword matches
- Verify the skill file exists in `.cursor/skills/`

## Next Steps

1. Read `.cursor/README.md` for full documentation
2. Explore `.cursor/skills/` for detailed guidelines
3. Check `.cursorrules` for quick reference

