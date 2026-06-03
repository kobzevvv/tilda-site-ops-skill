#!/usr/bin/env node

const {
  gotoProject,
  isTildaApiAuthorized,
  openTildaContext,
  requiredEnv
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const CONFIRM_MANUAL_PROFILE = process.env.TILDA_CONFIRM_MANUAL_PROFILE === '1';
const MANUAL_URL = process.env.TILDA_MANUAL_URL || '';
const HOLD_SECONDS = Number(process.env.TILDA_MANUAL_HOLD_SECONDS || 900);
const CHECK_PAGE_ID = process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
const CHECK_RECORD_ID = process.env.TILDA_AUTH_CHECK_RECORD_ID || '';

function manualTargetUrl() {
  if (!MANUAL_URL) return `https://tilda.ru/projects/?projectid=${PROJECT_ID}`;
  if (/^https?:\/\//i.test(MANUAL_URL)) return MANUAL_URL;
  return `https://tilda.ru${MANUAL_URL.startsWith('/') ? '' : '/'}${MANUAL_URL}`;
}

async function waitForAuth(page, context) {
  const deadline = Date.now() + 15 * 60 * 1000;
  let lastLog = 0;

  while (Date.now() < deadline) {
    const auth = await isTildaApiAuthorized(context, page, {
      projectId: PROJECT_ID,
      checkPageId: CHECK_PAGE_ID,
      checkRecordId: CHECK_RECORD_ID
    });
    if (auth.ok) return auth;

    if (Date.now() - lastLog > 5000) {
      lastLog = Date.now();
      const visibleText = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
      console.log(`Waiting for same-profile API auth. URL: ${page.url()}. Reason: ${auth.reason}. Text: ${visibleText.replace(/\s+/g, ' ').slice(0, 180)}`);
      if (auth.preview) console.log(`API preview: ${auth.preview}`);
    }
    await page.waitForTimeout(1000);
  }

  throw new Error('Timed out waiting for same-profile Tilda auth.');
}

async function holdWorkbench(page) {
  if (!Number.isFinite(HOLD_SECONDS) || HOLD_SECONDS <= 0) return;
  const deadline = Date.now() + HOLD_SECONDS * 1000;
  console.log(`Manual profile workbench is ready at ${page.url()}. Holding for ${HOLD_SECONDS}s; press Ctrl+C to stop earlier.`);
  while (Date.now() < deadline) {
    await page.waitForTimeout(Math.min(30000, Math.max(1000, deadline - Date.now())));
  }
}

async function main() {
  if (!CONFIRM_MANUAL_PROFILE) {
    throw new Error('Refusing to open a manual persistent profile without TILDA_CONFIRM_MANUAL_PROFILE=1.');
  }
  if (process.env.TILDA_HEADLESS === '1') {
    throw new Error('Manual profile workbench must be visible. Unset TILDA_HEADLESS or set TILDA_HEADLESS=0.');
  }

  const { context, page } = await openTildaContext();
  try {
    await gotoProject(page, PROJECT_ID);
    await waitForAuth(page, context);
    await page.goto(manualTargetUrl(), { waitUntil: 'domcontentloaded' });
    console.log(JSON.stringify({
      ok: true,
      mode: 'manual-profile-workbench',
      portableState: false,
      projectid: PROJECT_ID,
      url: page.url(),
      note: 'Use only for current-session manual or same-process project-specific work. This is not reusable storage state.'
    }, null, 2));
    await holdWorkbench(page);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
