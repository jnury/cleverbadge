import { defineConfig, devices } from '@playwright/test';

// Allow custom ports for parallel testing with dev environment
const BACKEND_PORT = process.env.TEST_BACKEND_PORT || '3000';
const FRONTEND_PORT = process.env.TEST_FRONTEND_PORT || '5173';
const POSTGRES_PORT = process.env.TEST_POSTGRES_PORT || '5432';

// Check if we should reuse existing servers (started by start-test.sh)
// Set PLAYWRIGHT_REUSE_SERVER=1 when servers are already running externally
const reuseExistingServer = !!process.env.PLAYWRIGHT_REUSE_SERVER;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'line',
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 10000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: reuseExistingServer ? [] : [
    {
      command: 'cd ../backend && npm run reset-test-schema && npm run dev:e2e',
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL || `postgresql://cleverbadge_test:cleverbadge_test@localhost:${POSTGRES_PORT}/cleverbadge`,
        NODE_ENV: 'testing',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-for-e2e-tests',
        PORT: BACKEND_PORT
      }
    },
    {
      command: 'npx vite',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        VITE_API_URL: process.env.VITE_API_URL || `http://localhost:${BACKEND_PORT}`,
        PORT: FRONTEND_PORT
      }
    }
  ]
});
