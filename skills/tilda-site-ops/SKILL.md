---
name: tilda-site-ops
description: "Operate Tilda sites safely through browser-backed internal Tilda endpoints. Use when authorizing in Tilda, backing up pages, duplicating pages for staging, editing Tilda blocks, publishing pages, or planning Tilda changes without storing passwords, cookies, CSRF tokens, or upload keys in a repository."
---

# Tilda Site Ops

Use this skill for Tilda work that touches live projects, page copies, blocks, settings, or publication.

## Core Rules

- Keep Tilda credentials, cookies, `csrf`, upload keys, and browser session artifacts out of repositories.
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
2. Capture or refresh the Tilda session with a persistent Chrome profile.
3. Back up the production page JSON.
4. Create or reuse a staging duplicate.
5. Make changes on staging.
6. Publish and verify staging.
7. After approval, back up production again and apply the same controlled change.
8. Publish production and verify desktop/mobile public pages.

