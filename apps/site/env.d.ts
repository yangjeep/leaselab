/// <reference types="@remix-run/cloudflare" />
/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: {
        DB: D1Database;
        SESSION_KV: KVNamespace;
        FILE_BUCKET: R2Bucket;
        OPS_API_URL: string;
        GOOGLE_MAPS_API_KEY: string;
        ENVIRONMENT: string;
        R2_PUBLIC_URL?: string;
      };
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}
