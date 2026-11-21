import {test, expect, chromium} from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {tmpdir} from 'os';
import {setTimeout as delay} from 'timers/promises';

import {PORT, BROWSER_KEEP} from '../common.js';

test.describe('Basic Tests', () => {
  let extensionPath;
  let userDataDir;
  let context;

  test.beforeAll(async () => {
    extensionPath = path.resolve('dist');
    userDataDir = fs.mkdtempSync(path.join(tmpdir(), 'nhitw-extension-test-'));

    console.debug('Launching browser with profile: %s', userDataDir);
    context = await chromium.launchPersistentContext(
      userDataDir,
      {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
        locale: 'zh-TW',
        timezoneId: 'Asia/Taipei',
      },
    );
  });

  test.afterAll(async () => {
    if (context) {
      if (BROWSER_KEEP) {
        console.debug("Waiting for browser shutdown ...");
        test.setTimeout(3600000);
        await context.waitForEvent('close');
      } else {
        await context.close();
      }
    }

    if (userDataDir) {
      const time = Date.now();
      while (true) {
        try {
          fs.rmSync(userDataDir, {recursive: true, force: true});
          break;
        } catch (ex) {
          if (Date.now() - time >= 5000) {
            throw ex;
          }
        }
      }
    }
  });

  test('should show float button in the page', async () => {
    const [page] = context.pages();
    await page.goto(`http://localhost:${PORT}`);
    await expect(page.locator('#nhi-floating-root button img')).toHaveCount(1);
  });
});
