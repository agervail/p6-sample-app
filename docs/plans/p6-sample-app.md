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
      strings translated, so the whole repo is English. Commit `8a344cc`, pushed to
      `origin/main`.

- [x] 2026-08-19 — **Real `IMPORT` layout, replacing the invented flat one.** The app wrote
      `IMPORT/A1_name.wav` over 4 banks; the device reads
      `IMPORT/BANK_A…BANK_H/PAD_1…PAD_6/one.WAV`. Now: 8 banks, one folder per pad, the
      pad folder emptied of its `WAV`/`PRM` before writing, read-back walking the same
      tree, and **Erase IMPORT folder** clearing pad files (plus any flat leftovers from
      the previous version) while keeping the folder tree. Verified against a mock
      directory tree — nested write, replacement of a pre-existing `P6_A-1.WAV`+`.PRM`,
      read-back landing on the right bank and pad, erase leaving the skeleton — and in the
      browser: 8 banks in the selector, no console error. Writing to a real key is still
      untested, the directory picker needs a human. Commit `7bcd6e9`, pushed to
      `origin/main`.

- [x] 2026-08-19 — Import steps from the owner's manual translated into English, behind a
      **?** next to **Banks → key** (hover, and keyboard focus via `:focus-within`).
      Verified in the browser: the bubble becomes visible on focus, sits above the footer,
      340 px wide, `surface-raised` on `rule-strong`. Commit `7bcd6e9`, pushed to
      `origin/main`.

- [x] 2026-08-19 — Bank navigation moved from a dropdown to `‹ A ›` arrows, at Antoine's
      request: 8 banks make a select a list to hunt through, two arrows make it one click.
      They wrap around, so H → A and A → H. Verified in the browser: forward through the
      eight letters and back, wrap in both directions, no console error.

- [x] 2026-08-19 — **Key → banks** replaced by **Save preset**: a ZIP of the complete
      `IMPORT` tree (`js/fs/zip.js` writes the archive by hand, stored entries, no
      dependency; `js/fs/preset.js` lays out the tree and names the file
      `p6-preset-<date>_<time>.zip`). Restoring an earlier preset is unzipping it onto the
      key. Read-back is gone with the button, so `usb.readPads` and `state.replaceAllBanks`
      were deleted rather than left dead. Also: the empty destination now reads
      `no P6 selected`, and the help bubble's steps 3 and 4 became "eject the drive" and
      "press [KYBD]" — the app does the copying, so the manual's "open the drive / copy the
      files" steps were noise. Verified: a generated archive passes `unzip -t`, lists the 56
      folders and the samples with the right sizes and extracts to the right tree; in the
      browser, the footer shows **Save preset**, an empty set toasts `No sample loaded`, no
      console error.

- [x] 2026-08-19 — **Load preset**, the other direction, at Antoine's request: `zip.js`
      gained a reader (central directory walk, stored and deflated entries via
      `DecompressionStream`), `preset.js` a `readPreset` that places pads by their
      `BANK_x/PAD_n` path — whatever precedes it — and skips `__MACOSX` junk, so a ZIP made
      by the Finder from a key loads as well as ours. `state.replaceAllBanks`, deleted an
      hour earlier with the old read-back, is back and is exactly the right function for it.
      Verified: round trip of our own archive; a deflated archive from the `zip` CLI with
      `__MACOSX` entries loads the two real samples and ignores the junk; a non-ZIP reports
      "This file is not a ZIP archive"; and in the page itself, encode → save → load →
      decode → banks puts a 440 Hz tone on A-1 and C-5 with the waveform and the sizes
      right.

## Decisions

- Model: 8 banks × 6 pads, one WAV per pad, matching the device. It started at 4 banks from
  a screenshot; the factory pack settled it.
- The pad's position is carried by the folder, so the written file name is free. We keep the
  sample name rather than the device's `P6_A-1` convention: the P-6 takes the pad name from
  the file name, so `Kick-01.WAV` shows up as `Kick-01` instead of a coordinate.
- Uppercase `.WAV`, like every file the device writes, rather than betting the firmware
  matches extensions case-insensitively.
- Writing a pad deletes the `WAV` and the `PRM` already in its folder. The `PRM` carries the
  frame count of the sample it shipped with, so leaving it beside a different sample would
  describe something that is no longer there.
- **Erase IMPORT folder** removes files, never folders: the `BANK_x/PAD_n` tree is created
  by the device.
- A preset is a ZIP of the `IMPORT` tree rather than a project format of our own: the P-6
  restores it with no tool but the Finder, and it stays readable in ten years.
- Loading matches pads on the `BANK_x/PAD_n` path only, ignoring any prefix: an archive
  zipped from the key root, from the `IMPORT` folder, or written by us all load the same.
- The preset ZIP carries the 48 empty pad folders too, so unzipping it yields a whole
  `IMPORT` folder instead of a partial one.
- ZIP written by hand (`js/fs/zip.js`, stored entries, CRC-32 table) to keep the
  no-dependency rule. WAV audio does not compress meaningfully anyway.
