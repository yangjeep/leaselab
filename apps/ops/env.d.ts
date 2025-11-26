/// <reference types="@remix-run/cloudflare" />
/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

// Import shared environment types from centralized config
import type { CloudflareEnv } from '~/shared/config';

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnv;
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}
