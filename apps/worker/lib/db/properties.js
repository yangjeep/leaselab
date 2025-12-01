import { generateId } from '../../../../shared/utils';
import { normalizeDb } from './helpers';
// Import related functions
import { getUnitsByPropertyId } from './units';
import { getImagesByEntity, addImageUrlsWithVerification } from './images';
// Mapper function
function mapPropertyFromDb(row) {
    const r = row;
    return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        address: r.address,
        city: r.city,
        province: r.province,
        postalCode: r.postal_code,
        propertyType: r.property_type,
        description: r.description,
        yearBuilt: r.year_built,
        lotSize: r.lot_size,
        amenities: JSON.parse(r.amenities || '[]'),
        latitude: r.latitude,
        longitude: r.longitude,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
export async function getProperties(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM properties WHERE site_id = ?';
    const params = [siteId];
    if (options?.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(options.isActive ? 1 : 0);
    }
    if (options?.propertyType) {
        query += ' AND property_type = ?';
        params.push(options.propertyType);
    }
    if (options?.city) {
        query += ' AND city = ?';
        params.push(options.city);
    }
    query += ' ORDER BY created_at DESC';
    const results = await db.query(query, params);
    return results.map(mapPropertyFromDb);
}
export async function getPropertyById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}
export async function getPropertyBySlug(dbInput, siteId, slug) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE slug = ? AND site_id = ?', [slug, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}
export async function getPropertyWithUnits(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const property = await getPropertyById(db, siteId, id);
    if (!property)
        return null;
    const units = await getUnitsByPropertyId(db, siteId, id);
    const images = await getImagesByEntity(db, siteId, 'property', id);
    return {
        ...property,
        units,
        images,
        unitCount: units.length,
        occupiedCount: units.filter(u => u.status === 'occupied').length,
        vacantCount: units.filter(u => u.status === 'available').length,
    };
}
export async function createProperty(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('prop');
    const now = new Date().toISOString();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(0, 8);
    await db.execute(`
    INSERT INTO properties (id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, lot_size, amenities, latitude, longitude, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
        id,
        siteId,
        data.name,
        slug,
        data.address,
        data.city,
        data.province,
        data.postalCode,
        data.propertyType,
        data.description || null,
        data.yearBuilt || null,
        data.lotSize || null,
        JSON.stringify(data.amenities || []),
        data.latitude || null,
        data.longitude || null,
        now,
        now
    ]);
    return (await getPropertyById(db, siteId, id));
}
export async function updateProperty(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    const fieldMap = {
        name: 'name',
        address: 'address',
        city: 'city',
        state: 'state',
        postalCode: 'postal_code',
        propertyType: 'property_type',
        description: 'description',
        yearBuilt: 'year_built',
        lotSize: 'lot_size',
        latitude: 'latitude',
        longitude: 'longitude',
    };
    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            updates.push(`${dbField} = ?`);
            params.push(data[key]);
        }
    }
    if (data.amenities !== undefined) {
        updates.push('amenities = ?');
        params.push(JSON.stringify(data.amenities));
    }
    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteProperty(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
}
// Listings (for storefront - properties with units)
export async function getPublicListings(dbInput, siteId, filters, r2PublicUrl, bucket) {
    const db = normalizeDb(dbInput);
    // Query units with property data joined
    let query = `
    SELECT
      u.id as id,
      u.unit_number,
      u.bedrooms,
      u.bathrooms,
      u.rent_amount as price,
      u.status,
      u.sqft,
      u.features,
      p.id as property_id,
      p.name as title,
      p.slug,
      p.address,
      p.city,
      p.province,
      p.postal_code as postalCode,
      p.description,
      p.amenities,
      p.latitude as lat,
      p.longitude as lng
    FROM units u
    INNER JOIN properties p ON u.property_id = p.id
    WHERE u.site_id = ? AND p.site_id = ?
      AND u.is_active = 1 AND p.is_active = 1
  `;
    const params = [siteId, siteId];
    if (filters?.city) {
        query += ' AND p.city = ?';
        params.push(filters.city);
    }
    if (filters?.status) {
        query += ' AND u.status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY p.name, u.unit_number';
    const results = await db.query(query, params);
    // Fetch images for each unit/property and generate R2 URLs
    const listings = await Promise.all(results.map(async (row) => {
        // Try to get unit-specific images first, fall back to property images
        let images = await getImagesByEntity(db, siteId, 'unit', row.id);
        if (images.length === 0) {
            images = await getImagesByEntity(db, siteId, 'property', row.property_id);
        }
        // Verify images exist in R2 and generate public URLs
        let verifiedImages = images;
        if (bucket && r2PublicUrl) {
            verifiedImages = await addImageUrlsWithVerification(images, r2PublicUrl, bucket);
        }
        // Generate R2 public URLs from image r2Keys
        const imageUrls = r2PublicUrl && !bucket
            ? images.map(img => `${r2PublicUrl}/${img.r2Key}`)
            : verifiedImages.map(img => img.url || `${r2PublicUrl}/${img.r2Key}`);
        return {
            id: row.id,
            propertyId: row.property_id, // Include property_id for lead submissions
            title: row.title + (row.unit_number !== '1' ? ` - Unit ${row.unit_number}` : ''),
            slug: row.slug,
            price: row.price,
            city: row.city,
            address: row.address,
            status: row.status === 'available' ? 'Available' : row.status === 'occupied' ? 'Rented' : 'Pending',
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            parking: null,
            pets: null,
            description: row.description,
            imageUrl: imageUrls[0] || null,
            images: imageUrls,
            lat: row.lat,
            lng: row.lng,
        };
    }));
    return listings;
}
