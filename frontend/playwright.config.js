import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'line',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
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
  webServer: [
    {
      command: 'cd ../backend && npm run reset-test-schema && npm run dev:e2e',
      url: 'http://localhost:3000/health',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://cleverbadge_dev:cleverbadge_dev@localhost:5432/cleverbadge',
        NODE_ENV: 'testing',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-for-e2e-tests'
      }
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3000'
      }
    }
  ]
});
