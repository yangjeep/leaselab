import {
  vitePlugin as remix,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^~\/shared\/types$/, replacement: path.resolve(__dirname, "../../shared/types") },
      { find: /^~\/shared\/utils$/, replacement: path.resolve(__dirname, "../../shared/utils") },
      { find: /^~\/shared\/config$/, replacement: path.resolve(__dirname, "../../shared/config") },
      { find: /^~\/shared\/storage-core$/, replacement: path.resolve(__dirname, "../../shared/storage-core") },
      { find: /^~\/shared\/storage-cloudflare$/, replacement: path.resolve(__dirname, "../../shared/storage-cloudflare") },
      { find: "~", replacement: path.resolve(__dirname, "./app") },
    ],
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
    // @ts-expect-error - vite-tsconfig-paths uses vite 7.x types but apps use vite 5.x
    tsconfigPaths({ root: __dirname }),
  ],
});
