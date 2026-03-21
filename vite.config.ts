import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// https://vitejs.dev/config/
const rootDir = path.resolve(__dirname, 'src');

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: rootDir,
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
        ui: path.resolve(rootDir, 'ui.html'),
      },
      output: {
        entryFileNames: 'ui.js',
      },
    },
  },
});
