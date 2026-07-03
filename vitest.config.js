import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.js'],
    include: ['tests/test_*.js', 'tests/*.test.{js,jsx}'],
  },
});
