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
      eight letters and back, wrap in both directions, no console error. Commit `00dc561`,
      pushed to `origin/main`.

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
      console error. Commit `00dc561`, pushed to `origin/main`.

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
      right. Commit `00dc561`, pushed to `origin/main`.

- [x] 2026-08-19 — **Trim with a start and an end cursor**, at Antoine's request. The pad
      carries `trimStart`/`trimEnd` as ratios of its source; `audio/process.js` cuts the
      source to that window before folding, resampling and truncating, so the preview, the
      figures, the truncation warning, the chop, the preset and the write all see the
      trimmed sample and nothing else. `ui/trim.js` drags the two handles on the large
      waveform (grab zone 9 px, minimum window 0.5 %), `ui/waveform.js` dims what is outside
      and draws the grips, and **Reset trim** next to the length restores the full sample.
      Verified in the browser on a 2 s tone: dragging both handles takes 2.00 s / 172 KB to
      0.96 s / 83 KB, `renderPad` returns exactly the trimmed 42414 frames, one drag is one
      undo step, clicking inside the window starts playback at that point (0.43 measured for
      0.428 expected) and the playhead is drawn back at the same place, chopping a trimmed
      pad chops the trimmed audio, **Reset trim** restores 2.00 s and disables itself. Commit
      `4c9c38a`, pushed to `origin/main`.

- [x] 2026-08-19 — **Build kit**, at Antoine's request: combine several WAVs into one pad of
      equal-length sections so the whole thing can be chopped. `js/audio/combine.js` lays each
      source into its own section — channel-matched (folded to mono, or a mono source
      duplicated across a stereo kit), resampled to the kit rate, padded with silence when
      shorter than the section and cut when longer — and the section count is rounded **up to
      a value the device's CHOP offers** (`P6_CHOP_VALUES` = 1, 2, 4, 8, 16, 32), the spare
      sections staying silent. That rounding is the point of the feature: 3 samples in a
      3-section file leave the device's chop grid off every boundary. `js/ui/kit.js` drives the
      dialog: drop or pick the samples, reorder and remove them, a section length in ms
      (defaulting to the longest sample, restored by **Longest sample**), rate, mono, and the
      destination pad. The kit lands through `store.editPad` with `sliceCount`, `sampleRate`
      and `mono` set, so `renderPad` is a passthrough and the written file is exactly what was
      assembled.
      Verified headless (35 assertions on the assembly: section boundaries, silence padding,
      truncation, mono fold, mono→stereo duplication, byte budget, the 32-source ceiling) and
      in the browser: 3 samples of 0.30 / 0.12 / 0.05 s at three different rates become 4
      sections of 0.30 s, 207 KB, the 4th silent; reorder and remove renumber and resize; a 4 s
      section turns the size red, disables **Build kit** and reads back the 2.97 s a section
      can hold; 22050 Hz halves it and re-enables the button; the built pad shows 4 equal
      sections with the slice markers on the boundaries, plays for its full 1.20 s and is one
      undo step; a 32-sample kit builds, a 33rd is refused; a text file is refused inside the
      dialog; bank **Force mono** locks the kit to mono. Writing such a kit to a real key and
      chopping it on the device is untested — that needs the hardware. Commit `897fbe5`, pushed
      to `origin/main`.

- [x] 2026-08-19 — **Live section ceilings in the kit dialog**, at Antoine's request: the
      512 KiB budget divided by the section count told the user nothing while it only appeared
      inside the overflow error. A **Max section** row now shows, for the current section count
      and channel layout, the longest section each of the four sample rates can hold — the
      selected rate highlighted, any rate too short for the current section length flagged —
      so choosing a section length and a rate is reading a row instead of guessing and waiting
      for the error. `maxSectionSeconds({ sections, channelCount, sampleRate })` is exported
      from `audio/combine.js` for it, and the `maxSliceSeconds` field it replaces is gone from
      `kitMetrics` rather than left unused. The overflow message no longer suggests a longer
      rate — it did so even when every rate was too short — and points at the row instead.
      Verified headless (4 assertions: the ceiling halves in stereo exactly as it does when the
      section count doubles, doubles at half the rate, and a single section comes out at the
      5.94 s the README documents for a whole pad at 44.1 kHz mono) and in the browser: 4
      samples mono at 44100 read 1486 / 2972 / 4458 / 5944 ms, adding a 5th moves the kit to 8
      sections and every ceiling halves, dropping a stereo sample in halves them again,
      selecting 11025 Hz moves the highlight, a 2000 ms section flags 44100 and 22050 only, a
      900 ms section over 8 mono sections flags 44100 alone and following the row to 22050
      takes 620 KB to 310 KB and re-enables **Build kit**. At 375 px the label stacks and the
      chips wrap inside the dialog. Commit `897fbe5`, pushed to `origin/main`.

