import type { Listing } from './types';

export async function getListings(db: D1Database): Promise<Listing[]> {
  try {
    const result = await db.prepare(`
      SELECT
        id,
        name as title,
        address,
        city,
        state,
        zip_code,
        rent as price,
        bedrooms,
        bathrooms,
        sqft,
        description,
        amenities,
        images,
        available_date,
        status
      FROM properties
      ORDER BY
        CASE status
          WHEN 'available' THEN 1
          WHEN 'maintenance' THEN 2
          WHEN 'rented' THEN 3
          ELSE 4
        END,
        created_at DESC
    `).all();

    return result.results.map(mapPropertyToListing);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return [];
  }
}

export async function getListingBySlug(db: D1Database, slug: string): Promise<Listing | null> {
  try {
    // Slug is the ID in our case
    const result = await db.prepare(`
      SELECT
        id,
        name as title,
        address,
        city,
        state,
        zip_code,
        rent as price,
        bedrooms,
        bathrooms,
        sqft,
        description,
        amenities,
        images,
        available_date,
        status
      FROM properties
      WHERE id = ?
    `).bind(slug).first();

    if (!result) return null;
    return mapPropertyToListing(result);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return null;
  }
}

function mapPropertyToListing(row: Record<string, unknown>): Listing {
  const images = row.images ? JSON.parse(row.images as string) : [];
  const statusMap: Record<string, string> = {
    available: 'Available',
    rented: 'Rented',
    maintenance: 'Pending',
    inactive: 'Rented',
  };

  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.id as string,
    price: row.price as number,
    city: row.city as string,
    address: `${row.address}, ${row.city}, ${row.state} ${row.zip_code}`,
    status: statusMap[row.status as string] || 'Available',
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    description: row.description as string | undefined,
    images: images,
    imageUrl: images[0] || undefined,
    pets: 'Conditional', // Default, can be extended
    parking: 'Available', // Default, can be extended
  };
}

// Filter and sort utilities
export function applyFilters(
  list: Listing[],
  filters: Record<string, string | undefined>
): Listing[] {
  return list.filter((l) => {
    const cityFilter =
      filters.city && filters.city !== 'All'
        ? l.city?.toLowerCase() === filters.city.toLowerCase()
        : true;
    const okBed = filters.bedrooms
      ? Number(l.bedrooms) >= Number(filters.bedrooms)
      : true;
    const okBath = filters.bathrooms
      ? Number(l.bathrooms) >= Number(filters.bathrooms)
      : true;
    const max = filters.max ? Number(l.price) <= Number(filters.max) : true;
    const status = filters.status ? l.status === filters.status : true;
    const pet = filters.pet ? l.pets === filters.pet : true;
    return cityFilter && okBed && okBath && max && status && pet;
  });
}

export function sortByStatus(list: Listing[]): Listing[] {
  const statusOrder: Record<string, number> = {
    Available: 1,
    Pending: 2,
    Rented: 3,
  };

  return [...list].sort((a, b) => {
    const aOrder = statusOrder[a.status] || 999;
    const bOrder = statusOrder[b.status] || 999;
    return aOrder - bOrder;
  });
}
