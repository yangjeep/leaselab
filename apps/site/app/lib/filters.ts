import type { Listing } from './types';

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