- [x] 2026-08-19 — **A `PRM` is written next to a chopped sample**, at Antoine's request, so
      the pad arrives on the device already set to the right number of slices instead of
      asking the user to turn CHOP by hand. The field table in `js/fs/padSettings.js` was
      *generated from* `~/Music/p6/factory_samples/BANK_A/PAD_1/P6_A-1.PRM` rather than
      transcribed: 62 fields, the device's order, `KEY\t= VALUE`, LF, trailing newline. An
      analysis of all 48 factory pads settled the defaults — pad A-1 turns out to hold the
      modal value of every single field, which is what makes it the neutral template — and
      four fields are written per pad: `PHRASE` (flat pad index), `SIZE` and `LOOP_SIZE` (the
      frame count of the WAV written beside it) and `CHOP`. `SEND_REVERB` is the one
      deliberate departure from A-1, written at 0 (the pack's modal value, 31/48) rather than
      A-1's 30, so an imported sample gets no reverb it did not ask for. `usb.writePads` and
      `preset.buildPreset` both emit it, so a preset carries the chop too.
      Verified: 28 headless assertions against the factory files — field order identical, LF
      only, one trailing newline, and for the real chopped pad H-3 the generated file
      reproduces the device's own `PHRASE = 44`, `SIZE = 124518` and `CHOP = 8`, with every
      remaining field equal to A-1's except `SEND_REVERB`; `PHRASE` checked against all 48
      factory pads. The preset path builds an archive that passes `unzip -t` and extracts
      `IMPORT/BANK_C/PAD_5/kit8_kick.PRM` beside its `WAV` with `PHRASE = 16`. `writePads`,
      driven through a mock directory handle, writes both files for a chopped pad, only the
      `WAV` for a plain one, and drops the stale `P6_A-1.WAV`+`.PRM` pair first. In the page,
      a transient chop that returned 3 slices raises `PAD 1 — 3 sections, but the P-6 chops
      into 1, 2, 4, 8, 16, 32, so no .PRM is written` in the Memory panel, and re-chopping
      into 4 clears it. Clicking **Banks → key** and **Save preset** through to a real disk
      still needs a human for the picker, and whether the device accepts a hand-written `PRM`
      still needs the hardware. Commit `df85eb6`, pushed to `origin/main`.

- [x] 2026-08-19 — **A preset brings its chop back**, at Antoine's request, closing the gap the
      `PRM` writer opened: the archive carried the chop but `readPreset` matched `.WAV` entries
      only, so a chopped pad came back without its markers. `readPreset` now matches both
      extensions in one pass and pairs each sample with the `PRM` beside it by **folder plus
      base name**, so a `PRM` left over from another sample — `P6_A-1.PRM` next to `Kick.WAV` —
      is ignored rather than believed. `padSettings.readChop` parses it back, guarded by the
      same two predicates the writer uses, so we read exactly what we would write: `CHOP = 1`
      and a count the device cannot express both come back as no chop. The count travels
      `readPreset` → `decodeWavFile` → `replaceAllBanks`, which now keeps `sliceCount`.
      Verified: 20 headless assertions — a three-pad round trip keeps 8 and 4 sections while
      the unchopped pad stays at 0, the `PRM` listed *before* its `WAV` pairs just as well, an
      archive zipped from the key root with `__MACOSX` junk pairs through its prefix, a stale
      `PRM` under another base name is ignored, `CHOP` 1 / 3 / 64 all read as no chop, a
      `PRM16` line does not get mistaken for `CHOP`, and a preset written before the `PRM`
      existed still loads. In the page, driving the app's own store through the real modules,
      an archive holding `kit4_kick.WAV` + `.PRM` on A-2 and a plain sample on A-4 restores
      `sliceCount` 4 and 0, and the large waveform draws its three markers at columns 248, 496
      and 744 of 992 — the exact quarters. **Load preset** through its picker still needs a
      human. Commit `fa364b1`, pushed to `origin/main`.

- [x] 2026-08-20 — **Per-pad pitch and Erase IMPORT folder removed**, at Antoine's request
      ("un peu de ménage"). Pitch went with `pitchRatio`, `CENTS_PER_OCTAVE`,
      `PITCH_STEP_CENTS`, `PITCH_LIMIT_CENTS`, the pad's `pitchCents` field, the stepper row
      in the pad template and the `.stepper` CSS: `padMetrics` now takes the length straight
      from the trim, and `renderPad` resamples to `pad.sampleRate` instead of a pitch-shifted
      render rate. Erase went with its footer button, `wipeImportFolder`, and the `usb.js`
      pieces only it used — `listPadFiles`, `removeFiles`, `existingPadFolders`,
      `existingDirectory`; `dropPreviousSample` still clears a pad folder before writing, so
      overwriting a key is unaffected. Verified in the browser (twice-reloaded past the
      service worker): the grid builds its 6 pads, no `[data-pitch]` node and no
      `#wipe-import` survive, the footer reads Banks → key / Build kit / Save preset / Load
      preset / Clear bank, and the console is clean. Commit `bb13281`, pushed to
      `origin/main`.

- [x] 2026-08-20 — **Visual direction switched to Antoine's mockup**: a monospace terminal
      look, yellow `#F0E31C` as the single signal color, near-black surfaces, 2px corners, no
      shadows outside dialogs and the toast. JetBrains Mono is now the only face (Inter
      dropped from the Google Fonts request), so the `mono` class disappeared from the markup
      along with its rule. Selects became underlined rather than boxed, checkboxes are custom
      squares, and the topbar rule plus the Memory panel rule are the yellow lines that
      structure the page. Yellow marks the *useful* action rather than a fixed button rank: an
      empty pad's **Load**, and the selected pad's play and **Chop**. `btn--accent` and
      `btn--primary` collapsed into `btn--primary` alone, so **Build kit** and **Chop** in the
      grid are plain buttons and only **Banks → key** and the dialog confirmations carry the
      accent. Structural additions the mockup called for: an `ACTIVE` tag on the selected pad,
      a `drop .wav` overlay on an empty pad's waveform (hence the `pad__stage` wrapper), and
      an 8-segment strip beside the Memory figures marking which banks hold audio
      (`buildBankStrip` / `renderStorage`, which now computes the per-bank bytes once instead
      of twice). Dropped: the `P-6` footer wordmark and the visible `Memory` heading, neither
      of which the mockup has — the heading stayed as a visually-hidden `h2` so the document
      outline survives. An empty pad hides its rate row and its play/clear/chop buttons with
      `visibility: hidden`, not `display: none`, so a loaded and an empty pad keep the same
      height. Verified in the browser at 1220, 760 and 420 px, with three samples pushed
      through the real modules: the selected pad's yellow bar and accents, the strip filling
      for bank A, the chop and kit dialogs, the green stop state during playback, the custom
      checkbox when Force mono is on, and no horizontal overflow at 420 px — which needed the
      **?** bubble pinned to the viewport below 560 px, a pre-existing overflow the fixed
      360 px width had always caused. Two corrections from Antoine's review: **Clear bank**
      keeps the red outline every other destructive control carries — the footer override that
      erased it is gone — and the frame no longer sits flush against the top of the viewport.
      Commit `bb13281`, pushed to `origin/main`.

- [x] 2026-08-20 — **Pads became a table instead of a card grid**, from a second mockup
      Antoine sent: one row per pad under a `PAD / SAMPLE / WAVEFORM / RATE / MONO / ACTIONS`
      header, so the six pads read as a list and a bank fits above the fold. The mockup's
      `PITCH` column and `Erase IMPORT folder` button are the features dropped in `bb13281`
      and the four banks are a mockup simplification — Antoine said to ignore all three, so
      the layout is the whole change. The pad card's `pad__head` wrapper, its rate `row` and
      the `ACTIVE` tag are gone; the row is flat markup, and selection now reads from the
      yellow inset bar, the yellow pad number and a yellow tint fading rightwards.
      **The table is one grid, not one per row**: `.pads` owns the six tracks and both
      `.pads__head` and every `.pad` are `grid-template-columns: subgrid` spanning
      `1 / -1`. A row-per-grid version aligned the header with nothing — the `auto` actions
      track is 55 px of `ACTIONS` text in the header against ~200 px of buttons in a row, so
      the `fr` tracks resolved to different widths in each. Subgrid also lets a loaded row's
      button group size the shared actions column, which is why an empty row's **Load** lands
      exactly under a loaded row's **Chop**. Below 700 px the rows drop out of the subgrid
      into a three-line block (`grid-template-areas`) and the header hides. Commit
      `896b585`, pushed to `origin/main`.
      An empty pad no longer hides its controls with `visibility: hidden`: the rate select is
      `disabled` (chevron and underline removed, so it reads as the plain text the mockup
      shows), the mono box is hidden and the row's other buttons are `display: none`, which is
      what pushes **Load** to the right edge. `formatPadNumber` in `format.js` gives the row
      and the detail panel their zero-padded `01`; the `PAD n` in warnings and toasts stays
      unpadded, matching the `PAD_1` folder names. Restyled with the mockup: the detail panel
      is a bordered box with the yellow top rule (the rule left `.storage`), its head carries
      the selected pad's number, the memory figures are inline `label value` pairs at 18 px
      instead of stacked at 24, the bank letter is a filled yellow chip, `btn--primary` is
      filled yellow on black rather than outlined, and **Clear bank** is a red underlined
      link. Checkbox styling moved from `.check input` to `input[type="checkbox"]`, since the
      row's mono box has no label text to wrap it. Verified in the browser at 1280, 640 and
      375 px with three samples pushed through the real modules: header and rows line up in
      both the empty and loaded states, selection follows a click, the mono box toggles and
      turns yellow, the chop-kit dialog survives the inline figures, and no leftover selector
      matches the old card markup. Commit `896b585`, pushed to `origin/main`.

- [x] 2026-08-20 — **Bank navigation is eight letter buttons**, A→H, instead of the
      `‹ A ›` arrows: `buildBankNav` in `main.js` builds one `btn--bank` per `BANK_IDS`
      entry, `render` toggles `is-current` and `aria-pressed` on each, and `switchBank`
      stops playback before the switch — the guard on the already-current bank is what keeps
      a click on the lit letter from cutting a preview. `stepBank`, `#bank-previous`,
      `#bank-next` and `.bank-nav__id` are gone. The mockup's four banks were a
      simplification; the device has eight and so does the strip beside the memory figures,
      so eight letters keep the two readings of the same thing consistent. An idle letter is
      borderless dim text, the current one the filled yellow chip the old `bank-nav__id`
      was; the rules sit after `.btn:hover` in the stylesheet, which the outlined-on-hover
      and filled-when-current states both need to win. Two narrow-width fixes the eight
      buttons forced: `.topbar__group` wraps below 560 px (`Force mono` was pushed off
      screen), and in the stacked pad layout the actions group now spans the last two
      columns instead of sizing the last one alone — a 200 px button group was squeezing the
      sample name to `kit…`. Verified at 1164, 640 and 375 px: the letters switch bank and
      carry the sample state with them (bank D empty at 0 KB while all banks read 336 KB,
      bank A intact on the way back), hover leaves the current letter filled, and
      `scrollWidth` equals `clientWidth` at every width. Commit `896b585`, pushed to
      `origin/main`.

- [x] 2026-08-20 — **The memory readout is gone**: Antoine's call, a bank will not come
      close to the ceiling in practice. Out went the two figures (current bank / all banks),
      the 8-segment strip that marked which banks hold audio, `bankBytes`, `buildBankStrip`,
      and the `storage` section that wrapped them — the detail panel and the warning list now
      sit straight in `.app`, whose 20 px gap replaces the section's 18. `renderStorage`
      became `renderWarnings(bank)`, since the warnings were all it had left to do. What
      stays, because it is per-pad rather than a total and it is what the app acts on: the
      truncation and chop-value warnings, the hatched overflow zone on a waveform, and the
      detail head's `memory 5.94s`, which names the ceiling the trim is measured against.
      The occupancy signal the strip carried has no home now — the A→H letters would be the
      place for it, not rebuilt until Antoine asks. Two rules fell out with their last user:
      `.visually-hidden` (only the hidden `Memory` heading used it) and, moved rather than
      dropped, `.figure` / `.figure__value` now live beside `.kit__figures`, their one
      remaining caller. Verified in the browser: the app boots, the row of figures is gone
      with no gap left behind, a 12 s sample on pad 3 still raises its warning under the
      detail panel and hatches its overflow, and no selector matches the removed markup.
      Commit `896b585`, pushed to `origin/main`.

- [x] 2026-08-20 — **Load moved to the end of a row's action group**, so the button sits in
      the same column whether the pad is loaded or not: an empty row hides everything but
      Load, so as long as Load is last, the right-aligned group puts it at the same x in both
      states. It was first, which lined an empty row's Load up with a loaded row's Chop. Pure
      markup order in `pad-template`, no CSS or handler change — the order is now play,
      clear, Chop, Load. Measured in the browser across the six rows: `getBoundingClientRect`
      on every Load reads left 1058 / right 1117, three loaded rows and three empty. Commit
      `896b585`, pushed to `origin/main`.

- [x] 2026-08-20 — **A chop can be undone**: the dialog now offers *Back to the whole
      sample*. The chop was one-way because `chopPad` renders the pad — trim, rate, mono fold
      — then rearranges the slices into equal blocks and replaces `source`, so the original
      audio was simply dropped; only `Cmd+Z` came back, and only until the next 40 edits. A
      pad now carries `beforeChop`, and `state.js` owns the pair: `commitChop` stores
      `{name, source, peaks, sliceCount, trimStart, trimEnd}` under it before overwriting,
      `revertChop` puts them back and clears it. `commitChop` keeps the *first* snapshot
      (`pad.beforeChop ?? unchoppedState(pad)`), so chopping a chopped pad still returns to
      the untouched sample in one step rather than peeling off one chop at a time.
      `sampleRate` and `mono` stay out of the snapshot: the chop does not touch them, and a
      rate picked after the chop should survive the revert. The button is `hidden` rather
      than disabled when there is nothing to restore — computed in `openChopDialog`.
      **The snapshot has to die with the audio it describes**, or the revert restores an
      unrelated sample: `loadPad` and `applyKit` both clear it, and `resetPad` builds a fresh
      pad. A preset carries only the rendered WAV and the slice count, so a pad that comes
      back from a preset has no snapshot and is not offered the revert — the original never
      left the browser it was chopped in. Verified in the browser: chop 4 → chop 2 → revert
      lands on the original in one step, reopening the dialog then hides the button, dropping
      a new file on a chopped pad hides it too, and the detail waveform loses its slice
      dividers on the way back. Commit `008b398`, pushed to `origin/main`.

- [x] 2026-08-20 — Antoine asked whether the detail head's `memory 5.94s` is wrong once you
      pick mono or stereo. It is right, and it does move — the confusion is that a *mono
      file* reads 5.94s whether or not the box is ticked, because `outputChannelCount`
      already returns 1 for a single-channel source and there is nothing left to fold.
      Measured on a stereo file at 44100: box off → `memory 2.97s — 413 KB`, box on →
      `memory 5.94s — 207 KB`, half the bytes and twice the ceiling. It follows the rate too:
      the same pad at 22050 reads `memory 11.89s — 47 KB`. `padMetrics` derives it from
      `MAX_PAD_BYTES / (channelCount × 2) / pad.sampleRate`, so all three inputs are in it.
      No change made.

- [x] 2026-08-20 — **A pad says when its sample is already mono**, which the app had been
      getting wrong rather than merely leaving unsaid: `loadPad` never set `pad.mono`, so a
      one-channel file arrived with the box *unticked* while `outputChannelCount` returned 1
      from the source anyway — the pad rendered and was written mono behind an unticked
      control, and that is what made the `memory 5.94s` figure look wrong. The row's box now
      reads the output (`metrics.channelCount === 1`) instead of the `pad.mono` flag, and is
      disabled when the source has a single channel, since there is nothing left to fold. A
      preset-loaded pad already behaved: `replaceAllBanks` sets `mono` from the channel count,
      which is why the two paths disagreed.
      A ticked-and-greyed box alone is ambiguous — force mono renders exactly the same — so
      the detail head names the layout in words between the length and the memory:
      `mono file` when the source has one channel, `folded to mono` when a stereo source is
      being summed, `stereo` otherwise. Verified in the browser on a mono and a stereo file:
      mono file → ticked, disabled, `1.10s — mono file — memory 5.94s — 95 KB`; stereo →
      unticked, live, `2.40s — stereo — memory 2.97s — 413 KB`; the same pad with the box
      ticked by hand → `folded to mono — memory 5.94s — 207 KB`, still live; and with Force
      mono on the bank → same text, now disabled. Commit `a0c170b`, pushed to `origin/main`.

- [x] 2026-08-20 — **A bank that holds samples is outlined in yellow**, putting back the
      signal the 8-segment strip carried before `896b585` removed it — on the A→H letters
      this time, where the bank is actually chosen, rather than in a separate bar. The three
      button states stay distinguishable: plain dim letter (empty), yellow outline (holds
      samples), filled yellow (current, whether or not it holds samples). `bankHasSamples`
      only asks `pads.some(isPadLoaded)` — the removed `bankBytes` summed `padMetrics` per
      pad for a figure nobody reads now, and `hasLoadedPad` was rewritten on top of the new
      helper rather than repeating the same `some`. The CSS rule needs the redundant-looking
      `.btn--bank.has-samples:hover` selector: `.btn--bank:hover:not(.is-current)` and
      `.btn--bank:hover` both score 0,3,0, so without a matching 0,3,0 selector the yellow
      outline vanished under the pointer. The letter's `title` now carries the same fact
      (`Bank A — holds samples`), since an outline alone says nothing to a screen reader; it
      moved from `buildBankNav` into `render`, being state rather than structure. Verified in
      the browser: loading into A and C outlines exactly those two while the current bank F
      stays filled, hovering A keeps it yellow, Clear bank drops A's outline, and undo brings
      it back. Commit `9885032`, pushed to `origin/main`.

- [x] 2026-08-20 — **The write button reads Banks → P6**, not Banks → key: the destination is
      the device, and the app says `P-6` everywhere else. Label only — the `id` stays
      `write-usb` and the destination is still the USB key the P-6 exposes. The two mentions
      in the README and the design rule in this plan that enumerates the yellow actions moved
      with it, so nothing documents a button that no longer exists; the mentions inside past
      entries stay as they are, being a record of what was verified at the time.

- [x] 2026-08-20 — **The playhead stays inside the non-hatched part** of a sample too long
      for the pad. `progress()` is a ratio of the *rendered* buffer, which `renderPad`
      truncates to `keptFrames`, but `drawWaveform` mapped it across the whole trim window —
      so on a 12 s sample with 5.94 s of room the line crossed the full width in the 5.94 s
      the audio lasted, running at twice the speed of the waveform under it.
      Fixing the display alone would have broken click-to-seek, which was *consistent with
      the bug*: a canvas click became a ratio of the drawn window and was then applied to the
      truncated buffer, so the compression cancelled out. Fix the playhead and a click at the
      hatch boundary would have started the line back at a quarter width. Both directions now
      share one number, `padMetrics().playedSpan` (`keptFrames / frames`, so 1 when nothing is
      cut): `drawWaveform` multiplies the playhead by it, `offsetWithinTrim` divides the click
      by it and clamps, so a click inside the hatching seeks to the end of what plays. It also
      replaces the `maxSeconds / seconds` expression that both drawing call sites were
      computing for `overflowStart` — the same ratio under another name, since the hatch
      starts exactly where playback stops.
      Verified by reading the drawn pixels back off a canvas: on an untruncated pad a playhead
      of 1 lands at 999/1000 px and 0.5 at 499, unchanged; truncated at 0.495 it lands on the
      hatch boundary (494) instead of the far right, and 0.5 at 246; with a 0.2–0.8 trim on
      top it still composes (499). Click round-trip on a real 12 s pad: clicking at 0.25 or at
      the boundary redraws the playhead exactly where the pointer was, and clicking inside the
      hatching clamps to the boundary.
      One trap worth naming: a stale `process.js` in the service worker cache while the new
      `pad.js` ran made `metrics.playedSpan` `undefined`, which `drawWaveform` treats as the
      `null` default — the overflow hatching silently vanished. It was the mixed module
      versions, not the change; a genuinely clean reload restored it.

- [x] 2026-08-20 — **Fixed a narrow-width overflow I shipped in `a0c170b`**: adding
      `mono file` / `folded to mono` to the detail head made that line long enough to push
      the page into horizontal scroll below 560 px — `.detail__head` is a flex row that never
      wrapped, 491 px of content in a 299 px box at 375 px. One line, `flex-wrap: wrap` in the
      560 px query; `.detail__length`'s `margin-left: auto` still pushes the figures right on
      their own line. It slipped through because the 375 px check for the row layout ran with
      empty pads, and an empty pad has no length text at all — the overflow only exists once a
      sample is loaded. Verified with a sample loaded at 375 px: `scrollWidth` back to 375.

- [x] 2026-08-20 — **A Norm button per row normalizes the sample to full scale**, over the
      whole sound and ignoring the trim, which is what makes it simple: the gain is baked into
      `pad.source` and `pad.peaks` is recomputed once, so the waveform cannot disagree with the
      audio and everything downstream — playback, chop, preset, the write to the key — inherits
      it with no render-time flag and no plumbing through the `forceMono` pattern. The
      alternative I had sketched (a bank flag applied inside `renderPad`) would have needed the
      drawing to apply a matching, trim-dependent gain — the same two-bases-diverging trap as
      `playedSpan`. Baking it in sidesteps that entirely.
      `normalize.js` holds both halves: `normalizeSource` scans for the true peak and scales,
      `canNormalize` answers the button's disabled state off the existing peak buckets (cheap
      enough for the per-frame render during playback) with a 0.999 floor, because
      `peak × (1 / peak)` does not land on exactly 1 in floating point. Undo comes free — it is
      a plain `editPad`, so Cmd+Z restores the quiet source. `sliceCount` and `beforeChop` are
      untouched: normalizing a chopped pad keeps the chop, and reverting that chop afterwards
      returns the pre-chop *unnormalized* sample, which is the honest reading of "back to the
      whole sample". The frame count never changes, so nothing interacts with the 512 KB
      ceiling, and `toSixteenBit` already clamps, so no gain can corrupt the output.
      The fifth button forced the stacked layout below 700 px to give the actions their own
      grid row — with five buttons they collided with the rate select. Verified in the browser:
      25 % → `+12.1 dB`, 10 % → `+20.0 dB`, peak exactly 1.0 after, the button then disabled
      (idempotent), disabled on silence and on an empty pad, undo re-enables it and redo
      disables it again, chopping a normalized pad keeps it at full scale, and no horizontal
      overflow at 375 or 1280 px.
      Note for future browser checks: a scripted `dialog.close()` does not fire the `close`
      event in the preview pane when it throttles queued tasks — the chop looked broken until
      driven with real clicks. Not an app bug.

