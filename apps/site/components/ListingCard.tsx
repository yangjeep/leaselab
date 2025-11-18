import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/types";

type ListingCardProps = {
  listing: Listing;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  isSelected?: boolean;
  queryString?: string;
};

export default function ListingCard({ listing, onClick, isSelected = false, queryString }: ListingCardProps) {
  const imageSrc = (listing.images && listing.images[0]) || listing.imageUrl || "/placeholder1.jpg";
  const isLocalImage = imageSrc?.startsWith('/');
  const href = queryString ? `/properties/${listing.slug}?${queryString}` : `/properties/${listing.slug}`;
  
  return (
    <Link 
      href={href}
      className={`card overflow-hidden hover:border-white/30 transition-all ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="relative">
      <Image 
        src={imageSrc}
        alt={listing.title} 
        width={400}
        height={128}
        className="h-32 w-full object-cover"
        unoptimized={isLocalImage}
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          console.error(`Failed to load image: ${imageSrc}`);
          if ((e.target as HTMLImageElement).src !== "/placeholder1.jpg") {
            (e.target as HTMLImageElement).src = "/placeholder1.jpg";
          }
        }}
      />
        {/* Overlay Title and Status Badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-between p-3">
          <div className="flex justify-end">
            <span className={`text-xs rounded-full px-2 py-1 font-medium ${getStatusColor(listing.status)}`}>
              {listing.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white drop-shadow-lg">{listing.title}</h3>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="opacity-80">${listing.price} / mo · {listing.bedrooms}B{listing.bathrooms}B · {listing.city}</div>
        <div className="flex gap-2 text-xs opacity-80">
          <Badge label={fmtParkingShort(listing.parking)} />
          <Badge label={fmtPetsShort(listing.pets)} />
        </div>
      </div>
    </Link>
  );
}

function Badge({ label }: { label?: string }) {
  if (!label) return null;
  return <span className="rounded-full border border-white/20 px-2 py-0.5">{label}</span>;
}

function fmtParkingShort(v: string | undefined): string | undefined {
  if (v && v.trim()) return v.trim();
  return undefined;
}

function fmtPetsShort(v: any): string | undefined {
  if (!v) return undefined;
  const s = String(v).toLowerCase();
  if (s.startsWith("allow")) return "Pets OK";
  if (s.startsWith("not")) return "No Pets";
  if (s.startsWith("cond")) return "Pets Cond.";
  return String(v);
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("available") || s.includes("active")) {
    return "bg-green-500 text-white";
  }
  if (s.includes("pending") || s.includes("hold")) {
    return "bg-yellow-500 text-black";
  }
  if (s.includes("rented") || s.includes("unavailable") || s.includes("inactive")) {
    return "bg-red-500 text-white";
  }
  return "bg-gray-500 text-white";
}
