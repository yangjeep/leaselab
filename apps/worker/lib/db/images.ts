import type { PropertyImage } from '../../../../shared/types';
import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function
function mapImageFromDb(row: unknown): PropertyImage {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        entityType: r.entity_type as 'property' | 'unit',
        entityId: r.entity_id as string,
        r2Key: r.r2_key as string,
        filename: r.filename as string,
        contentType: r.content_type as string,
        sizeBytes: r.size_bytes as number,
        width: r.width as number | undefined,
        height: r.height as number | undefined,
        sortOrder: r.sort_order as number,
        isCover: Boolean(r.is_cover),
        altText: r.alt_text as string | undefined,
        createdAt: r.created_at as string,
    };
}

export async function getImagesByEntity(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]> {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? AND site_id = ? ORDER BY sort_order ASC', [entityType, entityId, siteId]);
    return results.map(mapImageFromDb);
}

export async function getImageById(dbInput: DatabaseInput, siteId: string, id: string): Promise<PropertyImage | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapImageFromDb(result) : null;
}

export async function createImage(dbInput: DatabaseInput, siteId: string, data: {
    entityType: 'property' | 'unit';
    entityId: string;
    r2Key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    sortOrder?: number;
    isCover?: boolean;
    altText?: string;
}): Promise<PropertyImage> {
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

    return (await getImageById(db, siteId, id))!;
}

export async function updateImage(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    sortOrder: number;
    isCover: boolean;
    altText: string;
}>): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

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

    if (updates.length === 0) return;
    params.push(id);

    await db.execute(`UPDATE images SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteImage(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
}

export async function setCoverImage(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void> {
    const db = normalizeDb(dbInput);
    // Remove cover from all images for this entity
    await db.execute('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND site_id = ?', [entityType, entityId, siteId]);
    // Set the new cover
    await db.execute('UPDATE images SET is_cover = 1 WHERE id = ? AND site_id = ?', [imageId, siteId]);
}

/**
 * Add public R2 URLs to images
 */
export function addImageUrls(images: PropertyImage[], r2PublicUrl?: string): PropertyImage[] {
    if (!r2PublicUrl) return images;
    return images.map(img => ({
        ...img,
        url: `${r2PublicUrl}/${img.r2Key}`,
    }));
}

/**
 * Get images by entity with public URLs
 */
export async function getImagesByEntityWithUrls(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, r2PublicUrl?: string): Promise<PropertyImage[]> {
    const images = await getImagesByEntity(dbInput, siteId, entityType, entityId);
    return addImageUrls(images, r2PublicUrl);
}