- [x] 2026-08-20 — **Norm targets -1 dBFS, not 0**, which is the usual delivery practice and
      costs 1 dB out of 16-bit's 96. `TARGET_PEAK = 10 ** (-1 / 20)` replaces the full-scale
      constant, and the button now works in *both* directions: a sample already at 0 dBFS is
      pulled **down** to -1 dB, since "normalize to -1 dB" means set the peak there, not only
      raise it. `canNormalize` therefore tests distance from the target rather than being below
      it.
      **The reason I first reached for does not hold here, and it is worth writing down so
      nobody re-derives it**: the textbook argument is that resampling a 0 dBFS signal
      overshoots and clips. Measured against this app's own resampler — square, click train,
      white noise and a sine, each normalized to exactly 1.0, resampled 44100 → 22050 and
      → 11025 — the peak ratio came back exactly 1.0000 in every case, and it stays 1.0000 at
      input levels of 0.5 and 0.8, so it is not the destination clamping hiding an overshoot.
      Chrome's `OfflineAudioContext` resampler simply does not overshoot on these signals.
      What does justify the headroom is device-side and unmeasurable without the hardware: the
      P-6's own filter, envelopes and reverb send run *after* the sample, and a pad at 0 dBFS
      through a resonant filter clips inside the device; several pads at 0 dBFS also sum on its
      mix bus. Verified: 25 % → `+11.0 dB`, 10 % → `+19.0 dB`, 0 dBFS → `-1.0 dB`, every one
      landing on a peak of exactly -1.000 dB and the button then disabled. End to end through
      `renderPad` + `encodeWav`, the written file peaks at 29205 of 32767 — -1.00 dBFS, no
      clipping — at 44100, 22050 and 11025 Hz alike.

