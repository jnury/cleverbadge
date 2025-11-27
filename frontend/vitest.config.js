import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000')
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.jsx', 'src/**/*.js'],
      exclude: ['**/*.test.jsx', '**/*.test.js', '**/node_modules/**']
    }
  }
});
