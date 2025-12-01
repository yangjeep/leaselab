import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Get environment config
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

    // Check Content-Length header (Layer 2 validation from PRD)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return json(
        { error: "File size exceeds maximum of 5MB", maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string | null;

    if (!file) {
      return json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (Layer 3 validation)
    if (file.size > MAX_FILE_SIZE) {
      return json(
        { error: "File size exceeds maximum of 5MB", maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }

    // Create new FormData for worker API
    const workerFormData = new FormData();
    workerFormData.append('file', file);
    if (fileType) {
      workerFormData.append('fileType', fileType);
    }

    // Forward to Worker API with authentication
    const response = await fetch(`${workerUrl}/api/public/leads/files/upload`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${siteApiToken}`,
      },
      body: workerFormData,
      // Note: Don't set Content-Type header - let fetch set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
      console.error("Worker API error:", errorData);

      // Return appropriate error status
      return json(
        { error: errorData.error || "Failed to upload file" },
        { status: response.status }
      );
    }

    // Return success response from worker
    const result = await response.json();
    return json(result, { status: 201 });

  } catch (error) {
    console.error("File upload error:", error);
    return json(
      { error: "An unexpected error occurred during upload" },
      { status: 500 }
    );
  }
}

// Handle GET requests (not allowed for this route)
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
