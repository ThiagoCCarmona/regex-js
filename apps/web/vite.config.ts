import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento o Vite serve o site (5173) e repassa /ws e /health ao
// servidor Node (API_URL, padrão http://localhost:3000). Em produção o próprio
// servidor Node serve o build.
const API = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ws': { target: API.replace(/^http/, 'ws'), ws: true },
      '/health': API,
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
  },
});
