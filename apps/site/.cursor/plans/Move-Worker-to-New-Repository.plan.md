<!-- 91155d0e-45d2-4171-aadf-1bbbd8fd8df4 a9082ad3-7889-4427-8c1f-dd647a2515e4 -->
# Move Worker to New Repository

## Overview

Move the worker directory from `/Users/yangjeep/ws/yangjeep/rental-manager/worker` to `/Users/yangjeep/ws/yangjeep/gdrive-cfr2-image-sync`, creating a standalone repository for the Cloudflare Worker.plans

## Implementation Plan

### 1. Copy Worker Files to New Repository

- Copy all essential files from `worker/` to `gdrive-cfr2-image-sync/`:
- `src/index.ts` - Main worker code
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `wrangler.toml` - Cloudflare Worker configuration
- `README.md` - Documentation
- `.gitignore` - Git ignore rules
- `.dev.vars` - Local development secrets (for local testing)
- Do NOT copy:
- `node_modules/` - Will be reinstalled
- `.wrangler/` - Build artifacts

### 2. Update Package.json

- Update `name` field from `rental-manager-image-sync-worker` to `gdrive-cfr2-image-sync` (or similar)
- Keep all scripts and dependencies unchanged

### 3. Update README.md

- Remove references to `../docs/` paths (these won't exist in new repo)
- Update any relative paths that reference parent directory
- Update setup instructions to reflect standalone repository
- Keep all technical documentation intact

### 4. Create .gitignore (if needed)

- Ensure `.gitignore` includes: `node_modules/`, `.wrangler/`, `.dev.vars`, etc.

### 5. Initialize Git Repository (if not already)

- Check if `.git` exists in new directory
- If not, initialize git repository
- Create initial commit with all worker files

### 6. Cleanup Original Worker Directory

- Remove the `worker/` directory from `/Users/yangjeep/ws/yangjeep/rental-manager/`
- This completes the migration to the new standalone repository

## Files to Copy

- `worker/src/index.ts` → `gdrive-cfr2-image-sync/src/index.ts`
- `worker/package.json` → `gdrive-cfr2-image-sync/package.json` (with name update)
- `worker/tsconfig.json` → `gdrive-cfr2-image-sync/tsconfig.json`
- `worker/wrangler.toml` → `gdrive-cfr2-image-sync/wrangler.toml`
- `worker/README.md` → `gdrive-cfr2-image-sync/README.md` (with path updates)
- `worker/.gitignore` → `gdrive-cfr2-image-sync/.gitignore`
- `worker/.dev.vars` → `gdrive-cfr2-image-sync/.dev.vars`

## Notes

- `.dev.vars` will be copied over for local development (already contains secrets)
- User will need to run `npm install` in the new directory
- User will need to set up secrets in Cloudflare for the new repository
- The original `worker/` directory will be removed from rental-manager after successful copy