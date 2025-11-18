import HomeTabs from "@/components/HomeTabs";
import { fetchListings } from "@/lib/fetchListings";
import type { Listing } from "@/lib/types";

// Revalidate every 60 seconds (or use REVALIDATE_SECONDS env var)
export const revalidate = Number(process.env.REVALIDATE_SECONDS) || 60;

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
  const all = await fetchListings();
  const filtered = applyFilters(all, resolvedSearchParams);
  const sorted = sortByStatus(filtered);
  return <HomeTabs filteredListings={sorted} allListings={all} searchParams={resolvedSearchParams} />;
}

function applyFilters(list: Listing[], q: Record<string, string>) {
  return list.filter(l => {
    const cityFilter = q?.city && q.city !== "All" ? l.city?.toLowerCase() === String(q.city).toLowerCase() : true;
    const okBed  = q?.bedrooms ? Number(l.bedrooms) >= Number(q.bedrooms) : true;
    const okBath = q?.bathrooms ? Number(l.bathrooms) >= Number(q.bathrooms) : true;
    const max = q?.max ? Number(l.price) <= Number(q.max) : true;
    const status = q?.status ? l.status === q.status : true;
    const pet = q?.pet ? l.pets === q.pet : true;
    return cityFilter && okBed && okBath && max && status && pet;
  });
}

function sortByStatus(list: Listing[]) {
  const statusOrder: Record<string, number> = {
    'Available': 1,
    'Pending': 2,
    'Rented': 3
  };
  
  return [...list].sort((a, b) => {
    const aOrder = statusOrder[a.status] || 999;
    const bOrder = statusOrder[b.status] || 999;
    return aOrder - bOrder;
  });
}
