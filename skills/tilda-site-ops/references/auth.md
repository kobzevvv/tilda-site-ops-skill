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

If validation fails even though the JSON file contains Tilda cookies, diagnose whether Tilda clears them on first navigation:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_STORAGE_STATE=$HOME/.local/state/tilda-site-ops/project-name/storage-state.json \
node skills/tilda-site-ops/scripts/tilda-diagnose-storage-state.js
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

Bundled scripts create `*.lock/` directories around persistent Chrome profiles and storage-state writes, and active owners refresh lock mtime with a heartbeat. If a lock is present, assume another agent or previous process owns that profile/state until proven otherwise. Stale locks are removed after `TILDA_LOCK_STALE_MS` milliseconds; the default is 24 hours to avoid interrupting long manual sessions.

## Profile-Bound Sessions

Tilda may issue a session that works in the visible Chrome profile but is not portable to a fresh Playwright context. The symptom is:

- `storage-state.json` contains Tilda `userid` and `hash` cookie names.
- A fresh context initially loads those cookie names.
- After navigating to the Tilda project, Tilda clears those cookies and redirects to `/login/`.

When this happens, the user is logged in, but the saved state is not a valid routine-state. Capture must stop immediately with a profile-bound/non-portable message instead of retrying until timeout. Do not mark capture successful, do not use that state for routine API/write/publish scripts, and do not silently fall back to `TILDA_LOGIN_PROFILE`.

Allowed handling:

- Refresh capture and wait for a portable state if Tilda eventually issues one.
- Use the visible persistent profile only for manual inspection, CAPTCHA, or a clearly reported one-off human-supervised action.
- Tell the user the session is profile-bound/non-portable and that routine scripts are blocked until fresh-context validation passes.

For an explicit current-session workbench:

```bash
TILDA_HEADLESS=0 \
TILDA_PROJECT_ID=289314 \
TILDA_LOGIN_PROFILE=$HOME/.local/state/tilda-site-ops/project-name/chrome-profile \
TILDA_MANUAL_URL="/projects/?projectid=289314" \
TILDA_MANUAL_HOLD_SECONDS=900 \
TILDA_CONFIRM_MANUAL_PROFILE=1 \
node skills/tilda-site-ops/scripts/tilda-manual-profile-workbench.js
```

This mode waits for API auth in the visible profile and keeps the browser open. It does not save or validate reusable state. Set `TILDA_MANUAL_HOLD_SECONDS=0` to exit immediately after auth and navigation. If a task needs API dumps or writes while in this mode, implement them inside the same persistent context process rather than starting a separate storage-state routine script.

## Manual Mode Resource Discipline

Visible Chrome is disruptive and expensive compared with headless work. Use it only when the task needs login, CAPTCHA, human checks, visual admin inspection, or a profile-bound same-process workbench.

Rules:

- Announce why visible Chrome is required before opening it.
- Use `TILDA_CONFIRM_MANUAL_PROFILE=1`; do not hide manual mode behind a fallback.
- Consolidate Tilda reads, writes, saves, and publishes into one same-process workbench instead of opening many short browser sessions.
- Do not use visible Chrome for public-page QA. Use Playwright MCP or a headless QA script for public pages.
- If visible Chrome is disruptive to the user, stop and ask before continuing.
- Do not lower `TILDA_LOCK_STALE_MS` to seconds-scale values during normal work. Treat that as emergency cleanup only, after checking that no owner process is active.
- Never run two manual-profile processes against the same `TILDA_LOGIN_PROFILE`.

Recommended multi-agent setup:

- Store one durable state directory per Tilda account or project outside any repository.
- Capture manually into that directory when auth expires.
- Give routine agents the same `TILDA_STORAGE_STATE`, not the same `TILDA_LOGIN_PROFILE`.
- Serialize state refreshes and production writes to the same page.
- Avoid `/tmp` for real work because it is not durable and is easy to mix up between projects or agents.

## Cross-Session Handoff

Skills store general rules; project runbooks store project-specific IDs, URLs, and local state paths. Do not put project-specific auth paths into this skill.

For every recurring Tilda project, create a repository runbook such as `workdocs/tilda-site-ops-runbook-<project>.md` with:

- `TILDA_PROJECT_ID`, relevant `TILDA_PAGE_ID` values, and public URLs.
- Canonical `TILDA_STATE_DIR`, `TILDA_STORAGE_STATE`, and, only if needed, `TILDA_LOGIN_PROFILE`.
- Current auth status: `portable-storage-state`, `profile-bound`, or `unknown`.
- Which project-specific scripts are compliant with storage-state-only routine mode.
- Any known manual-profile exception and the exact env flag required to use it.

Add only a short pointer in `AGENTS.md` and `CLAUDE.md`:

```md
Before Tilda work, read the tilda-site-ops skill and workdocs/tilda-site-ops-runbook-<project>.md.
```

Do not duplicate cookies, `csrf`, upload keys, request dumps, or credentials in runbooks. Other sessions should discover secrets only from the local state paths described by the runbook.

Before using any project-specific Tilda script, inspect whether it calls `launchPersistentContext` or reads `TILDA_LOGIN_PROFILE`. If it does, do not run it for routine work. Patch it to `browser.newContext({ storageState })`, or run it only as an explicit manual-profile exception with `TILDA_CONFIRM_MANUAL_PROFILE=1` and report that exception to the user.

If a project-specific script opens a visible browser without an explicit manual-mode env flag, treat it as non-compliant and stop.