- [x] 2026-08-20 — **The detail head shows the peak level**, so a greyed-out Norm explains
      itself. Antoine asked why the button is sometimes already disabled on opening a sample;
      measured by sweeping the level, the disabled window is **-1.005 to -0.995 dBFS**, 0.01 dB
      wide, plus pure silence. It is not a bug — it means the sample is already at the target —
      and it happens often because -1 dBFS is itself one of the standard normalization targets
      for sample packs, and because any pad this app normalized (or a preset saved afterwards)
      reads exactly -1 dB. Nothing said so on screen, hence the question, hence this readout:
      `1.00s — mono file — peak -12.0 dB — memory 5.94s — 86 KB`, or `silent` when the peak is
      zero, which is the other disabled case.
      `peakOf` moved from `normalize.js` to `peaks.js`, which owns the bucket structure it
      reads, and `normalize.js` now imports it — the display and the button's disabled state
      are answering the same question, so they must not compute it twice. `formatLevel` sits
      beside `formatDecibels` rather than reusing it: a *gain* wants its leading `+`, a *level*
      does not, or a full-scale sample would read `+0.0 dB`.
      The longer line needed two CSS fixes, not one. `flex-wrap: wrap` moved from the 560 px
      query onto the base `.detail__head` rule — a row that wraps only when it must is safer
      than guessing a breakpoint — but wrapping alone did nothing, because `.detail__length`
      still carried `white-space: nowrap`, so a 56-character run could not break at all. That
      `nowrap` dated from when the text was half as long. Verified with a sample loaded at 375,
      560, 700 and 1280 px: `scrollWidth` equals `clientWidth` at every one, and the line still
      sits on one row on a wide screen.

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
- Processing chosen: what the P-6 itself offers (sample rate, mono, chop). Normalization,
  silence trimming and fades from the initial brief are out of V1. Pitch was offered until
  2026-08-20 and removed with the rest of the cleanup.
