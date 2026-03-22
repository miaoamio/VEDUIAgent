import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootDir = path.resolve(__dirname, 'src');

export default defineConfig({
  plugins: [react()],
  root: rootDir,
  server: {
    port: 3001,
    open: '/admin.html',
    host: true,
  },
  build: {
    target: 'esnext',
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        admin: path.resolve(rootDir, 'admin.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
