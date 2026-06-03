#!/usr/bin/env node

const fs = require('fs');
const {
  gotoProject,
  isTildaApiAuthorized,
  openStorageStateContext,
  requiredEnv,
  tildaCookieNames
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const STORAGE_STATE = requiredEnv('TILDA_STORAGE_STATE');
const CHECK_PAGE_ID = process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
const CHECK_RECORD_ID = process.env.TILDA_AUTH_CHECK_RECORD_ID || '';

async function main() {
  const rawState = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf8'));
  const fileCookieNames = tildaCookieNames(rawState.cookies || []);

  const { context, page } = await openStorageStateContext({ storageState: STORAGE_STATE });
  try {
    const beforeCookieNames = tildaCookieNames(await context.cookies('https://tilda.ru'));
    await gotoProject(page, PROJECT_ID);
    const afterCookieNames = tildaCookieNames(await context.cookies('https://tilda.ru'));
    const auth = await isTildaApiAuthorized(context, page, {
      projectId: PROJECT_ID,
      checkPageId: CHECK_PAGE_ID,
      checkRecordId: CHECK_RECORD_ID
    });

    const hadAuthCookiesBefore = beforeCookieNames.includes('userid') && beforeCookieNames.includes('hash');
    const hasAuthCookiesAfter = afterCookieNames.includes('userid') && afterCookieNames.includes('hash');
    const likelyProfileBound = hadAuthCookiesBefore && !hasAuthCookiesAfter && /\/login\//i.test(page.url());

    console.log(JSON.stringify({
      ok: auth.ok,
      projectid: PROJECT_ID,
      storageState: STORAGE_STATE,
      currentUrl: page.url(),
      cookieNames: {
        file: fileCookieNames,
        beforeNavigation: beforeCookieNames,
        afterNavigation: afterCookieNames
      },
      authReason: auth.ok ? undefined : auth.reason,
      authPreview: auth.preview,
      likelyProfileBound,
      note: likelyProfileBound
        ? 'State contains auth cookie names before navigation, but Tilda clears them and redirects to login. Treat as non-portable profile-bound state.'
        : undefined
    }, null, 2));

    if (!auth.ok) process.exit(likelyProfileBound ? 3 : 2);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
