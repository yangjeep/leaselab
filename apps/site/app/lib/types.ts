export type Listing = {
  id: string;
  title: string;
  slug: string;
  price: number;
  city: string;
  address?: string;
  status: "Available" | "Rented" | "Pending" | string;
  bedrooms: number;
  bathrooms?: number;
  parking?: string;
  pets?: "Allowed" | "Not Allowed" | "Conditional" | string;
  description?: string;
  imageUrl?: string;
  images?: Array<{ url?: string; [key: string]: any }> | string[];
  imageFolderUrl?: string;
  lat?: number;
  lng?: number;
};
