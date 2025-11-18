import { NextRequest, NextResponse } from "next/server";
import { submitLeadToOps, mapEmploymentStatus } from "@/lib/opsClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyRecordId, name, email, phone, message, moveInDate, numberOfOccupants, employmentStatus } = body;

    // Validate required fields
    if (!propertyRecordId || !name || !email || !phone) {
      return NextResponse.json(
        { error: "Property, name, email, and phone are required" },
        { status: 400 }
      );
    }

    // Validate email format
    // Using a simpler regex to avoid ReDoS vulnerabilities
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email) || email.length > 320) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const token = process.env.BASEROW_TENANT_WR_TOKEN;
    const tableId = "740125";

    if (!token) {
      console.error("Missing BASEROW_TENANT_WR_TOKEN");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Prepare Baserow record - field names must match exactly as in Baserow table
    const rowData: Record<string, any> = {
      "Name": name,
      "Email": email,
      "Phone Number": phone,
    };

    // Only include property link if it's not "other-inquiries"
    if (propertyRecordId !== "other-inquiries") {
      const propertyId = parseInt(propertyRecordId, 10);
      if (!isNaN(propertyId)) {
        rowData["Title (from Property)"] = [propertyId];
      }
    }

    if (moveInDate) {
      rowData["Ideal Move-in Date"] = moveInDate;
    }

    if (numberOfOccupants) {
      const numOccupants = Number(numberOfOccupants);
      if (!isNaN(numOccupants) && numOccupants > 0) {
        rowData["Number of Occupants"] = numOccupants;
      }
    }

    if (employmentStatus) {
      rowData["Employment Status"] = employmentStatus;
    }

    if (message) {
      rowData["Message"] = message;
    }

    // Submit to Baserow
    // Note: user_field_names=true allows us to use field names instead of field IDs
    const url = `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rowData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Baserow API error:", response.status, errorData);
      return NextResponse.json(
        { error: "Failed to submit form. Please try again." },
        { status: 500 }
      );
    }

    // Also submit to Ops API for AI evaluation pipeline
    if (process.env.OPS_API_URL && propertyRecordId !== "other-inquiries") {
      try {
        // Parse name into first and last name
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

        await submitLeadToOps({
          propertyId: propertyRecordId,
          firstName,
          lastName,
          email,
          phone,
          employmentStatus: mapEmploymentStatus(employmentStatus || "Employed"),
          monthlyIncome: 5000, // Default income - user can update later
          moveInDate: moveInDate || new Date().toISOString().split("T")[0],
          message,
        });
      } catch (opsError) {
        // Log but don't fail - Baserow submission succeeded
        console.error("Ops API submission error:", opsError);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Form submission error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

