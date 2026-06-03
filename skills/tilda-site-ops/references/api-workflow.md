# Tilda API Workflow

These are internal Tilda web endpoints used from an authenticated `https://tilda.ru` browser page. They are not a stable public API, so verify behavior on staging before production changes.

## Common Endpoints

| Task | Endpoint | Payload notes |
| --- | --- | --- |
| List project pages and get `csrf` | `POST /projects/get/getprojects/` | `comm=getprojectslist`, `projectid` |
| Get page data | `POST /page/get/getpage/` | `pageid` |
| Duplicate page | `POST /projects/submit/` | `comm=dublicatepage`, `pageid`, `csrf` |
| Save page settings | `POST /projects/submit/` | `comm=savepagesettings`, `test=test4.0`, page fields, `csrf` |
| Save a block | `POST /page/submit/` | `comm=saverecord`, `pageid`, `recordid`, `tplid` |
| Copy block | `POST /page/submit/` | `comm=copyrecord_tobuf`, `pageid`, `recordid` |
| Paste block | `POST /page/submit/` | `comm=pasterecord_frombuf`, `pageid`, `recordid`, `with_code=yes` |
| Delete block | `POST /page/submit/` | `comm=deleterecord`, `pageid`, `recordid` |
| Publish page | `POST /page/publish/` | `projectid`, `pageid` |

## Runtime Requirements

Routine reads, writes, settings saves, block operations, and publishing must use a validated durable `TILDA_STORAGE_STATE` in a fresh headless browser context. Do not use `launchPersistentContext` or `TILDA_LOGIN_PROFILE` for routine API work.

Before write/publish work, run `scripts/tilda-validate-storage-state.js` when the state freshness is uncertain. If validation fails, stop and refresh the state through manual capture.

Exception: when diagnosis proves the Tilda session is profile-bound/non-portable, the only acceptable profile-based automation is an explicitly reported current-session workbench. In that mode, keep login wait, API reads, dumps, and writes in the same visible persistent context process. Do not present the result as reusable auth state, and do not wire it as a silent fallback in routine scripts.

## Page Settings

Tilda can return `200 OK` while rejecting incomplete settings. Include the existing page values where possible and explicitly set:

- `comm=savepagesettings`
- `test=test4.0`
- `projectid`
- `pageid`
- `title`
- `descr`
- `alias`
- `meta_title`
- `meta_descr`
- `link_canonical`
- `imgfile`
- `fb_title`
- `fb_descr`
- `fb_imgfile`
- `fb_img`
- `fb_url`
- `date`
- `featureimgfile`
- `csrf`

For staging pages, also set:

- `nosearch=yes`
- `meta_nofollow=yes`

Check the response body. Treat anything except exact `OK` as suspicious unless the script explicitly parses and accepts JSON.

## Safe Staging Pattern

1. Get project data and `csrf`.
2. Back up source page JSON.
3. Duplicate the source page.
4. Save staging settings with a temporary alias and noindex/nofollow.
5. Publish staging if a public preview is needed.
6. Verify the public staging URL.
7. Apply the final change to production only after approval.

## Publish Pattern

Use `scripts/tilda-publish-page.js` or the same storage-state-only pattern:

```bash
TILDA_HEADLESS=1 \
TILDA_PROJECT_ID=289314 \
TILDA_PAGE_ID=20631846 \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/project-name/storage-state.json" \
TILDA_PUBLIC_URL="https://example.com/page" \
TILDA_VERIFY_TEXT="Expected public text" \
TILDA_CONFIRM_PUBLISH=1 \
node skills/tilda-site-ops/scripts/tilda-publish-page.js
```

Treat publish as incomplete until the public URL is checked.
