// Types intentionally omitted to avoid environment-specific type errors
// import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState } from "react";
import { fetchUnitById, fetchProperties, fetchSiteConfig } from "~/lib/api-client";
import ListingGallery from "~/components/ListingGallery";
import TabbedLayout from "~/components/TabbedLayout";
import ContactForm from "~/components/ContactForm";
import AboutSection from "~/components/AboutSection";

export const meta = ({ data }: any) => {
  if (!data?.unit) {
    return [{ title: "Unit Not Found" }];
  }
  const title = data.unit.name || `${data.unit.property?.name || "Property"} - Unit ${data.unit.unitNumber}`;
  const city = data.unit.property?.city || "";
  const price = data.unit.rentAmount;
  const beds = data.unit.bedrooms;
  return [
    { title: `${title} - Rental Unit` },
    { name: "description", content: `${beds} BR unit in ${city} for $${price}/month` },
  ];
};

export async function loader({ params, context }: any) {
  const env = (context as any)?.cloudflare?.env || process.env;
  const { id } = params;

  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    const [unit, allListings, siteConfig] = await Promise.all([
      fetchUnitById(env, id),
      fetchProperties(env),
      fetchSiteConfig(env),
    ]);

    return { unit, allListings, siteConfig };
  } catch (error) {
    console.error('Error loading unit:', error);
    throw new Response("Unit not found", { status: 404 });
  }
}

export default function UnitDetail() {
  const { unit, allListings, siteConfig } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  const images = Array.isArray(unit.images) && unit.images.length > 0 ? unit.images : [];
  const fallbackImage = unit.property?.images && unit.property.images[0] ? unit.property.images[0] : "/placeholder1.jpg";
  const gallery = images.length > 0 ? images : [fallbackImage, "/placeholder2.jpg"]; 

  const backUrl = searchParams.toString() ? `/?${searchParams.toString()}` : "/";

  const title = unit.name || `${unit.property?.name || "Property"} - Unit ${unit.unitNumber}`;
  const city = unit.property?.city || "";

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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Go back to Listings
          </Link>

          <h1 className="text-3xl font-semibold">{title}</h1>

          <ListingGallery images={gallery} alt={title} />

          <div className="text-lg">
            ${unit.rentAmount.toLocaleString()} / month · {unit.bedrooms} BR · {unit.bathrooms ?? 'N/A'} BA · {city}
          </div>

          {unit.description && (
            <div className="opacity-90 whitespace-pre-line">{unit.description}</div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Bedrooms" value={`${unit.bedrooms}`} />
            <DetailItem label="Bathrooms" value={`${unit.bathrooms ?? 'N/A'}`} />
            <DetailItem label="Status" value={unit.status} />
            {unit.sqft && <DetailItem label="Square Feet" value={`${unit.sqft}`} />}
          </div>

          {unit.property?.address && (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Location</h2>
              <p className="text-sm opacity-70">{unit.property.address}</p>
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
          <ContactForm listings={allListings} selectedProperty={unit.propertyId} />
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
