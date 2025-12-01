import { useEffect, useMemo, useRef, useState } from "react";
import { geocodeAddress } from "~/lib/geocode";

type Listing = {
  id: string;
  title: string;
  slug: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

function buildAddress(listing: Listing) {
  const parts = [listing.address, listing.city, listing.province, listing.postalCode].filter(Boolean);
  return parts.join(", ");
}

export default function PropertyMap({
  listings,
  defaultCenter,
  apiKey,
}: {
  listings: Listing[];
  defaultCenter?: { lat: number; lng: number };
  apiKey?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  // Compute initial center
  const center = useMemo(() => {
    return defaultCenter || { lat: 37.7749, lng: -122.4194 }; // Fallback: San Francisco
  }, [defaultCenter]);

  useEffect(() => {
    // Ensure Google Maps JS API is loaded
    if (typeof window === "undefined") return;
    const hasGoogle = (window as any).google && (window as any).google.maps;
    if (hasGoogle) {
      setReady(true);
      return;
    }
    // If not loaded via root script, try to load here
    if (apiKey && !hasGoogle) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => setReady(true);
      script.onerror = (error) => {
        console.error("Failed to load Google Maps API:", error);
      };
      document.head.appendChild(script);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (!mapInstance.current) {
      // @ts-expect-error google is provided by Maps JS API
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
      });
    }

    const map = mapInstance.current!;

    // @ts-expect-error google is provided by Maps JS API
    const infoWindow = new google.maps.InfoWindow();

    // Place markers using geocoded addresses (ignore lat/lng entirely)
    (async () => {
      try {
        // Clear any existing markers when listings change
        if (markersRef.current.length) {
          for (const m of markersRef.current) {
            m.setMap(null);
          }
          markersRef.current = [];
        }

        const positions: Array<{ listing: Listing; pos: { lat: number; lng: number } }> = [];
        for (const listing of listings) {
          if (!apiKey) continue;
          const addr = buildAddress(listing);
          if (!addr) continue;
          try {
            const geo = await geocodeAddress(addr, apiKey);
            if (!geo) continue;
            positions.push({ listing, pos: geo });
          } catch (error) {
            console.error(`Failed to geocode address for ${listing.title}:`, error);
          }
        }

        // Fit the map to show all pins initially
        if (positions.length > 0) {
          // @ts-expect-error google is provided by Maps JS API
          const bounds = new google.maps.LatLngBounds();
          for (const { pos } of positions) {
            // @ts-expect-error google is provided by Maps JS API
            bounds.extend(new google.maps.LatLng(pos.lat, pos.lng));
          }
          map.fitBounds(bounds);
        } else {
          // No pins geocoded; keep the default center
          map.setCenter(center);
        }

        for (const { listing, pos } of positions) {
          // @ts-expect-error google is provided by Maps JS API
          const marker = new google.maps.Marker({
            position: pos,
            map,
            title: listing.title,
          });

          // Track marker so we can remove it on next update
          markersRef.current.push(marker);

          const detailUrl = `/properties/${listing.slug}`;
          const content = `
            <div style="min-width:200px">
              <div style="font-weight:600;margin-bottom:4px">${listing.title}</div>
              <a href="${detailUrl}" style="color:#2563eb;text-decoration:underline">View details</a>
            </div>
          `;
          marker.addListener("click", () => {
            infoWindow.setContent(content);
            infoWindow.open({ map, anchor: marker });
          });
        }
      } catch (error) {
        console.error("Error setting up map markers:", error);
      }
    })();
  }, [ready, center, listings, apiKey]);

  return (
    <div className="w-full h-[480px] rounded-lg overflow-hidden border border-white/10">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
