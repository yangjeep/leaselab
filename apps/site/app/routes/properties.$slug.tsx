import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState } from "react";
import { fetchPropertyById, fetchProperties, fetchSiteConfig } from "~/lib/api-client";
import ListingGallery from "~/components/ListingGallery";
import TabbedLayout from "~/components/TabbedLayout";
import ContactForm from "~/components/ContactForm";
import AboutSection from "~/components/AboutSection";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.listing) {
    return [{ title: "Property Not Found" }];
  }
  return [
    { title: `${data.listing.title} - Rental Properties` },
    { name: "description", content: `${data.listing.bedrooms} bedroom property in ${data.listing.city} for $${data.listing.price}/month` },
  ];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  // Handle both Cloudflare Pages and Vite dev mode
  const env = (context as any).cloudflare?.env || process.env;
  const { slug } = params;

  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    // Fetch data from backend API
    const [listing, allListings, siteConfig] = await Promise.all([
      fetchPropertyById(env, slug),
      fetchProperties(env),
      fetchSiteConfig(env),
    ]);

    return json({ listing, allListings, siteConfig });
  } catch (error) {
    console.error('Error loading property:', error);
    throw new Response("Property not found", { status: 404 });
  }
}

export default function PropertyDetail() {
  const { listing, allListings, siteConfig } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  const gallery = listing.images && listing.images.length > 0
    ? listing.images
    : [listing.imageUrl || "/placeholder1.jpg", "/placeholder2.jpg"];

  // Build back URL with preserved filters
  const backUrl = searchParams.toString() ? `/?${searchParams.toString()}` : "/";

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <article className="space-y-6">
          <Link
            to={backUrl}
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

          <ListingGallery images={gallery} alt={listing.title} />

          <div className="text-lg">
            ${listing.price.toLocaleString()} / month · {listing.bedrooms} BR · {listing.bathrooms} BA · {listing.city}
          </div>

          {listing.description && (
            <div className="opacity-90 whitespace-pre-line">{listing.description}</div>
          )}

          {/* Property Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Bedrooms" value={`${listing.bedrooms}`} />
            <DetailItem label="Bathrooms" value={`${listing.bathrooms || 'N/A'}`} />
            <DetailItem label="Status" value={listing.status} />
            <DetailItem label="Pets" value={listing.pets || 'Ask'} />
          </div>

          {/* Location */}
          {listing.address && (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Location</h2>
              <p className="text-sm opacity-70">{listing.address}</p>
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
          <ContactForm listings={allListings} selectedProperty={listing.id} />
        </div>
      ),
    },
    {
      id: "about",
      label: "About",
      content: <AboutSection config={siteConfig} />,
    },
  ];

  return <TabbedLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
