# Markdown Batch Publishing

Use this when a Tilda section is sourced from Markdown or another file-based editorial format and should be published as many pages.

## Source Layout

Prefer Markdown plus structured metadata as the source of truth:

```text
tilda-production-content/new-section/
  README.md
  REQUIREMENTS_LOG.md
  section-style.md
  pages/
    001-intro.md
    002-topic.md
    ...
    030-final.md
  assets/
  reports/
```

Each page should have frontmatter:

```md
---
title: "Page title"
alias: "page-url"
meta_title: "SEO title"
meta_description: "SEO description"
h1: "Visible H1"
template: "article"
status: "ready"
---

# Visible H1

Intro text...
```

Markdown is the editorial source. It should not be pasted raw into Tilda. A project script should transform it into the site's Tilda block structure.

## Style And Layout

Keep style separate from page content.

Use a section-level style file such as `section-style.md` to define:

- typography and text width;
- hero layout;
- heading scale;
- card, list, table, and CTA patterns;
- image and asset rules;
- mobile behavior;
- forbidden visual patterns.

Use code/templates for layout mapping:

```text
frontmatter -> page settings
H1 + intro -> hero block
body headings -> text blocks
tables -> styled HTML blocks
assets -> Tilda image fields or uploaded assets
shared CTA -> standard CTA block
```

## Ideal Workflow

1. Create the source folder.
2. Write `REQUIREMENTS_LOG.md` with durable requirements and forbidden regressions.
3. Write `section-style.md`.
4. Add Markdown pages with complete frontmatter.
5. Run a dry run without touching Tilda.
6. QA the dry-run HTML and metadata.
7. Validate Tilda auth.
8. Create or update noindex/nofollow staging pages headlessly if `TILDA_STORAGE_STATE` is valid.
9. If auth is profile-bound, stop and ask before using manual-profile mode.
10. Publish staging and run public QA.
11. Publish production only after approval.
12. Run final public QA and save a batch report.

## Dry Run

Project scripts should support a dry-run mode:

```bash
TILDA_DRY_RUN=1 node ci-cd/tilda-publish-new-section.js
```

Dry run should check:

- required frontmatter;
- unique aliases;
- title/meta length and presence;
- heading hierarchy;
- missing or broken image paths;
- broken internal links;
- empty sections;
- repeated placeholder text;
- likely mobile overflow.

## Auth And Resource Rules

For a 30-page section, do not open visible Chrome per page.

Correct:

- validate `TILDA_STORAGE_STATE` once;
- use headless API/browser-context work for the batch;
- if profile-bound, open one explicit manual workbench and keep all Tilda reads/writes inside it;
- run public QA with Playwright MCP or headless scripts.

Incorrect:

- opening Tilda admin repeatedly;
- clicking through each page manually;
- silently falling back to persistent profiles;
- lowering `TILDA_LOCK_STALE_MS` to seconds-scale values to force through locks;
- running multiple sessions on one `TILDA_LOGIN_PROFILE`.

## Example Prompt

```text
We need to publish a new Tilda section from Markdown.

Use the tilda-site-ops skill and the project-specific runbook.

Source folder:
tilda-production-content/new-section/

Do this end to end:
1. Read README.md, REQUIREMENTS_LOG.md, section-style.md, and all Markdown files in pages/.
2. Validate frontmatter: title, alias, meta_title, meta_description, h1, template, status.
3. Build dry-run HTML previews without touching Tilda.
4. Report content, metadata, image, link, or layout issues before publishing.
5. Validate Tilda auth using the project runbook.
6. If storage-state is valid, create or update staging pages headlessly.
7. If storage-state is profile-bound, stop and ask before using manual-profile mode.
8. Publish staging with noindex/nofollow.
9. Use Playwright MCP or the bundled QA script for public staging QA on desktop and mobile.
10. Produce a report with page IDs, aliases, URLs, backup paths, publish responses, screenshots, and QA results.

Do not store cookies, csrf, upload keys, request dumps, browser profiles, or credentials in the repo.
Do not open visible Chrome unless manual-profile mode is explicitly approved.
```

## Principle

- Markdown is the editorial source.
- Project scripts are the layout engine.
- Skills and runbooks are the operating system.
- Tilda is the publishing target.
