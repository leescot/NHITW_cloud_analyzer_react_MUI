import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';

import {BROWSER_OPTIONS, BROWSER_HEADLESS} from './tests/common.js';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    include: ['tests/unit/test_*.js'],
    browser: {
      enabled: true,
      provider: playwright(BROWSER_OPTIONS),
      headless: BROWSER_HEADLESS,
      instances: [
        {browser: 'chromium'},
      ],
    },
  },
});
