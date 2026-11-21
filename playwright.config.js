import {defineConfig} from '@playwright/test';

import {PORT, BROWSER_OPTIONS} from './tests/common.js';

export default defineConfig({
  testDir: 'tests',

  webServer: {
    command: 'npm run test:manual',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  use: {
    ...BROWSER_OPTIONS,
    browserName: 'chromium',
  },

  projects: [
    {
      name: 'extension',
      testMatch: 'tests/e2e/test_basic.js',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
