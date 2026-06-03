#!/usr/bin/env node

const {
  requiredEnv,
  validateStorageStateAuth
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const STORAGE_STATE = requiredEnv('TILDA_STORAGE_STATE');
const CHECK_PAGE_ID = process.env.TILDA_AUTH_CHECK_PAGE_ID || process.env.TILDA_PAGE_ID || '';
const CHECK_RECORD_ID = process.env.TILDA_AUTH_CHECK_RECORD_ID || '';

async function main() {
  const auth = await validateStorageStateAuth({
    storageState: STORAGE_STATE,
    projectId: PROJECT_ID,
    checkPageId: CHECK_PAGE_ID,
    checkRecordId: CHECK_RECORD_ID
  });

  if (!auth.ok) {
    console.error(JSON.stringify({ ok: false, ...auth }, null, 2));
    process.exit(auth.likelyProfileBound ? 3 : 2);
  }

  console.log(JSON.stringify({ ok: true, projectid: PROJECT_ID, storageState: STORAGE_STATE }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
