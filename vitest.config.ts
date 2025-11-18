import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts', 'apps/ops/app/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@leaselab/storage-core': path.resolve(__dirname, 'packages/storage-core/src'),
      '@leaselab/storage-cloudflare': path.resolve(__dirname, 'packages/storage-cloudflare/src'),
      '@leaselab/shared-types': path.resolve(__dirname, 'packages/shared-types/src'),
      '@leaselab/shared-utils': path.resolve(__dirname, 'packages/shared-utils/src'),
      '@leaselab/shared-config': path.resolve(__dirname, 'packages/shared-config/src'),
      '~': path.resolve(__dirname, 'apps/ops/app'),
    },
  },
});
