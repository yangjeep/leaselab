/// <reference types="@remix-run/cloudflare" />
/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

// Import Ops-specific environment types from centralized config
import type { OpsEnv } from '~/shared/config';

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: OpsEnv;
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}
