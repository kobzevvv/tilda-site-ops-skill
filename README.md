# Tilda Site Ops Skill

Reusable Codex skill and helper scripts for safer Tilda site operations:

- manual Tilda authorization through a persistent Chrome profile;
- local-only session capture;
- page backup before edits;
- staging page duplication with `noindex`/`nofollow`;
- workflow notes for Tilda's internal web endpoints.

The skill intentionally does not store Tilda passwords, cookies, CSRF tokens, or upload keys in the repository.

## Layout

```text
skills/tilda-site-ops/
  SKILL.md
  references/
    api-workflow.md
    auth.md
    qa.md
    safety-checklist.md
  scripts/
    tilda-browser-lib.js
    tilda-backup-page.js
    tilda-capture-storage-state.js
    tilda-create-staging-duplicate.js
    tilda-publish-page.js
    tilda-validate-storage-state.js
```

## Install Locally

For Codex, symlink the skill folder:

```bash
ln -s "$(pwd)/skills/tilda-site-ops" ~/.codex/skills/tilda-site-ops
```

Install script dependencies:

```bash
npm install
```

## Quick Start

Capture a Tilda session:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_STATE_DIR="$HOME/.local/state/tilda-site-ops/innovator" \
TILDA_LOGIN_PROFILE="$TILDA_STATE_DIR/chrome-profile" \
TILDA_STORAGE_STATE="$TILDA_STATE_DIR/storage-state.json" \
node skills/tilda-site-ops/scripts/tilda-capture-storage-state.js
```

Validate a saved session before routine work:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/innovator/storage-state.json" \
node skills/tilda-site-ops/scripts/tilda-validate-storage-state.js
```

Back up a page:

```bash
TILDA_HEADLESS=1 \
TILDA_PROJECT_ID=289314 \
TILDA_PAGE_ID=20631846 \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/innovator/storage-state.json" \
node skills/tilda-site-ops/scripts/tilda-backup-page.js
```

Create a staging duplicate:

```bash
TILDA_HEADLESS=1 \
TILDA_PROJECT_ID=289314 \
TILDA_SOURCE_PAGE_ID=20631846 \
TILDA_STAGING_ALIAS=mincifra-test \
TILDA_STAGING_TITLE='Инноватор: главная - тест Минцифры' \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/innovator/storage-state.json" \
TILDA_CONFIRM_CREATE=1 \
node skills/tilda-site-ops/scripts/tilda-create-staging-duplicate.js
```

Publish and verify a page:

```bash
TILDA_HEADLESS=1 \
TILDA_PROJECT_ID=289314 \
TILDA_PAGE_ID=20631846 \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/innovator/storage-state.json" \
TILDA_PUBLIC_URL="https://example.com/page" \
TILDA_VERIFY_TEXT="Expected public text" \
TILDA_CONFIRM_PUBLISH=1 \
node skills/tilda-site-ops/scripts/tilda-publish-page.js
```

## Safety Defaults

- Use a staging duplicate before touching a production page.
- Save JSON backups under `backups/`.
- Keep staging pages closed from indexing.
- Verify public URLs after publishing.
- Do not commit session files, storage-state JSON, or browser profiles.
- Do not run multiple persistent Chrome sessions with the same `TILDA_LOGIN_PROFILE`; share `TILDA_STORAGE_STATE` for routine headless work instead.
- Do not use `/tmp` for durable Tilda session state.
- Run public-page QA after publish: status, expected text, desktop/mobile layout, SEO/indexing flags, and changed interactions.
