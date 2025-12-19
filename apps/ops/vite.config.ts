import {
  vitePlugin as remix,
} from "@remix-run/dev";
import { defineConfig, type PluginOption } from "vite";
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
  build: {
    // Enable tree-shaking and minification
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Remix handle chunking
      },
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
    tsconfigPaths({ root: __dirname }) as PluginOption,
  ],
});
