#!/usr/bin/env node

const {
  gotoProject,
  isTildaApiAuthorized,
  openTildaContext,
  postFromTildaPage,
  requiredEnv
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const PAGE_ID = requiredEnv('TILDA_PAGE_ID');
const PUBLIC_URL = process.env.TILDA_PUBLIC_URL || '';
const VERIFY_TEXT = process.env.TILDA_VERIFY_TEXT || '';
const CONFIRM_PUBLISH = process.env.TILDA_CONFIRM_PUBLISH === '1';

async function verifyPublicUrl() {
  if (!PUBLIC_URL) return null;
  const response = await fetch(PUBLIC_URL, { redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Public URL ${PUBLIC_URL} returned ${response.status}.`);
  }
  if (VERIFY_TEXT && !text.includes(VERIFY_TEXT)) {
    throw new Error(`Public URL ${PUBLIC_URL} does not contain TILDA_VERIFY_TEXT.`);
  }
  return {
    url: PUBLIC_URL,
    status: response.status,
    verifiedText: VERIFY_TEXT ? true : undefined
  };
}

async function main() {
  if (!CONFIRM_PUBLISH) {
    throw new Error('Refusing to publish without TILDA_CONFIRM_PUBLISH=1.');
  }

  const { context, page } = await openTildaContext({ preferStorageState: true });
  try {
    await gotoProject(page, PROJECT_ID);
    const auth = await isTildaApiAuthorized(context, page, { projectId: PROJECT_ID, checkPageId: PAGE_ID });
    if (!auth.ok) throw new Error(`Tilda auth check failed before publish: ${auth.reason}`);
    const response = await postFromTildaPage(page, '/page/publish/', {
      projectid: PROJECT_ID,
      pageid: PAGE_ID
    });
    if (!response.text || /login|not authorized|sign in/iu.test(response.text)) {
      throw new Error(`/page/publish/ returned an auth-like response: ${response.text.slice(0, 500)}`);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`/page/publish/ ${response.status}: ${response.text.slice(0, 500)}`);
    }

    const publicCheck = await verifyPublicUrl();
    console.log(JSON.stringify({
      projectid: PROJECT_ID,
      pageid: PAGE_ID,
      publishStatus: response.status,
      publishPreview: response.text.replace(/\s+/g, ' ').slice(0, 300),
      publicCheck
    }, null, 2));
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
