import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState } from "react";
import { Button, Card, CardContent, buttonVariants, cn } from "@leaselab/ui-components";
import PropertyMap from "~/components/PropertyMap";
import { fetchProperties, fetchSiteConfig } from "~/lib/api-client";
import { applyFilters, sortByStatus } from "~/lib/filters";
import ListingCard from "~/components/ListingCard";
import Filters from "~/components/Filters";
import TabbedLayout from "~/components/TabbedLayout";
import AboutSection from "~/components/AboutSection";
import ContactForm from "~/components/ContactForm";

export const meta: MetaFunction = () => {
  return [
    { title: "Rental Properties - Find Your Perfect Home" },
    { name: "description", content: "Browse available rental properties in your area and apply online" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Handle both Cloudflare Pages and Vite dev mode
  const env = (context as any).cloudflare?.env || (typeof process !== "undefined" ? process.env : {});
  const url = new URL(request.url);

  // Get filter params
  const filters = {
    city: url.searchParams.get("city") || undefined,
    bedrooms: url.searchParams.get("bedrooms") || undefined,
    bathrooms: url.searchParams.get("bathrooms") || undefined,
    max: url.searchParams.get("max") || undefined,
    status: url.searchParams.get("status") || undefined,
    pet: url.searchParams.get("pet") || undefined,
  };

  try {
    // Fetch data from backend API
    const [allListings, siteConfig] = await Promise.all([
      fetchProperties(env, filters),
      fetchSiteConfig(env),
    ]);

    const filtered = applyFilters(allListings, filters);
    const sorted = sortByStatus(filtered);

    return json({
      listings: sorted,
      allListings,
      siteConfig,
      mapsApiKey: env.GOOGLE_MAPS_API_KEY || undefined,
      hasFilters: Object.values(filters).some(Boolean),
    });
  } catch (error: any) {
    console.error('Error loading data:', error);
    return new Response(`Failed to load properties: ${error.message || error}`, { status: 500 });
  }
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const { listings, allListings, siteConfig, hasFilters, mapsApiKey } = data as {
    listings: any[];
    allListings: any[];
    siteConfig: any;
    hasFilters: boolean;
    mapsApiKey: string | undefined;
  };
  const [searchParams] = useSearchParams();
  const [showMap, setShowMap] = useState(true);

  // Build query string for property links
  const queryString = searchParams.toString();

  const tabs = [
    {
      id: "overview",
      label: "Residential Listings",
      content: (
        <div className="space-y-6">
          {hasFilters && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go back to All Listings
            </Link>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Browse Listings</h2>
              <Button variant="outline" onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}>
                {showMap ? "Hide Map" : "Show Map"}
              </Button>
            </div>
            {/* Filters take full width */}
            <Filters allListings={allListings} />
          </div>

          {listings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold">No listings match your filters</h3>
                <p className="opacity-70">
                  Try adjusting your search criteria to see more properties.
                </p>
                <Link
                  to="/"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "inline-flex items-center justify-center gap-2 mt-4"
                  )}
                >
                  Reset All Filters
                </Link>
              </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {showMap && (
                <div>
                  {/* Map takes full width, roughly half viewport height */}
                  <PropertyMap
                    listings={listings}
                    apiKey={mapsApiKey}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    queryString={queryString}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "apply",
      label: "Submit an Application",
      content: (
        <div className="space-y-6">
          <ContactForm listings={allListings} />
        </div>
      ),
    },
    {
      id: "about",
      label: "About",
      content: <AboutSection config={siteConfig} />,
    },
  ];

  return <TabbedLayout tabs={tabs} defaultTab="overview" />;
}
