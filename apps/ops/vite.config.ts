import {
  vitePlugin as remix,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      "@leaselab/storage-core": path.resolve(__dirname, "../../packages/storage-core/src"),
      "@leaselab/storage-cloudflare": path.resolve(__dirname, "../../packages/storage-cloudflare/src"),
    },
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths({ root: __dirname }),
  ],
});
