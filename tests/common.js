import path from 'path';
import url from 'url';

const ROOT = path.resolve(url.fileURLToPath(import.meta.url), '..', 'localhost');
const PORT = process.env.NHITW_PORT ? Number(process.env.NHITW_PORT) : 5173;
const BROWSER_EXE = process.env.NHITW_BROWSER_EXE || void 0;
const BROWSER_HEADLESS = !process.env.NHITW_BROWSER_HEADED;
const BROWSER_KEEP = !!process.env.NHITW_BROWSER_KEEP;

const BROWSER_OPTIONS = {
  launchOptions: {
    executablePath: BROWSER_EXE,
    channel: 'chromium',
  },
  contextOptions: {
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  },
};

export {
  ROOT,
  PORT,
  BROWSER_EXE,
  BROWSER_HEADLESS,
  BROWSER_KEEP,
  BROWSER_OPTIONS,
};
