# Tilda Safety Checklist

Before writes:

- Confirm the `projectid` and `pageid`.
- Confirm whether the target is staging or production.
- Validate `TILDA_STORAGE_STATE` in a fresh context; do not use persistent-profile fallback for routine writes.
- Back up the page JSON.
- Keep credentials and session files outside the repo.
- For staging, set `nosearch=yes` and `meta_nofollow=yes`.

During writes:

- Prefer updating known records by explicit `recordid`.
- When copying blocks, verify the target page after paste.
- Avoid deleting blocks unless the backup exists and the target record is confirmed.
- Do not republish unrelated pages unless the task requires shared header/footer propagation.

After publish:

- Check public URL returns `200`.
- Check visible text is present.
- Check title, description, canonical, and robots/noindex expectations.
- Check desktop and mobile for broken layout.
- Test changed interactions: forms, links, menus, buttons, embeds, downloads, and anchors.
- Compare the public page against the intended scope of change; watch for header/footer or shared-block side effects.
- Keep a report with page id, alias, public URL, backup path, and publish response.
