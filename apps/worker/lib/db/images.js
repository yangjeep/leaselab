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
