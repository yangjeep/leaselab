import { Link } from "@remix-run/react";
import { Badge, Card, CardContent } from "@leaselab/ui-components";
import type { Listing } from "~/lib/types";

type ListingCardProps = {
  listing: Listing;
  queryString?: string;
};

export default function ListingCard({ listing, queryString }: ListingCardProps) {
  // Extract the first valid image URL - handle both object and string formats
  let firstImageUrl = listing.imageUrl || "/placeholder1.jpg";
  
  if (listing.images && listing.images.length > 0) {
    const firstImage = listing.images[0];
    if (typeof firstImage === 'string') {
      firstImageUrl = firstImage;
    } else if (firstImage && typeof firstImage === 'object' && 'url' in firstImage) {
      firstImageUrl = firstImage.url || "/placeholder1.jpg";
    }
  }
  
  const imageSrc = firstImageUrl && firstImageUrl.trim() !== '' ? firstImageUrl : "/placeholder1.jpg";
  
  // Link to unit detail by unit ID (listings represent units)
  const href = queryString ? `/units/${listing.id}?${queryString}` : `/units/${listing.id}`;

  return (
    <Link to={href} className="block">
      <Card className="overflow-hidden transition-all hover:border-primary/40">
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
            <Badge variant="secondary" className={`text-xs ${getStatusColor(listing.status)}`}>
              {listing.status}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-white drop-shadow-lg">{listing.title}</h3>
        </div>
      </div>
      <CardContent className="space-y-2">
        <p className="opacity-80">
          ${listing.price} / mo · {listing.bedrooms}B{listing.bathrooms}B · {listing.city}
        </p>
        <div className="flex flex-wrap gap-2 text-xs opacity-80">
          {listing.parking && (
            <Badge variant="outline" className="border-white/20">
              {listing.parking}
            </Badge>
          )}
          {listing.pets && (
            <Badge variant="outline" className="border-white/20">
              {fmtPets(listing.pets)}
            </Badge>
          )}
        </div>
      </CardContent>
      </Card>
    </Link>
  );
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
