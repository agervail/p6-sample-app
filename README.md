# P-6 Sample Manager

USB key sample manager in the spirit of the Roland AIRA P-6: 8 banks of 6 pads, one WAV
per pad, per-pad settings (sample rate, mono, pitch, slicing), then sequential writing
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
  will be written: resampling, mono and pitch are applied before the preview, and
  whatever exceeds the pad memory is cut off.
- The red hatched area on the waveform shows what will not fit.
- **Chop** cuts the sample into equal-length slices, either evenly or on detected
  transients, and replaces the sample with the result on the same pad.
- **Banks → key** writes every loaded pad, one file after another, bank by bank.
- The **?** next to **Banks → key** recalls what to do on the device itself.
- **Save preset** saves the whole thing as a ZIP holding the complete `IMPORT` tree, so an
  earlier preset goes back on the key by unzipping it there.
- **Load preset** reads such a ZIP back into the 8 banks. It takes the archive this app
  writes as well as one zipped from a key by the Finder — pads are placed by their
  `BANK_x/PAD_n` path, whatever wraps it.
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
- Export as 16-bit PCM WAV, with a hand-written header.
- A preset is a hand-written ZIP (stored, no compression — WAV barely compresses) carrying
  the full `IMPORT/BANK_A…BANK_H/PAD_1…PAD_6/` tree, empty pad folders included, so
  unzipping it on a key gives a complete import folder. Reading accepts deflated entries
  too, since a ZIP made by the Finder or `zip` is compressed.
- **Erase IMPORT folder** deletes the `WAV` and `PRM` files inside the pad folders and
  leaves the folder tree in place — the device creates that tree, so it is not ours to
  remove.

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
- Pitch is a speed change, not a time-stretch: length varies with pitch.
- The free space on the key is unknown to the browser; only the size to be written is
  shown.
- No volume ejection, that stays with the Finder. macOS clutter to clean up afterwards:
  `dot_clean -m /Volumes/MyKey`.
- Non-audio WAV chunks are lost on export, including the `PAD ` chunk the P-6 adds to the
  files it exports — a binary copy of the pad settings.
- Pad settings are not written: a `PRM` file could be generated (it is plain text), but
  nothing here edits envelopes, filter or level yet.
- Only the destination folder is remembered between sessions (IndexedDB); loaded samples
  are not — **Save preset** is what keeps a set of banks.
- The key handle is bound to the origin: moving from `localhost` to an `https://` domain
  requires a new authorization.
- Icons are generated by `tools/make-icons.py` (plain Python, no dependency).
