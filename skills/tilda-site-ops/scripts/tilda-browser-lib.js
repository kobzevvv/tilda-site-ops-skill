#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

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

async function openTildaContext(options = {}) {
  const userDataDir = options.userDataDir || process.env.TILDA_LOGIN_PROFILE || '/tmp/tilda-login-profile';
  const headless = process.env.TILDA_HEADLESS === '1';
  const windowPosition = process.env.TILDA_WINDOW_POSITION || '2400,100';
  const windowSize = process.env.TILDA_WINDOW_SIZE || '1200,900';
  const shouldRestoreFocus = process.env.TILDA_RESTORE_FOCUS !== '0';
  const previousApp = frontmostApp(shouldRestoreFocus);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless,
    viewport: { width: 1440, height: 1000 },
    args: [
      `--window-position=${windowPosition}`,
      `--window-size=${windowSize}`
    ]
  });
  restoreFocus(previousApp);
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

async function gotoProject(page, projectId) {
  await page.goto(`https://tilda.ru/projects/?projectid=${projectId}`, {
    waitUntil: 'domcontentloaded'
  });
}

module.exports = {
  ensureDir,
  gotoProject,
  openTildaContext,
  requiredEnv,
  safeFileSegment,
  timestamp
};

