"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import type { Listing } from "@/lib/types";

type GoogleMapProps = {
  listings?: Listing[];
  listing?: Listing;
  height?: string;
  selectedListingId?: string | null;
};

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export default function GoogleMapComponent({ listings, listing, height = "500px", selectedListingId }: GoogleMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  // Determine which listings to show
  const propertiesToShow = useMemo(() => {
    if (listing) return [listing];
    if (listings) return listings;
    return [];
  }, [listing, listings]);

  // Get properties with addresses
  const propertiesWithAddresses = useMemo(() => {
    const filtered = propertiesToShow.filter(p => p.address && p.address.trim());
    console.log(`GoogleMap: ${filtered.length} properties with addresses out of ${propertiesToShow.length} total`);
    return filtered;
  }, [propertiesToShow]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });

  // If no API key, use iframe embed
  if (!apiKey) {
    console.error("Google Maps API Key Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Falling back to iframe embed. To show multiple markers, please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.");
    return <EmbedMapFallback properties={propertiesWithAddresses} height={height} />;
  }

  // If API key exists but not loaded yet, show loading
  if (!isLoaded) {
    return (
      <div className="card p-6 text-center" style={{ height }}>
        <p className="opacity-70">Loading map...</p>
      </div>
    );
  }

  // If there's a load error, fall back to embed
  if (loadError) {
    console.error("Google Maps API Load Error:", loadError);
    console.error("Failed to load Google Maps JavaScript API. Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Falling back to iframe embed.");
    return <EmbedMapFallback properties={propertiesWithAddresses} height={height} />;
  }

  return (
    <MapWithMarkers 
      properties={propertiesWithAddresses} 
      height={height}
      isLoaded={isLoaded}
      selectedListingId={selectedListingId}
    />
  );
}

// Fallback to iframe embed when API key is not available
function EmbedMapFallback({ properties, height }: { properties: Listing[]; height: string }) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || "1FjdzczdBlhZ5gV1nAh7IBLpomib8Abg";
  
  let mapUrl: string;
  if (properties.length === 0) {
    mapUrl = `https://www.google.com/maps/d/embed?mid=${mapId}&ehbc=2E312F`;
  } else if (properties.length === 1) {
    const address = `${properties[0].address}, ${properties[0].city}`.trim();
    mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  } else {
    // For multiple properties, use Google My Maps (which can show multiple markers)
    // Or create a search that shows multiple locations
    // Since embed API doesn't support multiple markers well, use My Maps
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || "1FjdzczdBlhZ5gV1nAh7IBLpomib8Abg";
    mapUrl = `https://www.google.com/maps/d/embed?mid=${mapId}&ehbc=2E312F`;
    
    // Alternative: Try to show all addresses in search (may not work perfectly)
    // const addresses = properties
    //   .map(p => `${p.address}, ${p.city}`.trim())
    //   .join('|');
    // mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(addresses)}/data=!3m1!4b1?output=embed`;
  }

  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ height }}>
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// Map with markers using JavaScript API
function MapWithMarkers({ properties, height, isLoaded, selectedListingId }: { properties: Listing[]; height: string; isLoaded: boolean; selectedListingId?: string | null }) {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [markers, setMarkers] = useState<Array<{ listing: Listing; position: { lat: number; lng: number } }>>([]);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (isLoaded && !geocoder) {
      setGeocoder(new google.maps.Geocoder());
    }
  }, [isLoaded, geocoder]);

  useEffect(() => {
    if (!isLoaded || !geocoder || properties.length === 0) {
      if (properties.length === 0) {
        setMarkers([]);
      }
      return;
    }

    const geocodeAll = async () => {
      console.log(`Geocoding ${properties.length} properties...`);
      const results = await Promise.allSettled(
        properties.map(async (prop) => {
          try {
            const address = `${prop.address}, ${prop.city}`.trim();
            const result = await geocoder!.geocode({ address });
            if (result.results[0]) {
              const loc = result.results[0].geometry.location;
              return {
                listing: prop,
                position: { lat: loc.lat(), lng: loc.lng() },
              };
            }
            console.warn(`Geocoding failed for: ${address}`);
            return null;
          } catch (error) {
            console.error(`Error geocoding ${prop.address}:`, error);
            return null;
          }
        })
      );

      const validMarkers = results
        .filter((r) => r.status === "fulfilled" && r.value !== null)
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter((m): m is NonNullable<typeof m> => m !== null);

      console.log(`Successfully geocoded ${validMarkers.length} out of ${properties.length} properties`);
      if (validMarkers.length === 0 && properties.length > 0) {
        console.error("Google Maps Geocoding Error: Failed to geocode any properties. Check that addresses are valid.");
      }
      if (validMarkers.length < properties.length) {
        console.warn(`Google Maps Geocoding Warning: Only ${validMarkers.length} out of ${properties.length} properties were successfully geocoded.`);
      }
      setMarkers(validMarkers);
    };

    geocodeAll();
  }, [isLoaded, geocoder, properties]);

  const center = useMemo(() => {
    if (markers.length === 0) {
      return { lat: 45.4215, lng: -75.6972 }; // Default to Ottawa
    }
    if (markers.length === 1) {
      return markers[0].position;
    }
    const avgLat = markers.reduce((sum, m) => sum + m.position.lat, 0) / markers.length;
    const avgLng = markers.reduce((sum, m) => sum + m.position.lng, 0) / markers.length;
    return { lat: avgLat, lng: avgLng };
  }, [markers]);

  const defaultZoom = useMemo(() => (markers.length === 1 ? 15 : 12), [markers.length]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend(marker.position);
      });
      map.fitBounds(bounds);
    }
  }, [markers]);

  // Handle selectedListingId changes to open InfoWindow and pan to marker
  useEffect(() => {
    if (!selectedListingId || markers.length === 0 || !map) return;
    
    const markerIndex = markers.findIndex(m => m.listing.id === selectedListingId);
    if (markerIndex !== -1) {
      setSelectedMarker(markerIndex);
      // Pan to the selected marker
      map.panTo(markers[markerIndex].position);
      // Optionally zoom in a bit
      if (map.getZoom() && map.getZoom()! < 14) {
        map.setZoom(14);
      }
    }
  }, [selectedListingId, markers, map]);

  if (markers.length === 0) {
    return (
      <div className="card p-6 text-center" style={{ height }}>
        <p className="opacity-70">Loading map locations...</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={defaultZoom}
        options={{
          disableDefaultUI: false,
          clickableIcons: true,
          scrollwheel: true,
        }}
        onLoad={onLoad}
      >
        {markers.map((marker, index) => (
          <Marker
            key={marker.listing.id}
            position={marker.position}
            onClick={() => setSelectedMarker(selectedMarker === index ? null : index)}
          >
            {selectedMarker === index && (
              <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                <div className="text-black">
                  <img 
                    src={(marker.listing.images && marker.listing.images[0]) || marker.listing.imageUrl || "/placeholder1.jpg"}
                    alt={marker.listing.title}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                  <h3 className="font-semibold text-sm mb-1">
                    <Link 
                      href={`/properties/${marker.listing.slug}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {marker.listing.title}
                    </Link>
                  </h3>
                  <p className="text-xs opacity-80 mb-1">
                    ${marker.listing.price.toLocaleString()} / month · {marker.listing.bedrooms} BR
                  </p>
                  {marker.listing.address && (
                    <p className="text-xs opacity-70">{marker.listing.address}, {marker.listing.city}</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  );
}

