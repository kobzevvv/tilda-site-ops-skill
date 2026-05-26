# Tilda Authorization

Use a real browser session. Headless Tilda sessions are often unreliable.

Recommended environment:

```bash
TILDA_PROJECT_ID=289314
TILDA_LOGIN_PROFILE=/tmp/tilda-login-profile-project-name
TILDA_STORAGE_STATE=/tmp/tilda-state-project-name.json
```

Run:

```bash
node skills/tilda-site-ops/scripts/tilda-capture-storage-state.js
```

The script opens Tilda in Chrome and waits for manual login. It saves `storageState` only after API checks pass.

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

