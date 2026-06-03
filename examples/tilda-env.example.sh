# Copy to .env.tilda.local, edit values, then run:
# source .env.tilda.local

export TILDA_PROJECT_ID="123456"
export TILDA_PAGE_ID="12345678"
export TILDA_PUBLIC_URL="https://example.com/page"
export TILDA_VERIFY_TEXT="Expected public text"

export TILDA_STATE_DIR="$HOME/.local/state/tilda-site-ops/project-name"
export TILDA_LOGIN_PROFILE="$TILDA_STATE_DIR/chrome-profile"
export TILDA_STORAGE_STATE="$TILDA_STATE_DIR/storage-state.json"

export TILDA_BACKUP_DIR="backups"

# Set TILDA_HEADLESS=1 per routine command. Leave it unset or set to 0 for
# capture and manual profile workbench because those require a visible browser.
# export TILDA_HEADLESS="1"

# Staging duplication.
export TILDA_SOURCE_PAGE_ID="$TILDA_PAGE_ID"
export TILDA_STAGING_ALIAS="project-name-staging"
export TILDA_STAGING_TITLE="Project Name - staging"

# Set only for the specific command that needs confirmation.
# export TILDA_CONFIRM_CREATE="1"
# export TILDA_CONFIRM_PUBLISH="1"

# Optional QA artifacts.
export TILDA_QA_SCREENSHOT_DIR="qa-artifacts/project-name"

# Optional explicit manual profile workbench target.
# export TILDA_MANUAL_URL="/projects/?projectid=$TILDA_PROJECT_ID"
# export TILDA_MANUAL_HOLD_SECONDS="900"
