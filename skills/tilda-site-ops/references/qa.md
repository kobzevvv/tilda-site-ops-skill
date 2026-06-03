# Tilda QA

QA must verify the user-facing result, not only Tilda API responses.

## Minimum After Publish

- Open the final public URL and confirm it returns `200` after redirects.
- Confirm expected visible text or changed content is present.
- Confirm the changed area renders correctly on desktop and mobile viewport widths.
- Check browser console and failed network requests when using Playwright for visual QA.
- Record the checked URL, page id, publish response, and backup path in the final report.

## SEO And Indexing

- Production: check title, description, canonical, robots/indexing expectations, and social image expectations when relevant.
- Staging: confirm `nosearch=yes`, `meta_nofollow=yes`, and no production canonical unless explicitly intended.
- Do not share or approve a staging URL until noindex/nofollow has been confirmed.

## Layout And Visual QA

- Check the changed block and neighboring blocks, not only the exact edited text.
- Check desktop and mobile for overflow, clipped text, broken stacking, sticky elements, popups, and Zero Block responsiveness.
- For header/footer/shared blocks, inspect at least one unrelated page that could inherit the change.
- For image/video changes, confirm assets load from the public page and are not broken, blurred unexpectedly, or hidden behind overlays.

## Interaction QA

- Test changed links, buttons, menus, anchors, forms, embeds, downloads, and payment/lead flows when they are in scope.
- For forms, submit only when it is safe and expected; otherwise verify validation, required fields, target action, and success/error states.
- For external links and downloads, confirm the final target opens and is the intended asset or URL.

## Completion Rule

Do not mark a Tilda task complete from internal API success, editor state, or publish response alone. Completion requires public-page QA appropriate to the change.