- Revamp 2026-08-20, from Antoine's mockup: a monospace terminal look. JetBrains Mono
  everywhere, yellow #F0E31C as the *only* signal color, near-black surfaces, 2px corners,
  red kept for destructive actions. Amber is gone — with a yellow signal it was a
  near-duplicate, so chop and the warnings took the signal color. Earlier passes went from
  the Roland screenshot to a "classic" dark theme with a blue signal and Inter; both are
  superseded.
- The waveform stays blue against the yellow interface, as in the mockup: it separates the
  audio from the controls, and nothing about it is clickable-yellow.
- Yellow marks the next useful action rather than a fixed button rank — an empty pad's
  **Load**, the selected pad's play and **Chop**, **Banks → P6**, a dialog's confirmation —
  which is why there is one accent modifier (`btn--primary`) and not two.
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
- Playback renders exactly the file that will be written, truncation included.
- Trim is stored as ratios rather than frames, so it survives a rate change
  untouched, and the waveform peaks — computed once on the whole source — stay the right
  drawing for a trimmed pad.
- The trim handles live on the large waveform only: the pad waveforms show the window but
  are too small to grab an edge in. They edit the current pad, which is the one the panel
  already describes.
- A drag is one undo step, not one per pointer move: the first move records history
  (`editPad`), the rest amend it (`continuePadEdit`).
