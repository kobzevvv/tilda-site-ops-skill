#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DEFAULT_VIEWPORT = { width: 1440, height: 1000 };

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
}

function safeFileSegment(value) {
  return String(value || '')
    .replace(/[^a-z0-9а-яё._-]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'tilda';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function frontmostApp(restoreFocus) {
  if (!restoreFocus || process.platform !== 'darwin') return '';
  try {
    return execFileSync('osascript', [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true'
    ], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function restoreFocus(appName) {
  if (!appName || appName === 'Google Chrome' || process.platform !== 'darwin') return;
  try {
    execFileSync('osascript', ['-e', `tell application "${appName.replace(/"/g, '\\"')}" to activate`]);
  } catch {
    // Best effort.
  }
}

function envFlag(name, defaultValue) {
  if (process.env[name] === undefined) return defaultValue;
  return process.env[name] === '1' || process.env[name] === 'true';
}

async function openStorageStateContext(options = {}) {
  const storageState = options.storageState || process.env.TILDA_STORAGE_STATE;
  if (!storageState) {
    throw new Error('Missing TILDA_STORAGE_STATE for storage-state browser mode.');
  }

  const headless = envFlag('TILDA_HEADLESS', true);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless
  });
  const context = await browser.newContext({
    storageState,
    viewport: DEFAULT_VIEWPORT
  });
  const originalClose = context.close.bind(context);
  context.close = async (...args) => {
    try {
      await originalClose(...args);
    } finally {
      await browser.close();
    }
  };
  const page = await context.newPage();
  return { browser, context, page, mode: 'storageState' };
}

async function openTildaContext(options = {}) {
  if (options.preferStorageState) {
    return openStorageStateContext(options);
  }

  const userDataDir = options.userDataDir || process.env.TILDA_LOGIN_PROFILE;
  if (!userDataDir) {
    throw new Error('Missing TILDA_LOGIN_PROFILE for manual login/capture browser mode.');
  }

  const headless = process.env.TILDA_HEADLESS === '1';
  const windowPosition = process.env.TILDA_WINDOW_POSITION || '2400,100';
  const windowSize = process.env.TILDA_WINDOW_SIZE || '1200,900';
  const shouldRestoreFocus = process.env.TILDA_RESTORE_FOCUS !== '0';
  const previousApp = frontmostApp(shouldRestoreFocus);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless,
    viewport: DEFAULT_VIEWPORT,
    args: [
      `--window-position=${windowPosition}`,
      `--window-size=${windowSize}`
    ]
  });
  restoreFocus(previousApp);
  const page = context.pages()[0] || (await context.newPage());
  return { context, page, mode: 'persistent' };
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

async function isTildaApiAuthorized(context, page, options = {}) {
  const projectId = options.projectId || process.env.TILDA_PROJECT_ID;
  if (!projectId) throw new Error('Missing projectId or TILDA_PROJECT_ID for auth check.');

  const checkPageId = options.checkPageId || process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
  const checkRecordId = options.checkRecordId || process.env.TILDA_AUTH_CHECK_RECORD_ID || '';
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
    projectid: projectId
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

  if (checkPageId) {
    const pageResponse = await postFromTildaPage(page, '/page/get/getpage/', { pageid: checkPageId });
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

  if (checkPageId && checkRecordId) {
    const recordResponse = await postFromTildaPage(page, '/page/edit/', {
      pageid: checkPageId,
      recordid: checkRecordId,
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

async function validateStorageStateAuth(options = {}) {
  const projectId = options.projectId || process.env.TILDA_PROJECT_ID;
  if (!projectId) throw new Error('Missing projectId or TILDA_PROJECT_ID for storage-state validation.');
  const { context, page } = await openStorageStateContext({ storageState: options.storageState });
  try {
    await gotoProject(page, projectId);
    return await isTildaApiAuthorized(context, page, options);
  } finally {
    await context.close();
  }
}

async function gotoProject(page, projectId) {
  await page.goto(`https://tilda.ru/projects/?projectid=${projectId}`, {
    waitUntil: 'domcontentloaded'
  });
}

module.exports = {
  ensureDir,
  gotoProject,
  isTildaApiAuthorized,
  openStorageStateContext,
  openTildaContext,
  postFromTildaPage,
  requiredEnv,
  safeFileSegment,
  timestamp,
  validateStorageStateAuth
};
