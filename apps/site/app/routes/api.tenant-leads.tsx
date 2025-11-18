import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();

  const propertyId = formData.get("propertyId") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const moveInDate = formData.get("moveInDate") as string;
  const employmentStatus = formData.get("employmentStatus") as string;
  const monthlyIncome = formData.get("monthlyIncome") as string;
  const message = formData.get("message") as string;

  // Validate required fields
  if (!propertyId || !firstName || !lastName || !email || !phone) {
    return json(
      { error: "Property, name, email, and phone are required" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 320) {
    return json({ error: "Invalid email format" }, { status: 400 });
  }

  // Get Ops API URL from environment
  const opsApiUrl = context.cloudflare.env.OPS_API_URL;

  if (!opsApiUrl) {
    console.error("OPS_API_URL not configured");
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Submit to Ops API
    const response = await fetch(`${opsApiUrl}/api/public/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId: propertyId === "other" ? "general" : propertyId,
        firstName,
        lastName,
        email,
        phone,
        employmentStatus: employmentStatus || "employed",
        monthlyIncome: monthlyIncome ? parseInt(monthlyIncome, 10) : 5000,
        moveInDate: moveInDate || new Date().toISOString().split("T")[0],
        message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ops API error:", errorData);
      return json(
        { error: "Failed to submit application. Please try again." },
        { status: 500 }
      );
    }

    // Redirect to thank you page on success
    return redirect("/thank-you");
  } catch (error) {
    console.error("Form submission error:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Handle GET requests (not allowed for this route)
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
