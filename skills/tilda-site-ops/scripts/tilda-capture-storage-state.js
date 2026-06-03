#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  acquireLock,
  gotoProject,
  isTildaApiAuthorized,
  openTildaContext,
  requiredEnv,
  validateStorageStateAuth
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const CHECK_PAGE_ID = process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
const CHECK_RECORD_ID = process.env.TILDA_AUTH_CHECK_RECORD_ID || '';
const STATE_FILE = requiredEnv('TILDA_STORAGE_STATE');
const PREFILL_LOGIN = process.argv.includes('--prefill-login');
const LOGIN_EMAIL = process.env.TILDA_LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.TILDA_LOGIN_PASSWORD || '';
const VISIBLE_WINDOW_BOUNDS = process.env.TILDA_VISIBLE_WINDOW_BOUNDS || '80,80,1280,920';

function visibleWindowBoundsScript() {
  const values = VISIBLE_WINDOW_BOUNDS.split(',').map((value) => Number(value.trim()));
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return 'tell application "Google Chrome" to activate';
  }
  return `tell application "Google Chrome" to set bounds of front window to {${values.join(', ')}}`;
}

async function revealBrowserForHumanCheck(page) {
  await page.bringToFront().catch(() => {});
  if (process.platform !== 'darwin') return;
  try {
    execFileSync('osascript', ['-e', visibleWindowBoundsScript()]);
  } catch {
    // Best effort.
  }
}

async function prefillLogin(page) {
  if (!PREFILL_LOGIN) return;
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error('Use TILDA_LOGIN_EMAIL and TILDA_LOGIN_PASSWORD with --prefill-login.');
  }
  const email = page.locator('input[type="email"], input[name="email"], input[name="login"], input[name="username"]').first();
  const password = page.locator('input[type="password"], input[name="password"]').first();
  await email.fill(LOGIN_EMAIL, { timeout: 10000 });
  await password.fill(LOGIN_PASSWORD, { timeout: 10000 });
  await page.locator('button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Войти"), a:has-text("Войти")').first().click({ timeout: 10000 });
  console.log('Submitted Tilda login form once. Complete any visible verification in the browser window.');
}

async function main() {
  const releaseStateLock = acquireLock(`${STATE_FILE}.lock`);
  const { context, page } = await openTildaContext();
  let contextClosed = false;
  const closeContext = async () => {
    if (contextClosed) return;
    contextClosed = true;
    await context.close();
  };
  try {
    await gotoProject(page, PROJECT_ID);
    console.log('Tilda is open. Log in manually if needed; state is saved only after API auth works.');
    await prefillLogin(page);

    const deadline = Date.now() + 15 * 60 * 1000;
    let lastLog = 0;
    let revealedForHumanCheck = false;

    while (Date.now() < deadline) {
      const auth = await isTildaApiAuthorized(context, page, {
        projectId: PROJECT_ID,
        checkPageId: CHECK_PAGE_ID,
        checkRecordId: CHECK_RECORD_ID
      });
      if (auth.ok) {
        await gotoProject(page, PROJECT_ID).catch(() => {});
        fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
        const tmpStateFile = `${STATE_FILE}.tmp-${process.pid}`;
        await context.storageState({ path: tmpStateFile });

        const freshAuth = await validateStorageStateAuth({
          storageState: tmpStateFile,
          projectId: PROJECT_ID,
          checkPageId: CHECK_PAGE_ID,
          checkRecordId: CHECK_RECORD_ID
        });
        if (!freshAuth.ok) {
          fs.rmSync(tmpStateFile, { force: true });
          console.log(`Current browser is authorized, but saved storageState fails in a fresh context. Reason: ${freshAuth.reason}`);
          if (freshAuth.preview) console.log(`Fresh-context API preview: ${freshAuth.preview}`);
          if (freshAuth.likelyProfileBound) {
            throw new Error(
              'Saved storageState is profile-bound/non-portable: Tilda accepts the visible profile but clears auth cookies in a fresh context. ' +
              'Do not keep retrying capture in this state. Use tilda-manual-profile-workbench.js for one-off same-profile work, or retry capture later/new login until fresh validation passes.'
            );
          }
          await page.waitForTimeout(1000);
          continue;
        }

        fs.renameSync(tmpStateFile, STATE_FILE);
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        const tildaCookies = state.cookies.filter((cookie) => String(cookie.domain || '').includes('tilda'));
        console.log(`Saved and fresh-context-validated ${tildaCookies.length} Tilda cookies to ${STATE_FILE}`);
        await closeContext();
        return;
      }

      if (Date.now() - lastLog > 5000) {
        lastLog = Date.now();
        const visibleText = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
        if (!revealedForHumanCheck && /human|captcha|check the box|провер|подтверд/iu.test(visibleText)) {
          revealedForHumanCheck = true;
          console.log('Tilda requires a human check. Moving the browser window into the visible area.');
          await revealBrowserForHumanCheck(page);
        }
        console.log(`Waiting for API auth. URL: ${page.url()}. Reason: ${auth.reason}. Text: ${visibleText.replace(/\s+/g, ' ').slice(0, 180)}`);
        if (auth.preview) console.log(`API preview: ${auth.preview}`);
      }
      await page.waitForTimeout(1000);
    }

    await closeContext();
    throw new Error('Timed out waiting for Tilda login.');
  } finally {
    await closeContext().catch(() => {});
    releaseStateLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
