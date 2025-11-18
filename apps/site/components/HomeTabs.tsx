"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import TabbedLayout, { type Tab } from "@/components/TabbedLayout";
import GoogleMap from "@/components/GoogleMap";
import AboutSection from "@/components/AboutSection";
import ContactForm from "@/components/ContactForm";
import type { Listing } from "@/lib/types";

type HomeTabsProps = {
  filteredListings: Listing[];
  allListings?: Listing[];
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomeTabs({ filteredListings, allListings, searchParams }: HomeTabsProps) {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  
  // Construct query string for property links
  const queryString = (() => {
    if (!searchParams || Object.keys(searchParams).length === 0) return "";
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    return params.toString();
  })();
  
  // Check if any filters are applied
  const hasFilters = searchParams && Object.keys(searchParams).length > 0;
  
  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Residential Listings",
      content: (
        <div className="space-y-6">
          {hasFilters && (
            <Link 
              href="/" 
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
          <Suspense fallback={<div className="card p-4">Loading filters...</div>}>
            <Filters allListings={allListings || filteredListings} />
          </Suspense>
          
          {/* No Results Banner */}
          {filteredListings.length === 0 ? (
            <div className="card p-8 text-center">
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
                  href="/" 
                  className="inline-flex items-center gap-2 btn mt-4"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset All Filters
                </Link>
              </div>
            </div>
          ) : (
            // Combined Map and Listings Layout
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Map Section - 70% on desktop */}
              <div className="w-full lg:w-[70%]">
                <GoogleMap 
                  listings={filteredListings} 
                  height="600px" 
                  selectedListingId={selectedListingId}
                />
              </div>
              {/* Listings Section - 30% on desktop */}
              <div className="w-full lg:w-[30%] lg:max-h-[600px] lg:overflow-y-auto lg:pr-2">
                <div className="flex flex-col gap-6">
                  {filteredListings.map((l: Listing) => (
                    <ListingCard 
                      key={l.id} 
                      listing={l}
                      queryString={queryString}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedListingId(l.id);
                      }}
                      isSelected={selectedListingId === l.id}
                    />
                  ))}
                </div>
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
          <ContactForm listingTitle="General Inquiry" />
        </div>
      ),
    },
    {
      id: "about",
      label: "About",
      content: <AboutSection />,
    },
  ];

  return <TabbedLayout tabs={tabs} defaultTab="overview" />;
}

