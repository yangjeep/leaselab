import { NextResponse } from "next/server";
import { fetchListings } from "@/lib/fetchListings";

export async function GET() {
  try {
    const listings = await fetchListings();
    // Return titles, record IDs, and status for the dropdown
    // Use D1 id field (already a string) as recordId
    const properties = listings
      .map((listing) => ({
        title: listing.title,
        recordId: listing.id,
        status: listing.status,
      }))
      .sort((a, b) => {
        // Sort by status: Available first, then Pending, then Rented
        const statusOrder: Record<string, number> = {
          'Available': 1,
          'Pending': 2,
          'Rented': 3
        };
        const aOrder = statusOrder[a.status] || 999;
        const bOrder = statusOrder[b.status] || 999;
        return aOrder - bOrder;
      });
    return NextResponse.json(properties);
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

