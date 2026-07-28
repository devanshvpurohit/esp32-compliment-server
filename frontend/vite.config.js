import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api/* to the Vercel dev server when running `npm run dev`
    // (only needed for local development; in production both are on the same domain)
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
