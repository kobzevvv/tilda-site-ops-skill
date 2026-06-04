# Installing And Loading The Skill

Keep the whole `skills/tilda-site-ops/` directory together. `SKILL.md` is the entry point, and the referenced `references/` and `scripts/` files are part of the skill.

## Codex

Install as a user skill:

```bash
mkdir -p ~/.codex/skills
ln -s /path/to/tilda-site-ops-skill/skills/tilda-site-ops ~/.codex/skills/tilda-site-ops
```

Validate after install:

```bash
codex debug prompt-input "skill load smoke test" >/tmp/codex_prompt_input.json
```

Then ask for `$tilda-site-ops` explicitly or let Codex load it when the task mentions Tilda authorization, backups, staging duplication, edits, publishing, or QA.

## Claude Code

Install as a personal Claude Code skill:

```bash
mkdir -p ~/.claude/skills
ln -s /path/to/tilda-site-ops-skill/skills/tilda-site-ops ~/.claude/skills/tilda-site-ops
```

Install as a project-local Claude Code skill:

```bash
mkdir -p .claude/skills
ln -s /path/to/tilda-site-ops-skill/skills/tilda-site-ops .claude/skills/tilda-site-ops
```

Use the project-local install when a repository should carry the exact skill version for that project. Use the personal install when the same local operator will reuse it across many projects.

## Other Agents

For agents that support `SKILL.md`, copy or symlink the full skill directory into that agent's skill directory. Preserve this shape:

```text
tilda-site-ops/
  SKILL.md
  references/
  scripts/
```

For agents without native skill loading, point the agent at `SKILL.md` and load only the relevant reference files for the task:

- `references/auth.md` for login/session capture.
- `references/api-workflow.md` for read/write/publish operations.
- `references/agent-setup.md` for first-time Codex, Claude Code, and Playwright MCP setup.
- `references/markdown-batch-publishing.md` for publishing many Tilda pages from Markdown or another file-based editorial source.
- `references/qa.md` and `references/playwright-mcp.md` for public-page QA.
- `references/safety-checklist.md` before destructive or production changes.

The helper scripts can be run directly from any shell after `npm install`, even if the agent cannot load skills.

## Project Configuration

Create a local project env file from the example:

```bash
cp examples/tilda-env.example.sh .env.tilda.local
$EDITOR .env.tilda.local
source .env.tilda.local
```

Never commit project env files, storage-state JSON, browser profiles, cookies, credentials, `csrf`, upload keys, or request dumps.

## Updating

Pull or clone the repository, then re-run:

```bash
npm install
npm run check
```

Symlink installs pick up updates automatically. Copy installs must be recopied after updates.
