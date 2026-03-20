import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'src',
  server: {
    port: 3000,
    open: '/ui.html',
    host: true
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        ui: './ui.html',
      },
      output: {
        entryFileNames: 'ui.js',
      },
    },
  },
});
