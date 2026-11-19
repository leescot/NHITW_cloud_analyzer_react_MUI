import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    include: ['tests/test_*.js'],
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          executablePath: process.env.NHITW_BROWSER_EXE || void 0,
          channel: 'chromium',
        },
        contextOptions: {
          locale: 'zh-TW',
          timezoneId: 'Asia/Taipei',
        },
      }),
      headless: !process.env.NHITW_BROWSER_HEADED,
      instances: [
        {browser: 'chromium'},
      ],
    },
  },
});
