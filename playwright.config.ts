import { defineConfig, devices } from '@playwright/test';

const devServerPort = Number(process.env.E2E_PORT ?? 5173);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${devServerPort}`;
const shouldStartServer = process.env.E2E_SKIP_SERVER !== '1';
const serverCommand = process.env.E2E_SERVER_CMD ?? 'npm run dev:ops';

export default defineConfig({
  testDir: './apps/ops/tests',
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  use: {
    baseURL,
    headless: process.env.CI ? true : undefined,
    trace: 'on-first-retry',
  },
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartServer
    ? {
        command: serverCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
