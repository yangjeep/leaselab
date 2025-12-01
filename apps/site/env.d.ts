/// <reference types="@remix-run/cloudflare" />
/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: {
        // Worker API configuration
        WORKER_URL?: string;
        SITE_API_TOKEN?: string;

        // Other environment variables
        GOOGLE_MAPS_API_KEY?: string;
        ENVIRONMENT?: string;

        // NO D1, KV, or R2 bindings!
        // All data access goes through Worker API
      };
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}

// Minimal global declaration to satisfy TS when using Google Maps JS API
declare global {
  interface Window {
    google?: any;
  }
}
