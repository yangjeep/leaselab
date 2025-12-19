/**
 * R2 Bucket Migration Script
 *
 * Migrates files from leaselab-files to the appropriate new buckets:
 * - property/* and unit/* images → leaselab-pub (public bucket)
 * - leads/* files → leaselab-pri (private bucket)
 *
 * Usage:
 *   npx tsx scripts/migrate-r2-buckets.ts
 *
 * Prerequisites:
 *   - wrangler.toml configured with all three buckets
 *   - npm install tsx (if not already installed)
 */

interface Env {
  OLD_BUCKET: R2Bucket;  // leaselab-files
  PUBLIC_BUCKET: R2Bucket;  // leaselab-pub
  PRIVATE_BUCKET: R2Bucket;  // leaselab-pri
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log('Starting R2 bucket migration...');

    const stats = {
      total: 0,
      toPublic: 0,
      toPrivate: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // List all objects in the old bucket
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const listed = await env.OLD_BUCKET.list({
          cursor,
          limit: 1000, // Process in batches
        });

        for (const object of listed.objects) {
          stats.total++;
          const key = object.key;

          console.log(`Processing: ${key}`);

          try {
            // Determine destination bucket based on key prefix
            let targetBucket: R2Bucket;
            let bucketName: string;

            if (key.startsWith('property/') || key.startsWith('unit/')) {
              // Property and unit images go to public bucket
              targetBucket = env.PUBLIC_BUCKET;
              bucketName = 'leaselab-pub (PUBLIC)';
              stats.toPublic++;
            } else if (key.startsWith('leads/')) {
              // Lead files go to private bucket
              targetBucket = env.PRIVATE_BUCKET;
              bucketName = 'leaselab-pri (PRIVATE)';
              stats.toPrivate++;
            } else {
              console.log(`⚠️  Skipping unknown prefix: ${key}`);
              stats.skipped++;
              continue;
            }

            // Get the object from old bucket
            const obj = await env.OLD_BUCKET.get(key);

            if (!obj) {
              console.log(`⚠️  Object not found: ${key}`);
              stats.errors++;
              continue;
            }

            // Copy to new bucket with same key and metadata
            await targetBucket.put(key, obj.body, {
              httpMetadata: obj.httpMetadata,
              customMetadata: obj.customMetadata,
            });

            console.log(`✅ Copied to ${bucketName}: ${key}`);

          } catch (error) {
            console.error(`❌ Error processing ${key}:`, error);
            stats.errors++;
          }
        }

        hasMore = !listed.truncated;
        cursor = listed.truncated ? listed.cursor : undefined;

        console.log(`\nBatch complete. Progress: ${stats.total} files processed`);
      }

      // Print final statistics
      console.log('\n' + '='.repeat(60));
      console.log('Migration Complete!');
      console.log('='.repeat(60));
      console.log(`Total files processed: ${stats.total}`);
      console.log(`Copied to PUBLIC bucket (leaselab-pub): ${stats.toPublic}`);
      console.log(`Copied to PRIVATE bucket (leaselab-pri): ${stats.toPrivate}`);
      console.log(`Skipped (unknown prefix): ${stats.skipped}`);
      console.log(`Errors: ${stats.errors}`);
      console.log('='.repeat(60));

      return new Response(JSON.stringify({
        success: true,
        stats,
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Migration failed:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats,
      }, null, 2), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
