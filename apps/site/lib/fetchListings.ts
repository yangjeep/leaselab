// lib/fetchListings.ts
import type { Listing } from "./types";
import { fetchD1Records } from "./d1RestClient";

// ---------- helpers ----------
function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function parseBoolish(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["y", "yes", "true", "1"].includes(s)) return true;
  if (["n", "no", "false", "0"].includes(s)) return false;
  return undefined;
}

/**
 * Parse JSON array string from image_folder_url_r2_urls column
 * Returns empty array if null, empty, or invalid JSON
 */
function parseImageUrls(jsonString: string | null | undefined): string[] {
  if (!jsonString || typeof jsonString !== "string" || jsonString.trim() === "") {
    return [];
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      // Filter out any non-string values and return valid URLs
      return parsed.filter((url): url is string => typeof url === "string" && url.trim() !== "");
    }
    return [];
  } catch (error) {
    console.warn(`[D1] Failed to parse image_folder_url_r2_urls JSON: ${jsonString}`, error);
    return [];
  }
}

/**
 * Parse JSON string with "value" property
 * Returns the value string if valid JSON, otherwise returns fallback
 */
function parseJsonValue(jsonString: string | null | undefined, fallback: string = ""): string {
  if (!jsonString || typeof jsonString !== "string" || jsonString.trim() === "") {
    return fallback;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && "value" in parsed && typeof parsed.value === "string") {
      return parsed.value;
    }
    // If it's already a plain string, return it
    if (typeof parsed === "string") {
      return parsed;
    }
    return fallback;
  } catch (error) {
    // If not valid JSON, treat as plain string
    return jsonString;
  }
}


// ---------- D1 row type ----------
type D1Row = {
  id: number;
  title: string | null;
  slug: number | null;
  city: string | null;
  address: string | null;
  status: string | null;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: string | null;
  description: string | null;
  image_folder_url: string | null;
  pets: string | null;
  interest: string | null;
  created_at: string | null;
  updated_at: string | null;
  image_folder_url_r2_urls: string | null;
};

/**
 * Fetch listings from D1 database via REST API
 */
export async function fetchListings(): Promise<Listing[]> {
  const tableName = process.env.D1_TABLE_NAME || "table_740124";
  const apiToken = process.env.D1_REST_API_TOKEN;
  
  if (!apiToken) {
    // In CI/build environments, return empty array instead of throwing
    // This allows builds to succeed even without D1 credentials
    if (process.env.CI || process.env.NODE_ENV === 'production') {
      console.warn("Missing D1_REST_API_TOKEN - returning empty listings array");
      return [];
    }
    throw new Error("Missing D1_REST_API_TOKEN");
  }

  try {
    // Query D1 table ordered by title using REST API
    const rows = await fetchD1Records<D1Row>(tableName, {
      sort_by: "title",
      order: "asc",
    });

    // Map D1 columns to Listing type
    const baseItems: Listing[] = rows.map((row) => {
      const title: string = row.title ?? "";
      // Convert slug from INTEGER to string
      const slug: string = row.slug != null ? String(row.slug) : slugify(title);
      const price: number = toNum(row.monthly_rent);
      const bedrooms: number = toNum(row.bedrooms);
      const bathrooms: number | undefined = row.bathrooms != null ? toNum(row.bathrooms) : undefined;
      // Parse status from JSON string (extracts "value" property if JSON, otherwise uses plain string)
      const status: string = parseJsonValue(row.status, "Available");
      const city: string = row.city ?? "";
      const address: string | undefined = row.address ? row.address : undefined;
      const description: string | undefined = row.description ? row.description : undefined;
      // Parse pets from JSON string (extracts "value" property if JSON, otherwise uses plain string)
      const pets: string | undefined = row.pets ? parseJsonValue(row.pets) : undefined;
      const parking: string | undefined = row.parking ? String(row.parking).trim() : undefined;
      const imageFolderUrl: string | undefined = row.image_folder_url ? row.image_folder_url : undefined;

      // Parse image_folder_url_r2_urls JSON array string
      const images = parseImageUrls(row.image_folder_url_r2_urls);
      const imageUrl = images.length > 0 ? images[0] : undefined;

      // Convert id from INTEGER to string
      const id: string = String(row.id);

      return {
        id,
        title,
        slug,
        price,
        city,
        address,
        status,
        bedrooms,
        bathrooms,
        parking,
        pets,
        description,
        imageFolderUrl,
        imageUrl,
        images: images.length > 0 ? images : undefined,
      };
    });

    // Ensure all items have imageUrl and images, use placeholders as fallback
    console.log(`\n📝 [Placeholder Fallback] Applying placeholders where needed...`);
    for (let i = 0; i < baseItems.length; i++) {
      const item = baseItems[i];
      if (!item.imageUrl || item.imageUrl.trim() === "") {
        // Alternate between placeholder images for demo purposes
        item.imageUrl = i % 2 === 0 ? "/placeholder1.jpg" : "/placeholder2.jpg";
        console.log(`[Placeholder Fallback] ${item.slug}: Using placeholder for imageUrl`);
      }
      // If no images array, provide both placeholders for gallery demo
      if (!item.images || item.images.length === 0) {
        item.images = ["/placeholder1.jpg", "/placeholder2.jpg"];
        console.log(`[Placeholder Fallback] ${item.slug}: Using placeholders for images array`);
      }
    }
    console.log(`[Placeholder Fallback] Complete!\n`);

    return baseItems;
  } catch (error) {
    console.error("[D1] Error fetching listings:", error);
    // In CI/build environments, return empty array instead of throwing
    if (process.env.CI || process.env.NODE_ENV === 'production') {
      console.warn("D1 fetch failed - returning empty listings array");
      return [];
    }
    throw error;
  }
}
