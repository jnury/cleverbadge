import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables before tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['routes/**', 'middleware/**', 'utils/**', 'db/**'],
      exclude: ['**/*.test.js', '**/node_modules/**']
    },
    testTimeout: 10000,
    // Run test files sequentially to avoid schema creation conflicts
    fileParallelism: false
  }
});
