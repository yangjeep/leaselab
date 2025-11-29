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
      "@": path.resolve(__dirname, "./app"),
    },
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
    // @ts-expect-error - vite-tsconfig-paths uses vite 7.x types but apps use vite 5.x
    tsconfigPaths({ root: __dirname }),
  ],
});
