# Pre-Submission Verification Hook

**CRITICAL**: Before completing ANY task that modifies dependencies or configuration, you MUST:

## 1. Package.json Changes
If you modified ANY `package.json` file:
- ✅ **ALWAYS run `npm install`** to update package-lock.json
- ✅ Verify the command succeeded
- ✅ Confirm package-lock.json was updated

## 2. Build Verification
After making code changes:
- ✅ Run `npm run build` or workspace-specific build commands
- ✅ Verify no build errors
- ✅ If builds fail, FIX them before considering the task complete

## 3. Deployment Configuration Changes
If you modified GitHub Actions workflows or wrangler.toml:
- ✅ Verify syntax is correct
- ✅ Ensure all referenced files/paths exist
- ✅ Check that any new dependencies are installed

## 4. Database Migrations
If you modified database schema or created migrations:
- ✅ Apply migration to ALL environments (preview AND production if applicable)
- ✅ Verify migration succeeded
- ✅ Confirm no SQL errors

## NEVER assume:
- ❌ "It will work in CI"
- ❌ "The lock file will update automatically"
- ❌ "Someone else will catch this"

## If you can't verify locally:
- State clearly what verification you were unable to complete
- Provide explicit instructions for the user to verify
- Do NOT mark the task as complete
