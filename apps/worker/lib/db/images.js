import { generateId } from '../../../../shared/utils';
import { normalizeDb } from './helpers';
// Mapper function
function mapImageFromDb(row) {
    const r = row;
    return {
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        r2Key: r.r2_key,
        filename: r.filename,
        contentType: r.content_type,
        sizeBytes: r.size_bytes,
        width: r.width,
        height: r.height,
        sortOrder: r.sort_order,
        isCover: Boolean(r.is_cover),
        altText: r.alt_text,
        createdAt: r.created_at,
    };
}
export async function getImagesByEntity(dbInput, siteId, entityType, entityId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? AND site_id = ? ORDER BY sort_order ASC', [entityType, entityId, siteId]);
    return results.map(mapImageFromDb);
}
export async function getImageById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapImageFromDb(result) : null;
}
export async function createImage(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('img');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO images (id, site_id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.entityType,
        data.entityId,
        data.r2Key,
        data.filename,
        data.contentType,
        data.sizeBytes,
        data.width || null,
        data.height || null,
        data.sortOrder || 0,
        data.isCover ? 1 : 0,
        data.altText || null,
        now
    ]);
    return (await getImageById(db, siteId, id));
}
export async function updateImage(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.sortOrder !== undefined) {
        updates.push('sort_order = ?');
        params.push(data.sortOrder);
    }
    if (data.isCover !== undefined) {
        updates.push('is_cover = ?');
        params.push(data.isCover ? 1 : 0);
    }
    if (data.altText !== undefined) {
        updates.push('alt_text = ?');
        params.push(data.altText);
    }
    if (updates.length === 0)
        return;
    params.push(id);
    await db.execute(`UPDATE images SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteImage(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
}
export async function setCoverImage(dbInput, siteId, entityType, entityId, imageId) {
    const db = normalizeDb(dbInput);
    // Remove cover from all images for this entity
    await db.execute('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND site_id = ?', [entityType, entityId, siteId]);
    // Set the new cover
    await db.execute('UPDATE images SET is_cover = 1 WHERE id = ? AND site_id = ?', [imageId, siteId]);
}
/**
 * Verify if an image exists in R2 bucket
 */
async function verifyImageExists(bucket, r2Key) {
    try {
        const object = await bucket.head(r2Key);
        return object !== null;
    }
    catch (error) {
        console.error(`Error checking R2 object ${r2Key}:`, error);
        return false;
    }
}
/**
 * Add public R2 URLs to images
 */
export function addImageUrls(images, r2PublicUrl) {
    if (!r2PublicUrl)
        return images;
    return images.map(img => ({
        ...img,
        url: `${r2PublicUrl}/${img.r2Key}`,
    }));
}
/**
 * Add public R2 URLs to images and verify they exist in R2
 * Filters out images that don't exist in the bucket
 */
export async function addImageUrlsWithVerification(images, r2PublicUrl, bucket) {
    if (!r2PublicUrl)
        return images;
    // Verify each image exists in R2 and filter out non-existent ones
    const verifiedImages = await Promise.all(images.map(async (img) => {
        const exists = await verifyImageExists(bucket, img.r2Key);
        if (!exists) {
            console.warn(`Image not found in R2: ${img.r2Key} (id: ${img.id})`);
            return null;
        }
        return {
            ...img,
            url: `${r2PublicUrl}/${img.r2Key}`,
        };
    }));
    // Filter out null entries (non-existent images)
    return verifiedImages.filter((img) => img !== null);
}
/**
 * Get images by entity with public URLs
 */
export async function getImagesByEntityWithUrls(dbInput, siteId, entityType, entityId, r2PublicUrl) {
    const images = await getImagesByEntity(dbInput, siteId, entityType, entityId);
    return addImageUrls(images, r2PublicUrl);
}
/**
 * Get images by entity with public URLs and verify they exist in R2
 */
export async function getImagesByEntityWithVerification(dbInput, siteId, entityType, entityId, r2PublicUrl, bucket) {
    const images = await getImagesByEntity(dbInput, siteId, entityType, entityId);
    return addImageUrlsWithVerification(images, r2PublicUrl, bucket);
}
