import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/cftc-api': {
        target: 'https://publicreporting.cftc.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cftc-api/, '/resource')
      }
    }
  }
});
