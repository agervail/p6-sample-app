# P-6 Sample Manager

## State

- [x] 2026-08-19 — Application skeleton: banks × pads model, WAV decoding, resampling,
      pitch, mono, slicing, 16-bit WAV export, sequential writing into `IMPORT`, reading
      back, undo/redo, persistence of the target folder. Commit `11d8119`, pushed to
      `origin/main`.

- [x] 2026-08-19 — Boot notice when the page is opened over `file://`, instead of an
      empty, silent grid.
- [x] 2026-08-19 — PWA: manifest, generated icons, offline service worker. Verified with
      the server stopped: the app starts from the cache, fonts included.
- [ ] Publish on GitHub Pages to do away with the local server — waiting for Antoine's
      go-ahead, it makes the repo and the app public.

- [x] 2026-08-19 — Roland specs provided by Antoine: 512 KiB per sample confirmed, sample
      rates corrected to 44100 / 22050 / 14700 / 11025 (32000 and 16000 do not exist on
      the device).

- [x] 2026-08-19 — Interface switched to English (page, messages, README, manifest) and
      visual overhaul: classic dark theme, neutral palette with a single blue accent,
      Inter instead of Archivo Narrow, larger sizes and spacing. Verified in the browser:
      loading a WAV by drag and drop, overflow area, chop, dialog, toasts, `file://`
      notice. Commit `ad013e4`, pushed to `origin/main`.

- [x] 2026-08-19 — Repo `CLAUDE.md` added: plan-before-commit sequence, the
      stale-while-revalidate reload trap, the language rule. Plan file and the last French
      strings translated, so the whole repo is English.

## Decisions

- Model chosen: 4 banks × 6 pads (the P-6 screenshot), not the flat list from the brief.
- Processing chosen: what the P-6 itself offers (sample rate, mono, pitch in cents, chop).
  Normalization, silence trimming and fades from the initial brief are out of V1.
- Dark visual direction taken from the screenshot, but re-typeset: a single signal color,
  amber reserved for the write action, red for destructive actions.
- Revamp 2026-08-19: a "classic" dark theme rather than the Roland mockup. Neutral grays,
  blue #4D8DFD as the only signal color (the write button included — it is no longer
  amber), amber kept for chop and warnings, red for destructive actions. One interface
  family (Inter) plus JetBrains Mono for figures.
- Waveform colors live in `js/ui/waveform.js` (`waveColor`), no longer duplicated in
  `main.js` and `ui/pad.js`.
- Everything is written in English: app, README, this plan, comments.
- Antoine's request (2026-08-19): this plan is updated *before* the commit and shipped
  inside it, never as a catch-up commit. An entry therefore carries no SHA when written —
  a commit cannot contain its own hash, and amending to insert one changes the very hash
  it claims. The next plan update fills in the previous entry's SHA, once it is published
  and stable. Recorded in the repo `CLAUDE.md`.
- The brief called for a single HTML file; the real scope (banks, chop, resampling, undo,
  disk access) broke it into ES modules served as-is. Still no build.
- The service worker keeps no list of files to precache: the page sends it what it
  actually just loaded (`performance.getEntriesByType`), plus the manifest and icons that
  this API does not see. Nothing to update when adding a module.
- *stale-while-revalidate* rather than a versioned cache: no version number to bump, at
  the cost of being one reload behind after a change.
- Pitch is baked into the written file as a speed change, not exposed as a P-6 parameter:
  we resample to `sampleRate / 2^(cents/1200)` and declare the header at `sampleRate`.
- Playback renders exactly the file that will be written, truncation included.

## To verify

- The `A1_` naming format assumes the P-6 imports in alphabetical order.

## Possible next steps

- Processing presets, duplicate hashing, manual slicing on the waveform, reordering pads
  by drag and drop.
