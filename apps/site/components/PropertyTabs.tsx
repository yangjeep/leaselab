"use client";
import { useState } from "react";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import ListingGallery from "@/components/ListingGallery";
import TabbedLayout, { type Tab } from "@/components/TabbedLayout";
import GoogleMap from "@/components/GoogleMap";
import AboutSection from "@/components/AboutSection";
import type { Listing } from "@/lib/types";

type PropertyTabsProps = {
  listing: Listing;
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function PropertyTabs({ listing, searchParams }: PropertyTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const gallery = listing.images && listing.images.length ? listing.images : [listing.imageUrl || "/placeholder1.jpg", "/placeholder2.jpg"];

  // Construct back URL with preserved filters
  const backUrl = (() => {
    if (!searchParams || Object.keys(searchParams).length === 0) {
      return "/";
    }
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  })();

  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <article className="space-y-6">
          <Link 
            href={backUrl}
            className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity mb-4"
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
            Go back to Listings
          </Link>
          <h1 className="text-3xl font-semibold">{listing.title}</h1>
          <ListingGallery images={gallery as string[]} alt={listing.title} />
          <div className="text-lg">
            {fmtPrice(listing.price)} / month · {listing.bedrooms} BR · {listing.city}
          </div>
          <div className="opacity-90 whitespace-pre-line">{listing.description}</div>
          
          {/* Map Section */}
          {listing.address && (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Location</h2>
              <p className="text-sm opacity-70">{listing.address}, {listing.city}</p>
              <GoogleMap listing={listing} height="400px" />
            </div>
          )}
          
          <button
            onClick={() => setActiveTab("apply")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Apply Now
          </button>
        </article>
      ),
    },
    {
      id: "apply",
      label: "Submit an Application",
      content: (
        <div className="space-y-6">
          <ContactForm listingTitle={listing.title} />
        </div>
      ),
    },
    {
      id: "about",
      label: "About",
      content: <AboutSection />,
    },
  ];

  return <TabbedLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
}

function fmtPrice(n: number) {
  return `$${(n || 0).toLocaleString()}`;
}

