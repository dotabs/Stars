import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH && env.VITE_BASE_PATH.trim() ? env.VITE_BASE_PATH : '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('world-atlas') || id.includes('topojson-client') || id.includes('\\d3\\')) {
              return 'globe-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
