# Verification Checklist for Cursor Integration

Use this checklist to verify that Cursor is using the `.cursor` infrastructure correctly.

## ✅ Pre-Flight Checks

- [ ] `.cursor` directory exists at project root
- [ ] All hook files are executable: `ls -la .cursor/hooks/` shows `-rwxr-xr-x`
- [ ] `settings.json` is valid JSON: `jq empty .cursor/settings.json`
- [ ] `skill-rules.json` is valid JSON: `jq empty .cursor/skills/skill-rules.json`
- [ ] `.cursorrules` file exists at project root

## 🧪 Test Hook Execution

### Test 1: Skill Activation Hook

```bash
# Simulate a prompt that should trigger skills
echo '{"prompt": "Create a new API endpoint to get all properties", "cwd": "'$(pwd)'"}' | \
  cd .cursor/hooks && npx tsx skill-activation-prompt.ts

# Expected: Should output skill suggestions
```

### Test 2: File Tracking Hook

```bash
# Simulate editing a database file
echo '{"tool_name": "Edit", "tool_input": {"file_path": "apps/worker/lib/db/properties.ts"}, "session_id": "test"}' | \
  bash .cursor/hooks/post-tool-use-tracker.sh

# Expected: Should create cache directory and log file
# Check: .cursor/tsc-cache/test/edited-files.log
```

## 🎯 Test Skill Activation

### By Keywords

Try these prompts in Cursor and verify skills are suggested:

1. **"Create a new API endpoint"**
   - Should suggest: `cloudflare-worker-guidelines`

2. **"Add password hashing to user creation"**
   - Should suggest: `security-guidelines` (CRITICAL)

3. **"Create a database migration"**
   - Should suggest: `d1-database-guidelines`

4. **"Add a new field to properties table"**
   - Should suggest: `multi-tenancy-guidelines` (CRITICAL), `d1-database-guidelines`

### By File Editing

Edit these files and check for skill suggestions:

1. **`apps/worker/lib/db/users.ts`**
   - Should suggest: `multi-tenancy-guidelines`, `security-guidelines`

2. **`apps/ops/app/routes/properties._index.tsx`**
   - Should suggest: `remix-frontend-guidelines`

3. **`apps/worker/migrations/0003_new.sql`**
   - Should suggest: `d1-database-guidelines`

## 🔍 Verify Configuration

### Check Environment Variables

Cursor should set one of these:
- `CURSOR_PROJECT_DIR`
- `CURSOR_WORKSPACE_DIR`
- Or use `cwd` from hook input

### Check Hook Permissions

```bash
ls -la .cursor/hooks/
# All .sh files should be executable (-rwxr-xr-x)
```

### Check File Structure

```bash
tree .cursor/ -L 2
# Should show:
# .cursor/
# ├── hooks/
# ├── skills/
# ├── settings.json
# └── README.md
```

## 🚨 Troubleshooting

### Hooks Not Running

1. **Check permissions:**
   ```bash
   chmod +x .cursor/hooks/*.sh
   ```

2. **Verify settings.json:**
   ```bash
   jq empty .cursor/settings.json
   ```

3. **Check Cursor logs** for hook execution errors

### Skills Not Activating

1. **Check keyword matching:**
   - Verify keywords in `skill-rules.json` match your prompts
   - Check case sensitivity (keywords are lowercased)

2. **Check file path patterns:**
   - Verify `pathPatterns` in `skill-rules.json` match your file paths
   - Use glob patterns: `apps/worker/**/*.ts`

3. **Test manually:**
   ```bash
   # Test keyword matching
   echo '{"prompt": "your test prompt", "cwd": "'$(pwd)'"}' | \
     cd .cursor/hooks && npx tsx skill-activation-prompt.ts
   ```

### Environment Variable Issues

The hooks now support multiple fallbacks:
1. `cwd` from hook input (most reliable)
2. `CURSOR_PROJECT_DIR`
3. `CURSOR_WORKSPACE_DIR`
4. `PWD` environment variable
5. `process.cwd()` as last resort

If hooks fail, check which variable Cursor sets and update accordingly.

## 📊 Success Indicators

You'll know it's working when:

1. ✅ Skills are suggested automatically based on prompts
2. ✅ File edits trigger relevant skill suggestions
3. ✅ Critical guardrails (multi-tenancy, security) are always enforced
4. ✅ Cache directory is created: `.cursor/tsc-cache/{session}/`
5. ✅ Edited files are logged: `.cursor/tsc-cache/{session}/edited-files.log`

## 🔄 Next Steps

Once verified:
1. Start using Cursor normally - hooks will activate automatically
2. Reference skills directly: `@.cursor/skills/multi-tenancy-guidelines.md`
3. Check `.cursorrules` for quick context
4. Read full docs: `.cursor/README.md`

