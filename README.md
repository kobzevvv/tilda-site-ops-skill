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
    safety-checklist.md
  scripts/
    tilda-browser-lib.js
    tilda-backup-page.js
    tilda-capture-storage-state.js
    tilda-create-staging-duplicate.js
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
TILDA_LOGIN_PROFILE=/tmp/tilda-login-profile-innovator \
TILDA_STORAGE_STATE=/tmp/tilda-state-innovator.json \
node skills/tilda-site-ops/scripts/tilda-capture-storage-state.js
```

Back up a page:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_PAGE_ID=20631846 \
TILDA_LOGIN_PROFILE=/tmp/tilda-login-profile-innovator \
node skills/tilda-site-ops/scripts/tilda-backup-page.js
```

Create a staging duplicate:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_SOURCE_PAGE_ID=20631846 \
TILDA_STAGING_ALIAS=mincifra-test \
TILDA_STAGING_TITLE='Инноватор: главная - тест Минцифры' \
TILDA_LOGIN_PROFILE=/tmp/tilda-login-profile-innovator \
TILDA_CONFIRM_CREATE=1 \
node skills/tilda-site-ops/scripts/tilda-create-staging-duplicate.js
```

## Safety Defaults

- Use a staging duplicate before touching a production page.
- Save JSON backups under `backups/`.
- Keep staging pages closed from indexing.
- Verify public URLs after publishing.
- Do not commit `/tmp` session files or browser profiles.

