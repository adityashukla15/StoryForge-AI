import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolveApiBaseUrl } from './src/lib/api/apiConfig';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  resolveApiBaseUrl(environment.VITE_API_BASE_URL, mode === 'production');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },
  };
});
