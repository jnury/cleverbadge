import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(packageJson.version)
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173
  }
});
