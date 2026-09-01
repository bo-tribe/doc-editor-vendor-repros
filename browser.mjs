import { existsSync } from 'node:fs';

const OVERRIDE = 'REPRO_CHROME_PATH';
const REMEDY = `Install Google Chrome, or run "npx playwright-core install chromium" in this repro directory, or set ${OVERRIDE} to an existing Chrome or Chromium binary.`;

const announce = (browser, source) => {
  process.stderr.write(`[repro] browser: ${source} ${browser.version()}\n`);
  return browser;
};

// chromium is a parameter, not an import: this file sits outside every repro's node_modules.
export const launchChromium = async (chromium, options = {}) => {
  const override = process.env[OVERRIDE];
  if (override) {
    if (!existsSync(override)) throw new Error(`${OVERRIDE}=${override} does not exist. ${REMEDY}`);
    return announce(await chromium.launch({ ...options, executablePath: override }), OVERRIDE);
  }
  const failures = [];
  for (const [source, extra] of [['channel:chrome', { channel: 'chrome' }], ['playwright-chromium', {}]]) {
    try {
      return announce(await chromium.launch({ ...options, ...extra }), source);
    } catch (error) {
      failures.push(`  - ${source}: ${error.message.split('\n')[0]}`);
    }
  }
  throw new Error(`No Chrome or Chromium could be launched.\n${failures.join('\n')}\n${REMEDY}`);
};