- Chopping resets the trim: chop rebuilds the pad source from the rendered — therefore
  trimmed — audio, so the window would otherwise cut a second time into a sample that
  already carries it.
- A kit's section count is rounded up to a `P6_CHOP_VALUES` entry rather than left at the
  number of samples: the device chops into 1, 2, 4, 8, 16 or 32, so a 3-section file has no
  setting that lands on its boundaries. The spare sections are silence.
- The kit refuses to build past the 512 KiB pad instead of letting the device truncate it,
  unlike a plain oversize sample which is only warned about: a cut kit loses whole sections
  and every boundary after the cut describes the wrong sample. The message gives the section
  length that does fit.
- The kit dialog reports its own errors on a line inside the dialog rather than through the
  toast: the toast is a fixed-position element, so it renders *under* a modal dialog's top
  layer and would never be seen.
- The kit dialog's body is not a `<form method="dialog">` like the chop dialog's: it holds a
  number input, and Enter inside a form would submit it — closing the dialog through the
  first submit button instead of editing a value.
- The destination pad is picked inside the dialog, in the current bank only, because
  `store.editPad` addresses the current bank. Building selects that pad, so the result is
  immediately previewable on the large waveform.
- The kit keeps its sources after a cancel and drops them after a successful build: cancel
  is usually "let me fix a parameter", a build is finished work.
