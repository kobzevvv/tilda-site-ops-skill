# Agent Setup

Use this when onboarding someone who has not used Codex, Claude Code, skills, or Playwright MCP for Tilda work.

## Minimal Requirements

- Node.js and npm.
- Google Chrome.
- A checked-out project repository.
- Tilda account access for the target project.
- This `tilda-site-ops` skill installed or symlinked for the agent.
- Playwright MCP configured if the agent will do browser-based public QA.

## Codex

Install Codex:

```bash
npm install -g @openai/codex
```

Install the skill:

```bash
mkdir -p ~/.codex/skills
ln -s /path/to/tilda-site-ops-skill/skills/tilda-site-ops ~/.codex/skills/tilda-site-ops
```

Configure Playwright MCP in `~/.codex/config.toml`:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]
```

In a project repository, add an `AGENTS.md` pointer:

```md
Before Tilda work, read:

- /path/to/tilda-site-ops-skill/skills/tilda-site-ops/SKILL.md
- workdocs/tilda-site-ops-runbook-<project>.md
```

## Claude Code

Install the skill for Claude Code:

```bash
mkdir -p ~/.claude/skills
ln -s /path/to/tilda-site-ops-skill/skills/tilda-site-ops ~/.claude/skills/tilda-site-ops
```

In a project repository, add a `CLAUDE.md` pointer:

```md
Before Tilda work, read:

- /path/to/tilda-site-ops-skill/skills/tilda-site-ops/SKILL.md
- workdocs/tilda-site-ops-runbook-<project>.md
```

## Starter Prompt

```text
Use the tilda-site-ops skill.

First read:
- AGENTS.md or CLAUDE.md if present
- the project Tilda runbook
- the tilda-site-ops auth reference

Task:
Check whether this session can safely work with Tilda.

Rules:
1. Do not open visible Chrome at first.
2. Validate TILDA_STORAGE_STATE in a fresh context using the project runbook paths.
3. If storage-state is valid, say routine headless Tilda work is available.
4. If storage-state is profile-bound or invalid, stop and explain that manual-profile mode is required before any Tilda writes.
5. Do not use TILDA_HEADLESS=0 unless explicitly approved.
6. Do not lower TILDA_LOCK_STALE_MS to seconds-scale values.
7. Use Playwright MCP for public-page QA or explicit visual checks, not for repeated Tilda admin clicking.

Never store cookies, csrf, upload keys, request dumps, browser profiles, or credentials in the repo.
```

## Playwright MCP Scope

Use Playwright MCP for:

- opening public pages;
- desktop/mobile layout checks;
- public links, menus, buttons, anchors, forms, and embeds;
- screenshots;
- console and network failures.

Do not use Playwright MCP to repeatedly click through Tilda admin UI unless the task is explicitly visual/manual. Routine Tilda operations should use validated storage-state and browser-backed internal requests.

## What Else Is Needed

For public QA only: Codex or Claude Code, Playwright MCP, and repository access.

For Tilda reads/writes/publishing: Tilda project access plus either a valid `TILDA_STORAGE_STATE` or explicit approval for one manual-profile workbench.
