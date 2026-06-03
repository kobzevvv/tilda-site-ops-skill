# Playwright MCP QA

Use Playwright MCP for public-page QA when the agent has the browser MCP tools available. Do not use MCP to log into Tilda or to store Tilda credentials. Tilda editor/API work should go through the storage-state scripts.

## When To Use MCP

- Visual or layout checks after publishing.
- Desktop/mobile comparisons.
- Checking links, menus, buttons, anchors, forms, and embeds.
- Capturing console messages and failed network requests.
- Taking screenshots for QA artifacts.

## Suggested Workflow

1. Navigate to `TILDA_PUBLIC_URL`.
2. Capture a snapshot and confirm expected visible text.
3. Check console messages at warning/error level.
4. Check network requests for failed document, script, CSS, image, font, XHR, and fetch calls.
5. Take a screenshot when visual layout changed or when the user needs evidence.
6. Resize to a mobile viewport and repeat the changed-area checks.
7. Report URL, viewport coverage, expected text, console/network findings, and screenshots if saved.

## Tool Mapping

- `browser_navigate`: open the public URL.
- `browser_snapshot`: inspect page structure and interactable elements.
- `browser_take_screenshot`: save visual evidence.
- `browser_resize`: switch desktop/mobile viewports.
- `browser_console_messages`: inspect console warnings/errors.
- `browser_network_requests`: inspect failed or suspicious requests.
- `browser_click`, `browser_type`, `browser_select_option`: test interactions when in scope.

Prefer `browser_snapshot` for reasoning and element targeting. Use screenshots for visual evidence; do not rely on screenshots alone when checking text, links, forms, or accessibility structure.

## Fallback Without MCP

Run the bundled Playwright script:

```bash
TILDA_PUBLIC_URL="https://example.com/page" \
TILDA_VERIFY_TEXT="Expected public text" \
TILDA_QA_SCREENSHOT_DIR="qa-artifacts/example-page" \
node skills/tilda-site-ops/scripts/tilda-qa-public-page.js
```

This checks desktop and mobile page loads, optional expected text, title, console errors, failed network requests, and optional screenshots.
