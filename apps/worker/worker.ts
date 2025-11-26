// apps/worker/worker.ts
import { validateApiToken } from "../ops/app/lib/api-auth.server";
import {
    getProperties,
    getPropertyById,
    createLead,
    // add other needed functions as needed
} from "../ops/app/lib/db.server";

export interface Env {
    DB: D1Database;
    SESSION_KV: KVNamespace;
    FILE_BUCKET: R2Bucket;
}

/** Helper to extract site_id from token or query */
async function resolveSiteId(request: Request, env: Env): Promise<string | null> {
    const auth = request.headers.get("Authorization");
    const url = new URL(request.url);
    const siteIdFromQuery = url.searchParams.get("site_id");

    if (auth && auth.startsWith("Bearer ")) {
        const token = auth.substring(7).trim();
        const siteId = await validateApiToken(token, env.DB);
        return siteId;
    }

    // No token – require explicit site_id for ops flow
    return siteIdFromQuery;
}

/** Simple router – only a subset of CRUD is implemented for demo */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const siteId = await resolveSiteId(request, env);
        if (!siteId) {
            return new Response(JSON.stringify({ success: false, error: "Missing or invalid authentication" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname.replace(/^\//, ""); // e.g. "properties"
        const method = request.method.toUpperCase();

        try {
            // ----- Properties -----
            if (pathname.startsWith("properties")) {
                if (method === "GET") {
                    // list or get by id
                    const id = pathname.split("/")[1];
                    if (id) {
                        const prop = await getPropertyById(env.DB, siteId, id);
                        return new Response(JSON.stringify({ success: true, data: prop }), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        });
                    }
                    const props = await getProperties(env.DB, siteId);
                    return new Response(JSON.stringify({ success: true, data: props }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                // POST – create a new property (placeholder implementation)
                if (method === "POST") {
                    const body = await request.json();
                    // In a real implementation you would call a create function.
                    // Here we simply echo back the payload.
                    return new Response(JSON.stringify({ success: true, data: body }), {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }

            // ----- Leads -----
            if (pathname.startsWith("leads")) {
                if (method === "POST") {
                    const body = await request.json();
                    const result = await createLead(env.DB, siteId, body as any);
                    return new Response(JSON.stringify({ success: true, data: result }), {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }

            // Add further routes (units, work_orders, etc.) following the same pattern.

            return new Response(JSON.stringify({ success: false, error: "Not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ success: false, error: e.message || "Server error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
} as ExportedHandler<Env>;
