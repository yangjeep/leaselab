/**
 * D1 REST API Client
 * 
 * Uses d1-secret-rest REST API wrapper to query D1 databases.
 * Endpoint: https://leaselab-d1-rest.dwx-rental.workers.dev/rest/{table}
 */

type D1RestResponse<T = any> = {
  success: boolean;
  meta: {
    served_by?: string;
    served_by_region?: string;
    served_by_primary?: boolean;
    timings?: {
      sql_duration_ms: number;
    };
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  results: T[];
  error?: string;
};

type QueryParams = {
  sort_by?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  [key: string]: any; // Allow filtering by column names
};

/**
 * Fetch records from D1 table using REST API
 */
export async function fetchD1Records<T = any>(
  table: string,
  params?: QueryParams
): Promise<T[]> {
  const apiUrl = process.env.D1_REST_API_URL || "https://leaselab-d1-rest.dwx-rental.workers.dev";
  const apiToken = process.env.D1_REST_API_TOKEN;

  if (!apiToken) {
    throw new Error("Missing D1_REST_API_TOKEN environment variable");
  }

  // Build query string from params
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${apiUrl}/rest/${encodeURIComponent(table)}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `D1 REST API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: D1RestResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(
        `D1 REST API query failed: ${data.error || "Unknown error"}`
      );
    }

    return data.results;
  } catch (error) {
    console.error("[D1 REST Client] Error executing query:", error);
    if (error instanceof Error) {
      console.error("[D1 REST Client] Error message:", error.message);
    }
    throw error;
  }
}

/**
 * Fetch a single record by ID from D1 table
 */
export async function fetchD1Record<T = any>(
  table: string,
  id: string | number
): Promise<T | null> {
  const apiUrl = process.env.D1_REST_API_URL || "https://leaselab-d1-rest.dwx-rental.workers.dev";
  const apiToken = process.env.D1_REST_API_TOKEN;

  if (!apiToken) {
    throw new Error("Missing D1_REST_API_TOKEN environment variable");
  }

  const url = `${apiUrl}/rest/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(
        `D1 REST API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: D1RestResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(
        `D1 REST API query failed: ${data.error || "Unknown error"}`
      );
    }

    return data.results.length > 0 ? data.results[0] : null;
  } catch (error) {
    console.error("[D1 REST Client] Error fetching record:", error);
    if (error instanceof Error) {
      console.error("[D1 REST Client] Error message:", error.message);
    }
    throw error;
  }
}

