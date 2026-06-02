---
name: tilda-site-ops
description: "Operate Tilda sites safely through browser-backed internal Tilda endpoints. Use when authorizing in Tilda, backing up pages, duplicating pages for staging, editing Tilda blocks, publishing pages, or planning Tilda changes without storing passwords, cookies, CSRF tokens, or upload keys in a repository."
---

# Tilda Site Ops

Use this skill for Tilda work that touches live projects, page copies, blocks, settings, or publication.

## Core Rules

- Keep Tilda credentials, cookies, `csrf`, upload keys, and browser session artifacts out of repositories.
- After a valid `TILDA_STORAGE_STATE` has been captured, prefer headless/browser-context API work and avoid bringing Tilda Chrome windows to the user's foreground.
- Use a visible browser only for login, CAPTCHA/human checks, or explicit visual inspection.
- Treat `TILDA_LOGIN_PROFILE` as a single-writer resource. Do not launch multiple persistent Chrome contexts against the same profile.
- Treat `TILDA_STORAGE_STATE` as a secret read-only snapshot for routine work. Multiple agents may load it into separate headless contexts, but only refresh or overwrite it intentionally.
- Prefer a staging duplicate before editing a production page.
- Back up the target page JSON before any write operation.
- Set staging pages to `nosearch=yes` and `meta_nofollow=yes`.
- Verify the public URL after publishing; API success alone is not enough.

## Reference Loading

- For login/session work, read `references/auth.md`.
- For page duplication, block operations, settings, and publishing, read `references/api-workflow.md`.
- Before making destructive or production changes, read `references/safety-checklist.md`.

## Script Preference

Use bundled scripts when they fit the task:

- `scripts/tilda-capture-storage-state.js` for manual browser login and local session capture.
- `scripts/tilda-backup-page.js` before edits.
- `scripts/tilda-create-staging-duplicate.js` to create a noindex staging page from a production page.

All scripts are configured by environment variables and should be copied or patched for project-specific needs rather than hardcoding secrets.

## Default Workflow

1. Identify `projectid`, production `pageid`, staging alias, and target public URL.
2. Capture or refresh the Tilda session with a persistent Chrome profile only when needed.
3. Back up the production page JSON.
4. Create or reuse a staging duplicate.
5. Make changes on staging.
6. Publish and verify staging.
7. After approval, back up production again and apply the same controlled change.
8. Publish production and verify desktop/mobile public pages.

## Browser Mode

Default to this split:

- **Visible browser**: only for manual login, CAPTCHA, consent prompts, or visual QA.
- **Headless/API browser context**: all routine reads, backups, page duplication, block edits, settings saves, and publishing after auth works.

For bundled scripts and project-specific scripts, run routine Tilda operations with `TILDA_STORAGE_STATE`; this lets scripts use a fresh headless Playwright context instead of a persistent Chrome profile:

```bash
TILDA_HEADLESS=1 \
TILDA_STORAGE_STATE=/tmp/tilda-state-project-name.json \
node path/to/script.js
```

If a script opens Chrome visibly during routine work, pass `TILDA_STORAGE_STATE` and set `TILDA_HEADLESS=1`, or use a storage-state based Playwright `browser.newContext({ storageState })` flow. Do not use visible Chrome merely to call Tilda internal endpoints.

Bundled routine scripts should fail instead of falling back to a persistent profile when `TILDA_STORAGE_STATE` is missing. Use `TILDA_ALLOW_PERSISTENT_ROUTINE=1` only when a human intentionally accepts a foreground/persistent-profile run.

## Session Storage

Use per-account or per-project paths outside the repo. For durable local state, prefer a user-only directory such as:

```bash
TILDA_STATE_DIR="$HOME/.local/state/tilda-site-ops/project-name"
TILDA_LOGIN_PROFILE="$TILDA_STATE_DIR/chrome-profile"
TILDA_STORAGE_STATE="$TILDA_STATE_DIR/storage-state.json"
```

On macOS, `$HOME/Library/Application Support/tilda-site-ops/project-name` is also acceptable. `/tmp` is fine for throwaway sessions, but it is not a durable secret store.

Never commit storage state, Chrome profiles, credentials, `csrf`, upload keys, or request dumps. If a repository needs sample config, commit only `.env.example` placeholders.

## Parallel Agents

Safe pattern:

- One manual login/capture process owns `TILDA_LOGIN_PROFILE` and writes `TILDA_STORAGE_STATE`.
- Routine agents read the same `TILDA_STORAGE_STATE` into separate headless contexts.
- Do not run two capture/refresh operations for the same profile or state file at the same time.
- Avoid simultaneous writes to the same Tilda `pageid`, alias, or block records unless the task is intentionally coordinated.
