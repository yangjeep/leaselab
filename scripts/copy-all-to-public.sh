#!/bin/bash
# Simple script to copy all files from leaselab-files to leaselab-pub

echo "Starting bulk copy from leaselab-files to leaselab-pub..."
echo "This will copy ALL files to the public bucket."
echo ""

# List all objects in old bucket
echo "📋 Listing files in leaselab-files..."
npx wrangler r2 object list leaselab-files > /tmp/r2-files.txt

# Count files
FILE_COUNT=$(cat /tmp/r2-files.txt | grep -c "key:")
echo "Found $FILE_COUNT files to copy"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with copying all files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

# Note: This is a template - actual bulk copy requires using R2 API
# Wrangler CLI doesn't support bulk copy directly

echo ""
echo "⚠️  IMPORTANT: Wrangler CLI doesn't support bulk copy."
echo "You have two options:"
echo ""
echo "1. Use the Cloudflare Dashboard to copy files"
echo "2. Use the migration script with wrangler dev:"
echo "   cd scripts"
echo "   npx wrangler dev --config wrangler-migration.toml --local"
echo "   curl http://localhost:8787"
echo ""
echo "Or use the Cloudflare API directly (recommended for large migrations)"
