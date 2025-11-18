export type Listing = {
  id: string;
  title: string;
  slug: string;
  price: number;                 // from "Monthly Rent"
  city: string;
  address?: string;
  status: "Available" | "Rented" | "Pending" | string;
  bedrooms: number;
  bathrooms?: number;
  parking?: string;              // e.g., "1 spot", "Available", "No"
  pets?: "Allowed" | "Not Allowed" | "Conditional" | string;
  description?: string;

  imageUrl?: string;             // cover image (first from images array)
  images?: string[];             // gallery images from image_folder_url_r2_urls
  imageFolderUrl?: string;       // raw folder link (legacy)
};

