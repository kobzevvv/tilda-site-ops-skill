# Tilda Authorization

Use a real browser session for login and human checks. After a valid storage state is captured, prefer headless/API work for routine Tilda operations.

Recommended environment:

```bash
TILDA_PROJECT_ID=289314
TILDA_STATE_DIR=$HOME/.local/state/tilda-site-ops/project-name
TILDA_LOGIN_PROFILE=$TILDA_STATE_DIR/chrome-profile
TILDA_STORAGE_STATE=$TILDA_STATE_DIR/storage-state.json
```

Run:

```bash
node skills/tilda-site-ops/scripts/tilda-capture-storage-state.js
```

The script opens Tilda in Chrome and waits for manual login. It saves `storageState` only after API checks pass in the visible login context and then pass again in a new clean context loaded from the saved state.

## Why Manual Login

Tilda can temporarily issue auth cookies and then reset them after a human check. Saving that intermediate state causes future scripts to loop back to login. A reliable capture waits until project API calls return valid JSON with `csrf`.

## Optional Prefill

The capture script supports login prefill through environment variables, but manual login is preferred for shared/public scripts:

```bash
TILDA_LOGIN_EMAIL='name@example.com' \
TILDA_LOGIN_PASSWORD='not-for-repos' \
node skills/tilda-site-ops/scripts/tilda-capture-storage-state.js --prefill-login
```

Never commit the resulting session file or browser profile.

## Headless After Auth

Once `TILDA_STORAGE_STATE` exists and fresh-context API auth checks pass, do not keep opening Tilda in a foreground Chrome window for normal work. Bundled routine scripts require `storageState`:

```bash
TILDA_HEADLESS=1 \
TILDA_STORAGE_STATE=$HOME/.local/state/tilda-site-ops/project-name/storage-state.json \
node skills/tilda-site-ops/scripts/tilda-backup-page.js
```

If `TILDA_STORAGE_STATE` is missing, bundled routine scripts should fail rather than quietly opening a persistent Chrome profile.

Validate an existing state before a write/publish if freshness is uncertain:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_STORAGE_STATE=$HOME/.local/state/tilda-site-ops/project-name/storage-state.json \
node skills/tilda-site-ops/scripts/tilda-validate-storage-state.js
```

or a Playwright script that loads `storageState`:

```js
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ storageState: process.env.TILDA_STORAGE_STATE });
const page = await context.newPage();
await page.goto('https://tilda.ru/projects/', { waitUntil: 'domcontentloaded' });
```

If Chromium's bundled headless shell is missing in the current repo, use `channel: 'chrome'` with a storage-state context. Visible Chrome should be reserved for login/CAPTCHA or visual QA.

## Parallel Session Rules

`TILDA_LOGIN_PROFILE` is a persistent Chrome user data directory. Only one browser process should use a given profile at a time; concurrent launches can fail at browser startup or corrupt/invalidate local browser state.

`TILDA_STORAGE_STATE` is a JSON snapshot of cookies and browser storage. It can be loaded by multiple independent headless contexts for reads and ordinary API calls. Treat the file as a secret and as read-only during routine work; only the capture/refresh flow should overwrite it after a fresh-context validation.

Recommended multi-agent setup:

- Store one durable state directory per Tilda account or project outside any repository.
- Capture manually into that directory when auth expires.
- Give routine agents the same `TILDA_STORAGE_STATE`, not the same `TILDA_LOGIN_PROFILE`.
- Serialize state refreshes and production writes to the same page.
- Avoid `/tmp` for real work because it is not durable and is easy to mix up between projects or agents.
