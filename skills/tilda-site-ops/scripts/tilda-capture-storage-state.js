#!/usr/bin/env node

const fs = require('fs');
const { execFileSync } = require('child_process');
const {
  gotoProject,
  openTildaContext,
  requiredEnv
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const CHECK_PAGE_ID = process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
const CHECK_RECORD_ID = process.env.TILDA_AUTH_CHECK_RECORD_ID || '';
const STATE_FILE = process.env.TILDA_STORAGE_STATE || '/tmp/tilda-state.json';
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

async function postFromTildaPage(page, urlPath, data) {
  return page.evaluate(
    async ({ urlPath: path, data: payload }) => {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest'
        },
        body: new URLSearchParams(payload).toString(),
        credentials: 'same-origin'
      });
      return {
        status: response.status,
        text: (await response.text()).replace(/^<!--tlp-->/, '')
      };
    },
    { urlPath, data }
  );
}

async function isApiAuthorized(context, page) {
  const cookies = await context.cookies('https://tilda.ru');
  const names = new Set(cookies.filter((cookie) => String(cookie.domain || '').includes('tilda')).map((cookie) => cookie.name));
  if (!names.has('userid') || !names.has('hash')) {
    return {
      ok: false,
      reason: `missing auth cookies: ${['userid', 'hash'].filter((name) => !names.has(name)).join(', ')}`,
      cookies: [...names].sort()
    };
  }

  const projectResponse = await postFromTildaPage(page, '/projects/get/getprojects/', {
    comm: 'getprojectslist',
    projectid: PROJECT_ID
  });
  const projectPreview = projectResponse.text.replace(/\s+/g, ' ').slice(0, 220);
  if (/not authorized|login to<\/a> your account|<title>Sign in - Tilda<\/title>|\/login\//iu.test(projectResponse.text)) {
    return {
      ok: false,
      reason: 'Tilda project API returns login page',
      status: projectResponse.status,
      preview: projectPreview
    };
  }
  try {
    const project = JSON.parse(projectResponse.text);
    if (!project.csrf) {
      return { ok: false, reason: 'Project API JSON has no csrf', status: projectResponse.status, preview: projectPreview };
    }
  } catch {
    return { ok: false, reason: 'Project API did not return JSON', status: projectResponse.status, preview: projectPreview };
  }

  if (CHECK_PAGE_ID) {
    const pageResponse = await postFromTildaPage(page, '/page/get/getpage/', { pageid: CHECK_PAGE_ID });
    const pagePreview = pageResponse.text.replace(/\s+/g, ' ').slice(0, 220);
    try {
      const parsed = JSON.parse(pageResponse.text);
      if (!parsed.page && !parsed.records) {
        return { ok: false, reason: 'Page API JSON has no page or records', status: pageResponse.status, preview: pagePreview };
      }
    } catch {
      return { ok: false, reason: 'Page API did not return JSON', status: pageResponse.status, preview: pagePreview };
    }
  }

  if (CHECK_PAGE_ID && CHECK_RECORD_ID) {
    const recordResponse = await postFromTildaPage(page, '/page/edit/', {
      pageid: CHECK_PAGE_ID,
      recordid: CHECK_RECORD_ID,
      tab: 'content',
      comm: 'editrecordcontent'
    });
    const recordPreview = recordResponse.text.replace(/\s+/g, ' ').slice(0, 220);
    try {
      const parsed = JSON.parse(recordResponse.text);
      if (!parsed.record) {
        return { ok: false, reason: 'Record API JSON has no record', status: recordResponse.status, preview: recordPreview };
      }
    } catch {
      return { ok: false, reason: 'Record API did not return JSON', status: recordResponse.status, preview: recordPreview };
    }
  }

  return { ok: true };
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
  const { context, page } = await openTildaContext();
  await gotoProject(page, PROJECT_ID);
  console.log('Tilda is open. Log in manually if needed; state is saved only after API auth works.');
  await prefillLogin(page);

  const deadline = Date.now() + 15 * 60 * 1000;
  let lastLog = 0;
  let revealedForHumanCheck = false;

  while (Date.now() < deadline) {
    const auth = await isApiAuthorized(context, page);
    if (auth.ok) {
      await gotoProject(page, PROJECT_ID).catch(() => {});
      await context.storageState({ path: STATE_FILE });
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const tildaCookies = state.cookies.filter((cookie) => String(cookie.domain || '').includes('tilda'));
      console.log(`Saved ${tildaCookies.length} Tilda cookies to ${STATE_FILE}`);
      await context.close();
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

  await context.close();
  throw new Error('Timed out waiting for Tilda login.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

