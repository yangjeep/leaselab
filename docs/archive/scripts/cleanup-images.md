# Property Images Cleanup Guide

This guide helps you clean up property images from D1 and optionally R2 buckets.

## Step 1: Clear Property Images from D1 Database

Run the SQL script to remove all property and unit image records:

```bash
# Execute the SQL script against your D1 database
npx wrangler d1 execute leaselab-db --file=scripts/clear-property-images.sql
```

This will:
- ✅ Delete all records with `entity_type = 'property'`
- ✅ Delete all records with `entity_type = 'unit'`
- ✅ Show counts before and after deletion
- ⚠️ **Does NOT delete actual files from R2**

## Step 2 (Optional): Clear Files from R2 Bucket

If you also want to delete the actual image files from R2:

### Option A: Delete from old bucket (leaselab-files)

```bash
# List all objects first
npx wrangler r2 object list leaselab-files

# Delete property images
# Note: Wrangler doesn't have bulk delete, so you'll need to do this via API
# or delete the entire bucket and recreate it
```

### Option B: Delete from new public bucket (leaselab-pub)

```bash
# List all objects
npx wrangler r2 object list leaselab-pub

# Delete specific files
npx wrangler r2 object delete leaselab-pub <key>
```

### Option C: Delete entire bucket and recreate (fastest for complete cleanup)

```bash
# Delete old bucket entirely
npx wrangler r2 bucket delete leaselab-files

# Recreate if needed
npx wrangler r2 bucket create leaselab-files
```

## Step 3: Verify Cleanup

### Check D1 Database

```bash
# Query to verify images are deleted
npx wrangler d1 execute leaselab-db --command="SELECT COUNT(*) as total FROM images"
npx wrangler d1 execute leaselab-db --command="SELECT COUNT(*) as properties FROM images WHERE entity_type = 'property'"
npx wrangler d1 execute leaselab-db --command="SELECT COUNT(*) as units FROM images WHERE entity_type = 'unit'"
```

### Check R2 Buckets

```bash
# Check old bucket
npx wrangler r2 object list leaselab-files | wc -l

# Check new public bucket
npx wrangler r2 object list leaselab-pub | wc -l

# Check private bucket
npx wrangler r2 object list leaselab-pri | wc -l
```

## What Gets Deleted

### From D1 Database (images table):
- All rows where `entity_type = 'property'`
- All rows where `entity_type = 'unit'`

### What Stays:
- Lead files (if any image records exist for leads)
- Any other entity types

## Safety Notes

⚠️ **IMPORTANT:**
1. **Backup first**: Consider exporting your D1 database before deletion
2. **R2 files persist**: Deleting from D1 doesn't delete R2 files
3. **No undo**: Once deleted from D1, you'll need to re-upload and re-register images
4. **Check your site**: Make sure your storefront isn't actively using these images

## Backup D1 Before Deletion

```bash
# Export current images table
npx wrangler d1 execute leaselab-db --command="SELECT * FROM images" > backup-images-$(date +%Y%m%d).json
```

## Alternative: Soft Delete (Recommended)

Instead of permanently deleting, you could add a `deleted_at` column:

```sql
-- Add deleted_at column (run once)
ALTER TABLE images ADD COLUMN deleted_at TEXT;

-- Soft delete instead of hard delete
UPDATE images SET deleted_at = datetime('now') WHERE entity_type IN ('property', 'unit');

-- Query to verify (should return 0)
SELECT COUNT(*) FROM images WHERE entity_type IN ('property', 'unit') AND deleted_at IS NULL;
```

Then update your queries to filter out soft-deleted records:
```sql
WHERE deleted_at IS NULL
```

This allows you to recover images if needed.
