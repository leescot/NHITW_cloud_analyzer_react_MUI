import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      formats: ['iife'],
      entry: {
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/contentScript.jsx')
      },
      name: 'NHIExtractor',
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        extend: true,
      }
    },
    emptyOutDir: false, // Don't delete the main build files
  },
});