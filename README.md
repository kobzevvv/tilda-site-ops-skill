# Tilda Site Ops Skill

Reusable Codex skill and helper scripts for safer Tilda site operations:

- manual Tilda authorization through a persistent Chrome profile;
- local-only session capture;
- page backup before edits;
- staging page duplication with `noindex`/`nofollow`;
- storage-state-only publishing;
- public-page QA guidance for Playwright MCP and Playwright scripts;
- workflow notes for Tilda's internal web endpoints.

The skill intentionally does not store Tilda passwords, cookies, CSRF tokens, or upload keys in the repository.

## Layout

```text
skills/tilda-site-ops/
  SKILL.md
  references/
    api-workflow.md
    agent-setup.md
    auth.md
    install.md
    markdown-batch-publishing.md
    playwright-mcp.md
    qa.md
    safety-checklist.md
  scripts/
    tilda-browser-lib.js
    tilda-backup-page.js
    tilda-capture-storage-state.js
    tilda-create-staging-duplicate.js
    tilda-diagnose-storage-state.js
    tilda-manual-profile-workbench.js
    tilda-publish-page.js
    tilda-qa-public-page.js
    tilda-validate-storage-state.js
examples/
  tilda-env.example.sh
```

## Install For Agents

Codex:

```bash
mkdir -p ~/.codex/skills
ln -s "$(pwd)/skills/tilda-site-ops" ~/.codex/skills/tilda-site-ops
```

Claude Code:

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/tilda-site-ops" ~/.claude/skills/tilda-site-ops
```

For a single project, link or copy the skill to `.claude/skills/tilda-site-ops` or the equivalent skill directory used by the agent. Keep `SKILL.md`, `references/`, and `scripts/` together.

Install script dependencies in this repository:

```bash
npm install
npm run check
```

Read `skills/tilda-site-ops/references/install.md` for Codex, Claude, and generic agent loading notes.

For first-time users, read `skills/tilda-site-ops/references/agent-setup.md`. It includes a minimal Codex install command, Playwright MCP config, symlink setup, and a starter prompt.

For section publishing from Markdown, read `skills/tilda-site-ops/references/markdown-batch-publishing.md`. It describes the source layout, dry-run, staging, production, and QA workflow for multi-page batches.

## Configure A Project

Use the shell example as a starting point:

```bash
cp examples/tilda-env.example.sh .env.tilda.local
$EDITOR .env.tilda.local
source .env.tilda.local
```

Do not commit `.env.tilda.local`, storage-state JSON, Chrome profiles, cookies, credentials, `csrf`, upload keys, or request dumps.

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

Diagnose a non-portable storage state:

```bash
TILDA_PROJECT_ID=289314 \
TILDA_STORAGE_STATE="$HOME/.local/state/tilda-site-ops/innovator/storage-state.json" \
node skills/tilda-site-ops/scripts/tilda-diagnose-storage-state.js
```

Open an explicit one-off visible profile workbench when storage state is non-portable:

```bash
TILDA_HEADLESS=0 \
TILDA_PROJECT_ID=289314 \
TILDA_LOGIN_PROFILE="$HOME/.local/state/tilda-site-ops/innovator/chrome-profile" \
TILDA_MANUAL_URL="/projects/?projectid=289314" \
TILDA_MANUAL_HOLD_SECONDS=900 \
TILDA_CONFIRM_MANUAL_PROFILE=1 \
node skills/tilda-site-ops/scripts/tilda-manual-profile-workbench.js
```

This is for current-session manual or project-specific work only. It does not create reusable routine state. Set `TILDA_MANUAL_HOLD_SECONDS=0` if the script should exit immediately after auth and navigation.

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

Run public-page QA:

```bash
TILDA_PUBLIC_URL="https://example.com/page" \
TILDA_VERIFY_TEXT="Expected public text" \
TILDA_QA_SCREENSHOT_DIR="qa-artifacts/example-page" \
node skills/tilda-site-ops/scripts/tilda-qa-public-page.js
```

## Safety Defaults

- Use a staging duplicate before touching a production page.
- Save JSON backups under `backups/`.
- Keep staging pages closed from indexing.
- Verify public URLs after publishing.
- Do not commit session files, storage-state JSON, or browser profiles.
- Do not run multiple persistent Chrome sessions with the same `TILDA_LOGIN_PROFILE`; share `TILDA_STORAGE_STATE` for routine headless work instead.
- Do not use `/tmp` for durable Tilda session state.
- Do not open visible Chrome repeatedly. If profile-bound manual mode is required, use one explicit same-process workbench with `TILDA_CONFIRM_MANUAL_PROFILE=1`.
- Do not reduce `TILDA_LOCK_STALE_MS` to seconds-scale values during normal work.
- Run public-page QA after publish: status, expected text, desktop/mobile layout, SEO/indexing flags, and changed interactions.
