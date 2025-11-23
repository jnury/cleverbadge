import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      include: ['routes/**', 'middleware/**', 'utils/**', 'db/**'],
      exclude: ['**/*.test.js', '**/node_modules/**']
    },
    testTimeout: 10000,
    // Run test files sequentially to avoid schema creation conflicts
    fileParallelism: false
  }
});