- The file picker is opened *before* the archive is built: the awaits of rendering and
  zipping would consume the user activation `showSaveFilePicker` requires.
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
- Everything is written in English: app, README, this plan, comments. The import steps in
  the **?** bubble are our translation of the French owner's manual.
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

## P-6 disk format

Sources: Roland owner's manual [import](https://static.roland.com/manuals/p-6/en-US/124651019124688651.html)
and [export](https://static.roland.com/manuals/p-6/en-US/124639499124688139.html) pages, the
support article [restoring the factory sample data](https://support.roland.com/hc/en-us/articles/29080746958619-P-6-How-to-Restore-Factory-Sample-Data-and-Patterns-After-a-Factory-Reset),
and above all the factory sample pack Antoine unpacked to `~/Music/p6/factory_samples`,
which is the real thing: 8 banks × 6 pads, a `WAV` and a `PRM` per pad, plus 16 pattern
`PRM` files.

- 8 banks A–H of 6 pads. The bank buttons are `[A/E]`–`[D/H]`: one press selects A–D, two
  presses E–H.
- Layout: `IMPORT/BANK_x/PAD_n/`, one WAV per pad folder. The owner's manual only names the
  `PAD_1`–`PAD_6` folders; the `BANK_A`–`BANK_H` level is what the device actually shows.
- **All 8 banks import in one pass** (Antoine, from the device). Roland's factory-restore
  article splits the copy in two, A–D then E–H, but that is not a constraint of the import
  itself. It is the *export* that goes one bank at a time — and we do not implement export.
- Accepted on import: up to 96 kHz, 8/16/24/32-bit linear. Anything beyond the pad size is
  truncated by the device itself.
- The factory WAVs are 44.1 kHz 16-bit, mono or stereo, canonical 44-byte header, with a
  trailing 88-byte `PAD ` chunk (`Roland  P-6`, then the pad settings in binary). We do not
  write that chunk; the device does not need it to import.

### `PRM` — the pad settings, and they are plain text

`P6_A-1.PRM` is 825 bytes of `KEY\t= VALUE` lines, LF endings — not a binary blob. 62 named
fields per pad:

- position and playback: `PHRASE` (0–47, the flat pad index: A-1 = 0, H-6 = 47), `GATE`,
  `LOOP`, `REVERSE`, `START_POS`, `MONO_POLY`, `MUTE_GROUP`, `CHOP` (1, 2, 4, 8, 16, 32).
- length: `SIZE` and `LOOP_SIZE`, **in frames**, matching the WAV data chunk divided by its
  block align exactly. The largest value in the factory pack is 262144 = 512 KiB of 16-bit
  mono, which independently confirms `MAX_PAD_BYTES`.
- tuning: `C.TUNE`, `F.TUNE`, `DETUNE`.
- envelopes and filter: `PENV_*`, `TENV_*`, `TVF_*`, `TVA_SW`, `ENV_MODE`.
- output: `LEVEL`, `PAN`, `PAN_MODE`, `OUTPUT_SEL`, `SEND_DELAY`, `SEND_REVERB`.
- granular: `TM_STR_MODE`, `TM_STR_WINDOW`, `TM_STR_SPEED`; `LO-FI_SW`, `LO-FI`.
- `PRM1`–`PRM16`, all zero across the 48 factory pads.

They are optional on import — Roland only recommends copying them back when re-importing
samples that came out of a P-6. Being plain text, they are also *writable*: emitting a
`PRM` next to a sample would let the app preset chop, loop, reverse, level, pitch or filter
instead of only shipping audio. Not done, and it needs testing on the device first.

`PRM` is just Roland's parameter container here: the patterns use the same extension
(`P6_PTN1-01.PRM`–`P6_PTN4-16.PRM`, restored through a separate `RESTORE` folder) with
unrelated contents.

### `info.txt`

An export artifact, undocumented, absent from the factory pack. Antoine's file decodes
exactly: 48 lines `<BANK>-<PAD>:\t<name>`, LF endings, 618 bytes for the content pasted in
conversation — bank order A→H, pads 1→6. Names are capped at 15 characters
(`Mallet Atmosphe`, `Mallet Reverse `), an untouched pad reads `P6_<BANK>-<PAD>`, and a pad
recorded on the device gets a `_REC` suffix (`P6_C-1_REC`). A pad that received an imported
file carries that file's name (`Kick-01`), which is what proves the device takes the pad
name from the WAV file name.

### Still unknown, only the device can answer

- What the device does with more than one WAV in a pad folder (we write exactly one, and
  delete what was there).
- Whether `info.txt` is read on import — probably not — and whether a hand-written one
  could set the pad names.
- Whether a `PRM` written from scratch is accepted.
- Whether the device cares about the `.WAV` case. We write uppercase, like the device does.

## To verify

- ~~The `A1_` naming format assumes the P-6 imports in alphabetical order.~~ Moot: the
  device addresses pads by folder, not by file name.

## Possible next steps

- Write a `PRM` alongside each sample to preset the pad (chop, loop, reverse, level,
  tuning) instead of shipping audio only. Needs a test on the device.
- Processing presets, duplicate hashing, manual slicing on the waveform, reordering pads
  by drag and drop.
