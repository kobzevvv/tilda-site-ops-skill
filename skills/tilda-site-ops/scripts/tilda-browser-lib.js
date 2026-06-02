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
  if (options.preferStorageState && process.env.TILDA_STORAGE_STATE) {
    return openStorageStateContext(options);
  }
  if (options.preferStorageState && process.env.TILDA_ALLOW_PERSISTENT_ROUTINE !== '1') {
    throw new Error(
      'Routine Tilda scripts require TILDA_STORAGE_STATE to avoid opening or locking a persistent Chrome profile. ' +
      'Run tilda-capture-storage-state.js first, or set TILDA_ALLOW_PERSISTENT_ROUTINE=1 to explicitly use TILDA_LOGIN_PROFILE.'
    );
  }

  const userDataDir = options.userDataDir || process.env.TILDA_LOGIN_PROFILE || '/tmp/tilda-login-profile';
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

async function gotoProject(page, projectId) {
  await page.goto(`https://tilda.ru/projects/?projectid=${projectId}`, {
    waitUntil: 'domcontentloaded'
  });
}

module.exports = {
  ensureDir,
  gotoProject,
  openStorageStateContext,
  openTildaContext,
  requiredEnv,
  safeFileSegment,
  timestamp
};
