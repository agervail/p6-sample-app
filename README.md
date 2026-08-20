# P-6 Sample Manager

USB key sample manager in the spirit of the Roland AIRA P-6: 8 banks of 6 pads, one WAV
per pad, per-pad settings (sample rate, mono, slicing), then sequential writing
into the `IMPORT` folder of the key, in the layout the device expects.

A web page with no build step and no runtime dependency other than Google Fonts.
Everything happens in the browser; there is no application server.

## Run

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080> in **Chrome, Edge or Brave**.

The File System Access API only exists on Chromium and requires a secure origin: over
`file://` the directory picker is blocked and IndexedDB unusable. The page does not work
in a cross-origin iframe either. Opened over `file://`, it shows a notice with the
command to run instead of a blank page.

## Install as an application

The page is a PWA: served from `localhost` or `https://`, Chrome offers to install it
(icon in the address bar, or `⋮ → Cast, save and share → Install`). It then lands in
`~/Applications/Chrome Apps` and opens in its own window.

The service worker caches everything the page loads — modules, styles, Google Fonts —
and serves it from that cache afterwards: once visited, the app starts with the server
stopped and the network off.

The strategy is *stale-while-revalidate*: the cache answers immediately, the fresh
version is fetched in the background and picked up on the next load. **A code change
therefore shows up on the second reload**, not the first.

## Usage

- **Load** opens the file picker; dropping a file onto a pad works too.
- Clicking a waveform starts playback from that point. What you hear is exactly what
  will be written: resampling and mono are applied before the preview, and
  whatever exceeds the pad memory is cut off.
- The red hatched area on the waveform shows what will not fit.
- Dragging the handles at both ends of the large waveform trims the sample: the dimmed
  parts are neither previewed nor written, and the size and length update as you drag.
  **Reset trim** puts the whole sample back.
- **Chop** cuts the sample into equal-length slices, either evenly or on detected
  transients, and replaces the sample with the result on the same pad.
- **Build kit** goes the other way: several WAV files become one pad of equal-length
  sections, so the device’s CHOP lands exactly on their boundaries. Drop the samples in,
  order them, and the section count is rounded up to a chop value the P-6 offers
  (1, 2, 4, 8, 16, 32), the spare sections staying silent. A sample shorter than a section
  is padded with silence, a longer one is cut, and everything is resampled and folded to
  the kit’s own rate and layout. **Max section** shows live, for the current section count
  and mono/stereo layout, the longest section each sample rate can hold — the selected rate
  is highlighted, and any rate too short for the current section length is flagged, so
  picking a length and a rate is reading a row rather than trial and error. The kit lands on
  the pad you choose, with its slice count already set.
- **Banks → P6** writes every loaded pad, one file after another, bank by bank.
- The **?** next to **Banks → P6** recalls what to do on the device itself.
- **Save preset** saves the whole thing as a ZIP holding the complete `IMPORT` tree, `PRM`
  files included, so an earlier preset goes back on the key by unzipping it there.
- **Load preset** reads such a ZIP back into the 8 banks. It takes the archive this app
  writes as well as one zipped from a key by the Finder — pads are placed by their
  `BANK_x/PAD_n` path, whatever wraps it. A pad whose folder holds a `PRM` under the same
  base name comes back with its slice count, so a chopped pad keeps its markers; a `PRM`
  left over from a different sample is ignored rather than believed.
- ⌘Z / ⇧⌘Z undo and redo pad changes.

## Writing conventions

- One folder per pad: `IMPORT/BANK_A/PAD_1/name.WAV`, which is the layout the P-6 reads.
  The folder carries the position, so the file name is free — it is the pad name cleaned
  up (`NFD`, diacritics stripped, `[^A-Za-z0-9._-]` replaced by `_`), and the device
  displays the first 15 characters of it.
- Writing is strictly sequential, by bank then by pad, and only loaded pads are written.
- Writing a pad first deletes the `WAV` and `PRM` already in its folder: the `PRM` holds
  the frame count of the sample it came with, so keeping it next to a different sample
  would describe something that is no longer there.
- A **chopped** pad then gets a fresh `PRM` beside its `WAV`, same base name, so the pad
  arrives on the device already set to the right number of slices. It is the device's own
  plain-text format — 62 `KEY\t= VALUE` lines, LF endings — with `CHOP` at the section
  count, `SIZE`/`LOOP_SIZE` at the frame count of the `WAV` written next to it, `PHRASE` at
  the flat pad index (A-1 = 0 … H-6 = 47), and the other 58 fields at the values an
  untouched factory pad carries. Unchopped pads get no `PRM`: the device's defaults are
  already what we would write.
- A chop the device cannot express — transient placement can return a count like 3, and the
  P-6 chops into 1, 2, 4, 8, 16 or 32 — gets no `PRM`, and the Memory panel says so rather
  than shipping a file that describes the wrong grid.
- Export as 16-bit PCM WAV, with a hand-written header.
- A preset is a hand-written ZIP (stored, no compression — WAV barely compresses) carrying
  the full `IMPORT/BANK_A…BANK_H/PAD_1…PAD_6/` tree, empty pad folders included, so
  unzipping it on a key gives a complete import folder. Reading accepts deflated entries
  too, since a ZIP made by the Finder or `zip` is compressed.

## P-6 constraints

8 banks A–H of 6 pads, so 48 pads. A sample gets 512 KiB, which in mono means:

| Sample rate | Maximum length |
|---|---|
| 44.1 kHz | 5.94 s |
| 22.05 kHz | 11.89 s |
| 14.7 kHz | 17.83 s |
| 11.025 kHz | 23.78 s |

In stereo, half of that. The sample rates are integer divisions of 44.1 kHz (÷1, ÷2, ÷3,
÷4). The Roland documentation truncates these lengths to one decimal (5.9 s, 11.8 s…);
this app shows the real capacity.

`MAX_PAD_BYTES`, `SAMPLE_RATES` and the target folder name `IMPORT_FOLDER_NAME` live in
`js/constants.js`.

## Accepted limitations

- WAV only: `decodeAudioData` is enough, no ffmpeg.wasm.
- The free space on the key is unknown to the browser; only the size to be written is
  shown.
- No volume ejection, that stays with the Finder. macOS clutter to clean up afterwards:
  `dot_clean -m /Volumes/MyKey`.
- Non-audio WAV chunks are lost on export, including the `PAD ` chunk the P-6 adds to the
  files it exports — a binary copy of the pad settings.
- Only the chop is written to a `PRM`. Envelopes, filter, level, tuning, loop and reverse
  go out at the factory defaults because nothing here edits them yet — with one deliberate
  exception, `SEND_REVERB`, written at 0 rather than pad A-1's 30 so an imported sample
  gets no reverb it did not ask for.
- Whether the device reads a `PRM` written from scratch is untested — only the hardware can
  answer. The file is byte-compatible with the factory ones, and the pad still imports from
  its `WAV` alone if the `PRM` is ignored.
- Only the destination folder is remembered between sessions (IndexedDB); loaded samples
  are not — **Save preset** is what keeps a set of banks.
- The key handle is bound to the origin: moving from `localhost` to an `https://` domain
  requires a new authorization.
- Icons are generated by `tools/make-icons.py` (plain Python, no dependency).
