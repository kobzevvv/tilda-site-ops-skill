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

