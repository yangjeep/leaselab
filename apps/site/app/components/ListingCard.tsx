import { Link } from "@remix-run/react";
import type { Listing } from "~/lib/types";

type ListingCardProps = {
  listing: Listing;
  queryString?: string;
};

export default function ListingCard({ listing, queryString }: ListingCardProps) {
  const imageSrc = (listing.images && listing.images[0]) || listing.imageUrl || "/placeholder1.jpg";
  const href = queryString ? `/properties/${listing.slug}?${queryString}` : `/properties/${listing.slug}`;

  return (
    <Link
      to={href}
      className="card overflow-hidden hover:border-white/30 transition-all block"
    >
      <div className="relative">
        <img
          src={imageSrc}
          alt={listing.title}
          className="h-32 w-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== "/placeholder1.jpg") {
              target.src = "/placeholder1.jpg";
            }
          }}
        />
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
        <div className="opacity-80">
          ${listing.price} / mo · {listing.bedrooms}B{listing.bathrooms}B · {listing.city}
        </div>
        <div className="flex gap-2 text-xs opacity-80">
          {listing.parking && <Badge label={listing.parking} />}
          {listing.pets && <Badge label={fmtPets(listing.pets)} />}
        </div>
      </div>
    </Link>
  );
}

function Badge({ label }: { label?: string }) {
  if (!label) return null;
  return <span className="rounded-full border border-white/20 px-2 py-0.5">{label}</span>;
}

function fmtPets(v: string): string {
  const s = v.toLowerCase();
  if (s.startsWith("allow")) return "Pets OK";
  if (s.startsWith("not")) return "No Pets";
  if (s.startsWith("cond")) return "Pets Cond.";
  return v;
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("available") || s.includes("active")) {
    return "bg-green-500 text-white";
  }
  if (s.includes("pending") || s.includes("hold")) {
    return "bg-yellow-500 text-black";
  }
  if (s.includes("rented") || s.includes("unavailable")) {
    return "bg-red-500 text-white";
  }
  return "bg-gray-500 text-white";
}
