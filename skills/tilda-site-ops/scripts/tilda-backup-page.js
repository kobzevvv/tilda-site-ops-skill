#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureDir,
  gotoProject,
  isTildaApiAuthorized,
  openTildaContext,
  requiredEnv,
  safeFileSegment,
  timestamp
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const PAGE_ID = requiredEnv('TILDA_PAGE_ID');
const BACKUP_DIR = process.env.TILDA_BACKUP_DIR || path.resolve(process.cwd(), 'backups');

async function main() {
  const { context, page } = await openTildaContext({ preferStorageState: true });
  try {
    await gotoProject(page, PROJECT_ID);
    const auth = await isTildaApiAuthorized(context, page, { projectId: PROJECT_ID, checkPageId: PAGE_ID });
    if (!auth.ok) throw new Error(`Tilda auth check failed before backup: ${auth.reason}`);
    const pageData = await page.evaluate(async ({ PAGE_ID }) => {
      const response = await fetch('/page/get/getpage/', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest'
        },
        body: new URLSearchParams({ pageid: PAGE_ID }).toString(),
        credentials: 'same-origin'
      });
      const text = (await response.text()).replace(/^<!--tlp-->/, '');
      if (!response.ok) throw new Error(`/page/get/getpage/ ${response.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    }, { PAGE_ID });

    ensureDir(BACKUP_DIR);
    const pageTitle = pageData.page?.title || pageData.page?.alias || PAGE_ID;
    const backupPath = path.join(
      BACKUP_DIR,
      `tilda-page-${PAGE_ID}-${safeFileSegment(pageTitle)}-${timestamp()}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(pageData, null, 2));
    console.log(JSON.stringify({ pageid: PAGE_ID, title: pageTitle, backupPath }, null, 2));
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
