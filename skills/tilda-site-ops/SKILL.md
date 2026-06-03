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
- Do QA from the user-facing public page after publish. Internal Tilda API success is not a visual or SEO verification.

## Reference Loading

- For login/session work, read `references/auth.md`.
- For installation, loading, or cross-agent reuse, read `references/install.md`.
- For page duplication, block operations, settings, and publishing, read `references/api-workflow.md`.
- For Playwright MCP browser QA, read `references/playwright-mcp.md`.
- For public-page verification or visual/content changes, read `references/qa.md`.
- Before making destructive or production changes, read `references/safety-checklist.md`.

## Script Preference

Use bundled scripts when they fit the task:

- `scripts/tilda-capture-storage-state.js` for manual browser login and local session capture.
- `scripts/tilda-validate-storage-state.js` before routine work if auth freshness is uncertain.
- `scripts/tilda-diagnose-storage-state.js` when a state file contains cookies but fresh validation still goes to login.
- `scripts/tilda-manual-profile-workbench.js` only for explicit current-session work when Tilda issues profile-bound, non-portable sessions.
- `scripts/tilda-backup-page.js` before edits.
- `scripts/tilda-create-staging-duplicate.js` to create a noindex staging page from a production page.
- `scripts/tilda-publish-page.js` for storage-state-only publishing and optional public URL verification.
- `scripts/tilda-qa-public-page.js` for headless desktop/mobile public-page checks and optional screenshots.

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
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/project-name/storage-state.json" \
node path/to/script.js
```

If a script opens Chrome visibly during routine work, pass `TILDA_STORAGE_STATE` and set `TILDA_HEADLESS=1`, or use a storage-state based Playwright `browser.newContext({ storageState })` flow. Do not use visible Chrome merely to call Tilda internal endpoints.

Bundled routine scripts must fail instead of falling back to a persistent profile when `TILDA_STORAGE_STATE` is missing.

## Session Storage

Use per-account or per-project paths outside the repo. For durable local state, prefer a user-only directory such as:

```bash
TILDA_STATE_DIR="$HOME/.local/state/tilda-site-ops/project-name"
TILDA_LOGIN_PROFILE="$TILDA_STATE_DIR/chrome-profile"
TILDA_STORAGE_STATE="$TILDA_STATE_DIR/storage-state.json"
```

On macOS, `$HOME/Library/Application Support/tilda-site-ops/project-name` is also acceptable. Do not use `/tmp` for real Tilda work: it is easy to lose, overwrite, or confuse across agents, which makes valid sessions look expired.

Never commit storage state, Chrome profiles, credentials, `csrf`, upload keys, or request dumps. If a repository needs sample config, commit only `.env.example` placeholders.

Capture must validate the saved `TILDA_STORAGE_STATE` in a new clean browser context before treating it as usable. Passing auth in the visible/persistent login browser is not enough.

Scripts create local `*.lock/` directories around persistent Chrome profiles and storage-state writes and refresh active locks with a heartbeat. If a lock blocks work, first check for a running Tilda/Playwright process; remove stale locks only when no owner process is active. `TILDA_LOCK_STALE_MS` controls automatic stale-lock cleanup.

If the state file contains Tilda `userid`/`hash` cookies but a fresh context loses them after navigation and lands on `/login/`, treat the session as profile-bound and non-portable. Do not use that file as routine state. A visible persistent profile may be used only as an explicitly reported manual authenticated browser for inspection or one-off human-supervised work, never as a hidden fallback for routine scripts.

When using manual profile workbench mode, keep all authenticated Tilda reads/writes inside the same persistent browser context and process that waited for login. Do not authenticate in one process and then start a separate routine script expecting `TILDA_STORAGE_STATE` to work.

## Parallel Agents

Safe pattern:

- One manual login/capture process owns `TILDA_LOGIN_PROFILE` and writes `TILDA_STORAGE_STATE`.
- Routine agents read the same `TILDA_STORAGE_STATE` into separate headless contexts.
- Do not run two capture/refresh operations for the same profile or state file at the same time.
- Avoid simultaneous writes to the same Tilda `pageid`, alias, or block records unless the task is intentionally coordinated.

## QA Rules

Apply QA proportionally to the change, but never skip the basics after a publish:

- Verify the published public URL returns `200` after redirects.
- Verify expected visible text is present on the public page.
- Verify desktop and mobile layouts for the changed area, especially Zero Block, forms, headers, sticky elements, and responsive typography.
- Check title, description, canonical, indexing, and `nofollow` expectations for staging vs production.
- For staging pages, confirm `nosearch=yes` and `meta_nofollow=yes` before sharing or publishing.
- For forms, buttons, menus, anchors, downloads, and embeds, test the actual interaction, not only that the element exists.
- For visual/content edits, compare before/after or backup JSON against the intended scope and report the changed `pageid`, public URL, backup path, and publish response.
- Do not mark the task done from Tilda API responses alone; public-page QA is the completion signal.