- The kit's ceilings are shown for all four sample rates at once, not just the selected one:
  the question the number answers is "which rate should I take", and a single figure that
  changes when you switch rates cannot be compared against anything. They are shown in ms,
  the unit of the section input they constrain, while the figures below stay in seconds.
- Mono versus stereo is not a fifth column: the row already updates when the layout changes,
  and eight numbers would stop being readable at a glance.
- The `PRM` is written for chopped pads only. For an unchopped pad every field would be the
  factory default, which is what the device already applies — the file would carry no
  information and would only add a guess about a format we cannot test.
- The field table is generated from the factory `P6_A-1.PRM`, not typed in: 62 fields whose
  order the firmware may care about is exactly the kind of table a hand copy gets subtly
  wrong. Regenerate it from the pack rather than editing it in place.
- Pad A-1 is the template because the 48-pad analysis showed it holds the modal value of
  every field, not because it is first. `SEND_REVERB` is the single exception, taken at the
  pack's mode of 0 instead of A-1's 30.
- The `PRM` takes the **base name of the WAV** (`kit4_kick.PRM`), not the device's
  `P6_A-1.PRM` coordinate name. Both are guesses about how the firmware pairs the two files,
  but base-name matching also works if it simply reads the one `PRM` in the pad folder,
  whereas the coordinate name only works in that second case. The factory pack pairs
  matching base names in all 48 folders, which is consistent with either rule.
