import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Split large vendor libraries into separate chunks so the initial JS bundle stays small.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
          qr: ['qrcode.react', 'html5-qrcode'],
          icons: ['react-icons'],
        },
      },
    },
  },
});
