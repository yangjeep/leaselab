import type { Property } from '../../../../shared/types';
import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Import related functions
import { getUnitsByPropertyId } from './units';
import { getImagesByEntity, addImageUrlsWithVerification } from './images';

// Mapper function
function mapPropertyFromDb(row: unknown): Property {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        name: r.name as string,
        slug: r.slug as string,
        address: r.address as string,
        city: r.city as string,
        province: r.province as string,
        postalCode: r.postal_code as string,
        propertyType: r.property_type as Property['propertyType'],
        description: r.description as string | undefined,
        yearBuilt: r.year_built as number | undefined,
        lotSize: r.lot_size as number | undefined,
        amenities: JSON.parse(r.amenities as string || '[]'),
        latitude: r.latitude as number | undefined,
        longitude: r.longitude as number | undefined,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

export async function getProperties(dbInput: DatabaseInput, siteId: string, options?: {
    isActive?: boolean;
    propertyType?: string;
    city?: string;
}): Promise<Property[]> {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM properties WHERE site_id = ?';
    const params: (string | number)[] = [siteId];

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

export async function getPropertyById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyBySlug(dbInput: DatabaseInput, siteId: string, slug: string): Promise<Property | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE slug = ? AND site_id = ?', [slug, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}

export async function getPropertyWithUnits(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null> {
    const db = normalizeDb(dbInput);
    const property = await getPropertyById(db, siteId, id);
    if (!property) return null;

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

export async function createProperty(dbInput: DatabaseInput, siteId: string, data: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description?: string;
    yearBuilt?: number;
    lotSize?: number;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
}): Promise<Property> {
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

    return (await getPropertyById(db, siteId, id))!;
}

export async function updateProperty(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description: string;
    yearBuilt: number;
    lotSize: number;
    amenities: string[];
    latitude: number;
    longitude: number;
    isActive: boolean;
}>): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
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
        if (data[key as keyof typeof data] !== undefined) {
            updates.push(`${dbField} = ?`);
            params.push(data[key as keyof typeof data] as string | number | null);
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

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}

export async function deleteProperty(dbInput: DatabaseInput, siteId: string, id: string): Promise<void> {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
}

// Listings (for storefront - properties with units)
export async function getPublicListings(dbInput: DatabaseInput, siteId: string, filters?: {
    city?: string;
    status?: string;
}, r2PublicUrl?: string, bucket?: any): Promise<any[]> {
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

    const params: (string | number)[] = [siteId, siteId];

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
    const listings = await Promise.all(results.map(async (row: any) => {
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
