import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'edge-runtime',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts', 'apps/ops/app/lib/**/*.ts', 'apps/worker/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@leaselab/storage-core': path.resolve(__dirname, 'packages/storage-core/src'),
      '@leaselab/storage-cloudflare': path.resolve(__dirname, 'packages/storage-cloudflare/src'),
      '@leaselab/shared-types': path.resolve(__dirname, 'packages/shared-types/src'),
      '@leaselab/shared-utils': path.resolve(__dirname, 'packages/shared-utils/src'),
      '@leaselab/shared-config': path.resolve(__dirname, 'packages/shared-config/src'),
      '~/shared/types': path.resolve(__dirname, 'shared/types'),
      '~/shared/utils': path.resolve(__dirname, 'shared/utils'),
      '~/shared/config': path.resolve(__dirname, 'shared/config'),
      '~/shared/constants': path.resolve(__dirname, 'shared/constants'),
      '~/shared/storage-core': path.resolve(__dirname, 'shared/storage-core'),
      '~/shared/storage-cloudflare': path.resolve(__dirname, 'shared/storage-cloudflare'),
      '~': path.resolve(__dirname, 'apps/ops/app'),
    },
  },
});