- `LOOP_SIZE` is written equal to `SIZE`, as every untouched factory pad has it, and as all
  nine chopped factory pads have it.
- A chop count the device cannot express (transient placement can return 3) produces no
  `PRM` and a warning in the Memory panel, rather than a `PRM` claiming a grid the device
  would not use. Rounding such a chop up to a legal count, the way the kit builder does,
  would change what **Chop** produces and was not asked for.
- `SIZE` need not divide by `CHOP`: factory pad A-5 is `CHOP = 32` over 255036 frames, and
  H-1 is `CHOP = 16` over 124518. The device handles the remainder itself, so our even chop
  and its floor division are well within what the format tolerates.
- Reading a preset pairs a `PRM` with its `WAV` by folder *and* base name, not by folder
  alone. One pad folder holds one sample, so the folder would be enough — but a `PRM` left
  beside a different sample is exactly the stale-file case the writer already guards against,
  and a wrong `CHOP` is worse than none.
- `readChop` refuses `CHOP = 1` and any count outside `P6_CHOP_VALUES`, which is the same pair
  of conditions the writer checks before emitting a `PRM` at all. The round trip is therefore
  symmetric by construction: we read back exactly what we would write.
- The rest of the `PRM` is still ignored on load. `LEVEL`, the envelopes and the filter have no
  representation in the app, and inventing pad state the interface cannot show or edit would
  be worse than dropping it. A preset stays an `IMPORT`-tree snapshot, not a project format.

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
samples that came out of a P-6. Being plain text, they are also *writable*, and **we now
write one beside a chopped sample** (`js/fs/padSettings.js`): `CHOP` at the section count,
`SIZE`/`LOOP_SIZE` at the frame count of the WAV, `PHRASE` at the flat pad index, and the
other 58 fields at the values an untouched factory pad carries. Loop, reverse, level, tuning
and the envelopes stay at those defaults because nothing in the app edits them yet.

Measured across the 48 factory pads, which is what the writer is built on:

- Pad A-1 holds the **modal value of every one of the 62 fields**, so it is the neutral
  template. Only `SEND_REVERB` is written differently (0, the pack's mode at 31/48, against
  A-1's 30).
- `PHRASE` is the flat pad index, unique per pad, `BANK_x` order A→H: H-3 is 44 = 7 × 6 + 2.
- `SIZE` equals the WAV's frame count for 46 of the 48 pads. The two exceptions (D-5, E-5)
  hold *less* than the file, so `SIZE` describes the portion in use rather than the file
  length — we always write the whole file.
- `CHOP` takes 6 distinct values across the pack: 1, 2, 4, 8, 16, 32, confirming the list.
- File length is 822–834 bytes, the variation being digit counts, not fields.

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
- Whether a `PRM` written from scratch is accepted. Ours is byte-compatible with the factory
  files and reproduces a real chopped pad's fields exactly, but only the device can confirm
  it reads one it did not write. If it refuses, the pad still imports from its `WAV` alone.
- Whether the firmware pairs the `PRM` with the `WAV` by base name or just reads the single
  `PRM` in the pad folder. We write the WAV's base name, which satisfies both readings.
- Whether the device cares about the `.WAV` case. We write uppercase, like the device does.

## To verify

- ~~The `A1_` naming format assumes the P-6 imports in alphabetical order.~~ Moot: the
  device addresses pads by folder, not by file name.

## Possible next steps

- Extend the `PRM` beyond the chop — loop, reverse, level, tuning, filter — once the app has
  controls for them and the device has confirmed it reads a hand-written one.
- Processing presets, duplicate hashing, manual slicing on the waveform, reordering pads
  by drag and drop.
- Snapping the trim handles to zero crossings, and a fade in/out at the trim edges: a cut
  in the middle of a period clicks.
- Same inside a kit: a sample cut at its section boundary clicks, and a fade at the section
  edges would fix it.

