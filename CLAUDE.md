# P-6 Sample Manager

## Plan file

The topic plan is `docs/plans/p6-sample-app.md`.

Update it **before** committing, and commit it with the work it tracks — never as a
follow-up commit. Sequence:

1. Write the plan entry (what landed, what was verified, decisions taken in conversation).
   Never write a claim about commit state you can't know yet, such as "not committed",
   and leave the SHA out: a commit cannot contain its own hash, and amending one in
   changes the very hash it claims.
2. Stage the plan with the change and commit it together.
3. Push.
4. The *next* plan update fills in the previous entry's SHA, which is published and
   stable by then — never a dedicated catch-up commit for it.

## Stack

No build, no runtime dependency other than Google Fonts. ES modules served as-is, so a
new module needs no registration anywhere — the service worker caches whatever the page
actually loaded (`performance.getEntriesByType`).

Serve it with `python3 -m http.server 8080`; `file://` breaks modules and disk access.
The service worker is *stale-while-revalidate*, so **a code change shows up on the second
reload**. Reload twice before concluding a change didn't work.

## Language

Everything in this repo is written in English: page, runtime messages, manifest, README,
comments and the plan files under `docs/plans/`.
