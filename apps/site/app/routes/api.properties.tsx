import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getListings } from "~/lib/db.server";
import { getSiteId } from "~/lib/site.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);

  try {
    const listings = await getListings(db, siteId);

    // Return in format expected by existing clients
    const formattedListings = listings.map((listing) => ({
      recordId: listing.id,
      title: listing.title,
      status: listing.status,
    }));

    return json(formattedListings, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return json([], { status: 500 });
  }
}
