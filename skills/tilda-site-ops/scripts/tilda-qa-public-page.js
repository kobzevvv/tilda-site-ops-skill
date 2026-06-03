#!/usr/bin/env node

const path = require('path');
const { chromium } = require('playwright');
const {
  ensureDir,
  requiredEnv,
  safeFileSegment,
  timestamp
} = require('./tilda-browser-lib');

const PUBLIC_URL = requiredEnv('TILDA_PUBLIC_URL');
const VERIFY_TEXT = process.env.TILDA_VERIFY_TEXT || '';
const SCREENSHOT_DIR = process.env.TILDA_QA_SCREENSHOT_DIR || '';
const FAIL_ON_CONSOLE = process.env.TILDA_QA_FAIL_ON_CONSOLE === '1';
const FAIL_ON_NETWORK = process.env.TILDA_QA_FAIL_ON_NETWORK === '1';
const WAIT_MS = Number(process.env.TILDA_QA_WAIT_MS || 1500);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
];

function isRelevantFailedRequest(request) {
  const type = request.resourceType();
  return ['document', 'stylesheet', 'script', 'image', 'font', 'xhr', 'fetch'].includes(type);
}

async function checkViewport(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('requestfailed', (request) => {
    if (isRelevantFailedRequest(request)) {
      failedRequests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        failure: request.failure()?.errorText || ''
      });
    }
  });

  try {
    const response = await page.goto(PUBLIC_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (WAIT_MS > 0) await page.waitForTimeout(WAIT_MS);

    const status = response?.status() || 0;
    if (status < 200 || status >= 400) {
      throw new Error(`${viewport.name} public URL returned ${status}.`);
    }

    const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    if (VERIFY_TEXT && !bodyText.includes(VERIFY_TEXT)) {
      throw new Error(`${viewport.name} public page does not contain TILDA_VERIFY_TEXT.`);
    }

    let screenshotPath = '';
    if (SCREENSHOT_DIR) {
      ensureDir(SCREENSHOT_DIR);
      screenshotPath = path.join(
        SCREENSHOT_DIR,
        `${safeFileSegment(viewport.name)}-${timestamp()}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    if (FAIL_ON_CONSOLE && consoleMessages.some((message) => message.type === 'error')) {
      throw new Error(`${viewport.name} console has error messages.`);
    }
    if (FAIL_ON_NETWORK && failedRequests.length > 0) {
      throw new Error(`${viewport.name} has failed network requests.`);
    }

    return {
      viewport: viewport.name,
      url: page.url(),
      status,
      title: await page.title(),
      verifiedText: VERIFY_TEXT ? true : undefined,
      consoleMessages,
      failedRequests,
      screenshotPath
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: process.env.TILDA_HEADLESS !== '0'
  });
  try {
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await checkViewport(browser, viewport));
    }
    console.log(JSON.stringify({ url: PUBLIC_URL, results }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
