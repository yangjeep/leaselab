import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();

  const propertyId = formData.get("propertyId") as string;
  const unitId = formData.get("unitId") as string | null;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const moveInDate = formData.get("moveInDate") as string;
  const employmentStatus = formData.get("employmentStatus") as string;
  // monthlyIncome removed from public submission
  const message = formData.get("message") as string;
  const fileIdsJson = formData.get("fileIds") as string;

  // Parse fileIds from JSON
  let fileIds: string[] = [];
  if (fileIdsJson) {
    try {
      fileIds = JSON.parse(fileIdsJson);
    } catch (e) {
      console.error("Failed to parse fileIds:", e);
    }
  }

  // Check if this is a General Inquiry
  const isGeneralInquiry = propertyId === "general";

  // Validate required fields
  if (!propertyId || !firstName || !lastName || !email || !phone) {
    return json(
      { error: "Property, name, email, and phone are required" },
      { status: 400 }
    );
  }

  // General Inquiries should not have attachments
  if (isGeneralInquiry && fileIds.length > 0) {
    return json(
      { error: "File attachments are not allowed for general inquiries" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 320) {
    return json({ error: "Invalid email format" }, { status: 400 });
  }

  // Handle both Cloudflare Pages and Vite dev mode
  const env = (context as any).cloudflare?.env || (typeof process !== "undefined" ? process.env : {});
  const workerUrl = env.WORKER_URL;
  const siteApiToken = env.SITE_API_TOKEN;

  if (!workerUrl) {
    console.error("WORKER_URL not configured");
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!siteApiToken) {
    console.error("SITE_API_TOKEN not configured");
    return json({ error: "Authentication not configured" }, { status: 500 });
  }

  try {
    // Prepare payload - General Inquiries have simplified requirements
    const payload: any = {
      propertyId,
      firstName,
      lastName,
      email,
      phone,
      message,
    };

    // Only include these fields for non-general inquiries (actual applications)
    if (!isGeneralInquiry) {
      payload.unitId = unitId || undefined;
      payload.employmentStatus = employmentStatus || "employed";
      payload.moveInDate = moveInDate || new Date().toISOString().split("T")[0];
      payload.fileIds = fileIds.length > 0 ? fileIds : undefined;
    }

    // Submit to Worker API
    const response = await fetch(`${workerUrl}/api/public/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${siteApiToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ops API error:", errorData);
      return json(
        { error: "Failed to submit application. Please try again." },
        { status: 500 }
      );
    }

    // Return success (fetcher will handle navigation)
    return json({ success: true });
  } catch (error) {
    console.error("Form submission error:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Handle GET requests (Remix may fetch this route after redirect)
export async function loader() {
  return json({ success: true });
}
