#!/usr/bin/env node

const {
  gotoProject,
  isTildaApiAuthorized,
  openTildaContext,
  requiredEnv,
  timestamp
} = require('./tilda-browser-lib');

const PROJECT_ID = requiredEnv('TILDA_PROJECT_ID');
const SOURCE_PAGE_ID = requiredEnv('TILDA_SOURCE_PAGE_ID');
const STAGING_ALIAS = process.env.TILDA_STAGING_ALIAS || `staging-${SOURCE_PAGE_ID}-${timestamp().toLowerCase()}`;
const STAGING_TITLE = process.env.TILDA_STAGING_TITLE || `Staging copy of page ${SOURCE_PAGE_ID}`;
const STAGING_DESCRIPTION = process.env.TILDA_STAGING_DESCRIPTION || 'Temporary staging page.';
const CONFIRM_CREATE = process.env.TILDA_CONFIRM_CREATE === '1';

async function main() {
  if (!CONFIRM_CREATE) {
    throw new Error('Refusing to create a Tilda page without TILDA_CONFIRM_CREATE=1.');
  }

  const { context, page } = await openTildaContext({ preferStorageState: true });
  try {
    await gotoProject(page, PROJECT_ID);
    const auth = await isTildaApiAuthorized(context, page, { projectId: PROJECT_ID, checkPageId: SOURCE_PAGE_ID });
    if (!auth.ok) throw new Error(`Tilda auth check failed before staging duplicate: ${auth.reason}`);
    const result = await page.evaluate(
      async ({ PROJECT_ID, SOURCE_PAGE_ID, STAGING_ALIAS, STAGING_TITLE, STAGING_DESCRIPTION }) => {
        const post = async (url, data) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'x-requested-with': 'XMLHttpRequest'
            },
            body: new URLSearchParams(data).toString(),
            credentials: 'same-origin'
          });
          const text = (await response.text()).replace(/^<!--tlp-->/, '');
          if (!response.ok) throw new Error(`${url} ${response.status}: ${text.slice(0, 500)}`);
          return text;
        };
        const jsonPost = async (url, data) => JSON.parse(await post(url, data));

        const project = await jsonPost('/projects/get/getprojects/', {
          comm: 'getprojectslist',
          projectid: PROJECT_ID
        });
        if (!project.csrf) throw new Error('Project API returned no csrf.');

        const duplicateText = await post('/projects/submit/', {
          comm: 'dublicatepage',
          pageid: SOURCE_PAGE_ID,
          csrf: project.csrf
        });
        const match = duplicateText.match(/(\d{4,})/);
        if (!match) throw new Error(`Cannot parse duplicated page id: ${duplicateText.slice(0, 500)}`);
        const newPageId = match[1];

        const pageData = await jsonPost('/page/get/getpage/', { pageid: newPageId });
        const existing = pageData.page || {};
        const url = STAGING_ALIAS ? `/${STAGING_ALIAS}` : '';
        const response = await post('/projects/submit/', {
          comm: 'savepagesettings',
          test: 'test4.0',
          projectid: PROJECT_ID,
          pageid: newPageId,
          title: STAGING_TITLE,
          alias: STAGING_ALIAS,
          descr: STAGING_DESCRIPTION,
          meta_title: STAGING_TITLE,
          meta_descr: STAGING_DESCRIPTION,
          fbtitle: STAGING_TITLE,
          fbdescr: STAGING_DESCRIPTION,
          fb_title: STAGING_TITLE,
          fb_descr: STAGING_DESCRIPTION,
          link_canonical: '',
          imgfile: existing.imgfile || '',
          'img-tuinfo-uuid': '',
          'img-tuinfo-cdnurl': '',
          'img-tuinfo-name': '',
          'img-tuinfo-width': '',
          'img-tuinfo-size': '',
          fb_img: '',
          fb_imgfile: existing.fb_imgfile || '',
          'fb_img-tuinfo-uuid': '',
          'fb_img-tuinfo-cdnurl': '',
          'fb_img-tuinfo-name': '',
          'fb_img-tuinfo-width': '',
          'fb_img-tuinfo-size': '',
          fb_url: url,
          fb_appid: existing.fb_appid || '',
          twitter_site: existing.twitter_site || '',
          meta_keywords: existing.meta_keywords || '',
          noheader: existing.noheader || '',
          nofooter: existing.nofooter || '',
          nosearch: 'yes',
          meta_nofollow: 'yes',
          isindex: existing.isindex || '',
          sort: existing.sort || '',
          label: existing.label || '',
          comment: existing.comment || '',
          folderid: existing.folderid || '',
          writing_direction: existing.writing_direction || '',
          date: existing.date || '',
          tag: existing.tag || '',
          shorttitle: existing.shorttitle || '',
          customlink: existing.customlink || '',
          featureimgfile: existing.featureimgfile || '',
          'featureimg-tuinfo-uuid': '',
          'featureimg-tuinfo-cdnurl': '',
          'featureimg-tuinfo-name': '',
          'featureimg-tuinfo-width': '',
          'featureimg-tuinfo-size': '',
          viewpassword: existing.viewpassword || '',
          csrf: project.csrf
        });
        if (response !== 'OK') throw new Error(`savepagesettings ${newPageId}: ${response.slice(0, 500)}`);

        return {
          projectid: PROJECT_ID,
          sourcePageId: SOURCE_PAGE_ID,
          stagingPageId: newPageId,
          stagingAlias: STAGING_ALIAS,
          stagingTitle: STAGING_TITLE,
          nosearch: 'yes',
          meta_nofollow: 'yes'
        };
      },
      { PROJECT_ID, SOURCE_PAGE_ID, STAGING_ALIAS, STAGING_TITLE, STAGING_DESCRIPTION }
    );

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
