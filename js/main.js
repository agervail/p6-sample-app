import {
  BANK_IDS,
  CHOP_SLICE_COUNTS,
  IMPORT_FOLDER_NAME,
  P6_CHOP_VALUES,
  PADS_PER_BANK,
  PAD_SETTINGS_EXTENSION,
} from './constants.js';
import { formatBytes, formatPadNumber, formatSeconds } from './format.js';
import { chopPad } from './audio/chop.js';
import { decodeWavFile } from './audio/decode.js';
import { offsetWithinTrim, padMetrics, renderPad, trimWindow } from './audio/process.js';
import { play, playingPadIndex, progress, stop } from './audio/player.js';
import { encodeWav } from './audio/wav.js';
import { isChopValue, isChopped, padSettings } from './fs/padSettings.js';
import { buildPreset, presetFileName, readPreset } from './fs/preset.js';
import * as store from './state.js';
import * as usb from './fs/usb.js';
import { loadDestinationHandle, saveDestinationHandle } from './fs/handleStore.js';
import { createKitDialog } from './ui/kit.js';
import { createPadView } from './ui/pad.js';
import { createTrimControl } from './ui/trim.js';
import { drawWaveform, waveColor } from './ui/waveform.js';

const TOAST_DURATION_MS = 4000;
const FULL_TRIM = { start: 0, end: 1 };
const OFFLINE_EXTRA_ASSETS = ['manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
const WAV_PICKER_OPTIONS = {
  multiple: false,
  types: [{ description: 'WAV sample', accept: { 'audio/wav': ['.wav'] } }],
};
const PRESET_PICKER_OPTIONS = {
  types: [{ description: 'P-6 preset', accept: { 'application/zip': ['.zip'] } }],
};

const grid = document.getElementById('pad-grid');
const bankNav = document.getElementById('bank-nav');
const bankMonoInput = document.getElementById('bank-mono');
const destinationLabel = document.getElementById('destination-path');
const destinationButton = document.getElementById('choose-destination');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const warningList = document.getElementById('warnings');
const detailPad = document.getElementById('detail-pad');
const detailName = document.getElementById('detail-name');
const detailLength = document.getElementById('detail-length');
const detailCanvas = document.getElementById('detail-wave');
const resetTrimButton = document.getElementById('reset-trim');
const chopDialog = document.getElementById('chop-dialog');
const chopTarget = document.getElementById('chop-target');
const chopCount = document.getElementById('chop-count');
const chopRevertButton = document.getElementById('chop-revert');
const chopMode = document.getElementById('chop-mode');
const toast = document.getElementById('toast');

let destination = null;
let destinationNeedsPermission = false;
let playbackFrame = null;
let toastTimer = null;
let kitDialog = null;
const padViews = [];
const bankButtons = new Map();

function showToast(message, kind = 'info') {
  toast.textContent = message;
  toast.className = `toast toast--${kind}`;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, TOAST_DURATION_MS);
}

function reportFailure(error) {
  if (error.name === 'AbortError') return;
  showToast(error.message, 'error');
}

function destinationText() {
  if (!destination) return 'no P6 selected';
  return `${destination.name}/${IMPORT_FOLDER_NAME}`;
}

function renderDestination() {
  destinationLabel.textContent = destinationText();
  destinationLabel.classList.toggle('path--set', destination !== null && !destinationNeedsPermission);
  destinationButton.textContent = destinationNeedsPermission ? 'Re-authorize' : 'Choose…';
}

function channelLayout(pad, channelCount) {
  if (pad.source.channels.length === 1) return 'mono file';
  return channelCount === 1 ? 'folded to mono' : 'stereo';
}

function truncationWarnings(bank) {
  return bank.pads.flatMap((pad, padIndex) => {
    if (!store.isPadLoaded(pad)) return [];
    const metrics = padMetrics(pad, bank.forceMono);
    if (!metrics.isTruncated) return [];
    const layout = metrics.channelCount === 1 ? 'mono' : 'stereo';
    return [`PAD ${padIndex + 1} — ${formatSeconds(metrics.seconds)} but only ${formatSeconds(metrics.maxSeconds)} fit at ${pad.sampleRate} Hz ${layout}`];
  });
}

function chopWarnings(bank) {
  return bank.pads.flatMap((pad, padIndex) => {
    if (!store.isPadLoaded(pad) || !isChopped(pad.sliceCount) || isChopValue(pad.sliceCount)) return [];
    return [`PAD ${padIndex + 1} — ${pad.sliceCount} sections, but the P-6 chops into ${P6_CHOP_VALUES.join(', ')}, so no ${PAD_SETTINGS_EXTENSION} is written`];
  });
}

function renderWarnings(bank) {
  warningList.replaceChildren(...[...truncationWarnings(bank), ...chopWarnings(bank)].map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
}

function renderDetail(playhead) {
  const bank = store.currentBank();
  const pad = store.currentPad();
  const isLoaded = store.isPadLoaded(pad);
  const metrics = isLoaded ? padMetrics(pad, bank.forceMono) : null;

  detailPad.textContent = `Pad ${formatPadNumber(store.getState().selectedPadIndex)}`;
  detailName.textContent = isLoaded ? pad.name : 'No sample on this pad';
  detailLength.textContent = isLoaded
    ? `${formatSeconds(metrics.seconds)} — ${channelLayout(pad, metrics.channelCount)} — memory ${formatSeconds(metrics.maxSeconds)} — ${formatBytes(metrics.bytes)}`
    : '';

  resetTrimButton.disabled = !isLoaded || (pad.trimStart === FULL_TRIM.start && pad.trimEnd === FULL_TRIM.end);

  drawWaveform(detailCanvas, {
    peaks: pad.peaks,
    color: waveColor(isLoaded),
    trim: trimWindow(pad),
    overflowStart: metrics?.isTruncated ? metrics.maxSeconds / metrics.seconds : null,
    playhead: playingPadIndex() === store.getState().selectedPadIndex ? playhead : null,
    sliceCount: pad.sliceCount,
    trimGrips: isLoaded,
  });
}

function render(state) {
  const bank = store.currentBank();
  const playhead = progress();
  bankButtons.forEach((button, bankId) => {
    const isCurrent = bankId === state.currentBankId;
    button.classList.toggle('is-current', isCurrent);
    button.setAttribute('aria-pressed', String(isCurrent));
  });
  bankMonoInput.checked = bank.forceMono;
  undoButton.disabled = !store.canUndo();
  redoButton.disabled = !store.canRedo();

  padViews.forEach((view, padIndex) => view.update({
    pad: bank.pads[padIndex],
    forceMono: bank.forceMono,
    isSelected: padIndex === state.selectedPadIndex,
    isPlaying: playingPadIndex() === padIndex,
    playhead,
  }));

  renderWarnings(bank);
  renderDetail(playhead);
}

function refresh() {
  render(store.getState());
}

function stopPlayheadLoop() {
  cancelAnimationFrame(playbackFrame);
  playbackFrame = null;
}

function followPlayhead() {
  const padIndex = playingPadIndex();
  if (padIndex === null) {
    stopPlayheadLoop();
    refresh();
    return;
  }
  const bank = store.currentBank();
  const playhead = progress();
  padViews[padIndex].update({
    pad: bank.pads[padIndex],
    forceMono: bank.forceMono,
    isSelected: padIndex === store.getState().selectedPadIndex,
    isPlaying: true,
    playhead,
  });
  renderDetail(playhead);
  playbackFrame = requestAnimationFrame(followPlayhead);
}

async function togglePlayback(padIndex, sourceRatio) {
  const bank = store.currentBank();
  const pad = bank.pads[padIndex];
  if (!store.isPadLoaded(pad)) return;
  if (playingPadIndex() === padIndex && sourceRatio === null) {
    stop();
    stopPlayheadLoop();
    refresh();
    return;
  }
  const offsetRatio = sourceRatio === null ? 0 : offsetWithinTrim(sourceRatio, trimWindow(pad));
  try {
    const rendered = await renderPad(pad, bank.forceMono);
    await play(padIndex, rendered.channels, rendered.sampleRate, offsetRatio, refresh);
    stopPlayheadLoop();
    followPlayhead();
  } catch (error) {
    reportFailure(error);
  }
}

async function loadFileIntoPad(padIndex, file) {
  try {
    store.loadPad(padIndex, await decodeWavFile(file));
  } catch (error) {
    reportFailure(error);
  }
}

async function pickFileForPad(padIndex) {
  try {
    const [handle] = await window.showOpenFilePicker(WAV_PICKER_OPTIONS);
    await loadFileIntoPad(padIndex, await handle.getFile());
  } catch (error) {
    reportFailure(error);
  }
}

function openChopDialog(padIndex) {
  const pad = store.currentBank().pads[padIndex];
  if (!store.isPadLoaded(pad)) return;
  chopTarget.textContent = pad.name;
  chopRevertButton.hidden = pad.beforeChop === null;
  chopDialog.returnValue = 'cancel';
  chopDialog.dataset.padIndex = String(padIndex);
  chopDialog.showModal();
}

async function applyChop() {
  const padIndex = Number(chopDialog.dataset.padIndex);
  const bank = store.currentBank();
  try {
    const chopped = await chopPad(bank.pads[padIndex], bank.forceMono, {
      sliceCount: Number(chopCount.value),
      mode: chopMode.value,
    });
    store.commitChop(padIndex, chopped);
    showToast(`${chopped.sliceCount} slices on PAD ${padIndex + 1}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

function revertChop() {
  const padIndex = Number(chopDialog.dataset.padIndex);
  if (playingPadIndex() === padIndex) stop();
  store.revertChop(padIndex);
  showToast(`PAD ${padIndex + 1} is one whole sample again`, 'done');
}

function applyKit(padIndex, kit) {
  if (playingPadIndex() === padIndex) stop();
  store.editPad(padIndex, {
    name: kit.name,
    source: kit.source,
    peaks: kit.peaks,
    sliceCount: kit.sliceCount,
    sampleRate: kit.sampleRate,
    mono: kit.mono,
    trimStart: FULL_TRIM.start,
    trimEnd: FULL_TRIM.end,
    beforeChop: null,
  });
  store.selectPad(padIndex);
  showToast(`${kit.sliceCount} sections on PAD ${padIndex + 1} — set CHOP to ${kit.sliceCount}`, 'done');
}

async function ensureDestination() {
  if (!destination) {
    showToast('Select the destination USB key first', 'error');
    return null;
  }
  if (!(await usb.hasPermission(destination)) && !(await usb.requestPermission(destination))) {
    destinationNeedsPermission = true;
    renderDestination();
    showToast('Access to the USB key was denied', 'error');
    return null;
  }
  destinationNeedsPermission = false;
  renderDestination();
  return usb.importFolder(destination);
}

async function chooseDestination() {
  try {
    destination = await usb.pickDestination();
    destinationNeedsPermission = false;
    await saveDestinationHandle(destination);
    renderDestination();
  } catch (error) {
    reportFailure(error);
  }
}

function hasLoadedPad() {
  const { banks } = store.getState();
  return BANK_IDS.some((bankId) => banks[bankId].pads.some(store.isPadLoaded));
}

function settingsFor(pad, bankId, padIndex, frames) {
  if (!isChopped(pad.sliceCount) || !isChopValue(pad.sliceCount)) return null;
  return {
    fileName: usb.settingsFileName(pad.name),
    blob: padSettings({ bankId, padIndex, frames, sliceCount: pad.sliceCount }),
  };
}

async function collectLoadedPads() {
  const pads = [];
  for (const bankId of BANK_IDS) {
    const bank = store.getState().banks[bankId];
    for (const [padIndex, pad] of bank.pads.entries()) {
      if (!store.isPadLoaded(pad)) continue;
      const rendered = await renderPad(pad, bank.forceMono);
      pads.push({
        bankId,
        padIndex,
        fileName: usb.outputFileName(pad.name),
        blob: encodeWav(rendered.channels, rendered.sampleRate),
        settings: settingsFor(pad, bankId, padIndex, rendered.channels[0].length),
      });
    }
  }
  return pads;
}

function chopNote(chopped) {
  if (chopped === 0) return '';
  return `, ${chopped} with a ${PAD_SETTINGS_EXTENSION}`;
}

function settingsWritten(pads) {
  return pads.filter((pad) => pad.settings !== null).length;
}

async function writeToDestination() {
  const folder = await ensureDestination();
  if (!folder) return;
  try {
    showToast('Preparing the samples…');
    const pads = await collectLoadedPads();
    if (pads.length === 0) {
      showToast('No sample loaded', 'error');
      return;
    }
    await usb.writePads(folder, pads, (written, total, path) => {
      showToast(`${written}/${total} — ${path}`);
    });
    showToast(`${pads.length} pads written to ${destinationText()}${chopNote(settingsWritten(pads))}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

async function savePreset() {
  if (!hasLoadedPad()) {
    showToast('No sample loaded', 'error');
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: presetFileName(new Date()),
      ...PRESET_PICKER_OPTIONS,
    });
    showToast('Building the preset…');
    const pads = await collectLoadedPads();
    const writable = await handle.createWritable();
    await writable.write(await buildPreset(pads, new Date()));
    await writable.close();
    showToast(`${pads.length} pads saved to ${handle.name}${chopNote(settingsWritten(pads))}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

async function loadPreset() {
  try {
    const [handle] = await window.showOpenFilePicker({ multiple: false, ...PRESET_PICKER_OPTIONS });
    showToast('Reading the preset…');
    const pads = await readPreset(await handle.getFile());
    if (pads.length === 0) {
      showToast('No sample in this preset', 'error');
      return;
    }
    const loadedPadsByBank = Object.fromEntries(BANK_IDS.map((bankId) => [bankId, []]));
    for (const pad of pads) {
      const decoded = await decodeWavFile(pad.file);
      loadedPadsByBank[pad.bankId].push([pad.padIndex, { ...decoded, sliceCount: pad.sliceCount }]);
    }
    stop();
    store.replaceAllBanks(loadedPadsByBank);
    const chopped = pads.filter((pad) => pad.sliceCount > 0).length;
    showToast(`${pads.length} pads loaded from ${handle.name}${chopNote(chopped)}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

function openKitDialog() {
  const state = store.getState();
  kitDialog.open({
    padIndex: state.selectedPadIndex,
    bankId: state.currentBankId,
    forceMono: store.currentBank().forceMono,
  });
}

function buildPads() {
  const handlers = {
    onSelect: store.selectPad,
    onLoad: pickFileForPad,
    onPlay: togglePlayback,
    onClear: (padIndex) => {
      if (playingPadIndex() === padIndex) stop();
      store.resetPad(padIndex);
    },
    onChop: openChopDialog,
    onChange: store.editPad,
    onDrop: loadFileIntoPad,
  };
  for (let padIndex = 0; padIndex < PADS_PER_BANK; padIndex += 1) {
    const view = createPadView(padIndex, handlers);
    padViews.push(view);
    grid.append(view.element);
  }
}

function bindTrimControl() {
  const selectedPadIndex = () => store.getState().selectedPadIndex;
  const applyTrim = (edit) => (trim) => edit(selectedPadIndex(), { trimStart: trim.start, trimEnd: trim.end });

  resetTrimButton.addEventListener('click', () => applyTrim(store.editPad)(FULL_TRIM));
  createTrimControl(detailCanvas, {
    trimOf: () => (store.isPadLoaded(store.currentPad()) ? trimWindow(store.currentPad()) : null),
    onTrimBegin: applyTrim(store.editPad),
    onTrimContinue: applyTrim(store.continuePadEdit),
    onScrub: (sourceRatio) => togglePlayback(selectedPadIndex(), sourceRatio),
  });
}

function buildSelectors() {
  chopCount.replaceChildren(...CHOP_SLICE_COUNTS.map((count) => new Option(String(count), String(count))));
  chopCount.value = String(CHOP_SLICE_COUNTS[2]);
}

async function restoreDestination() {
  const handle = await loadDestinationHandle();
  if (!handle) return;
  destination = handle;
  destinationNeedsPermission = !(await usb.hasPermission(handle));
  renderDestination();
}

function switchBank(bankId) {
  if (store.getState().currentBankId === bankId) return;
  stop();
  store.selectBank(bankId);
}

function buildBankNav() {
  bankNav.replaceChildren(...BANK_IDS.map((bankId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--bank';
    button.textContent = bankId;
    button.title = `Bank ${bankId}`;
    button.addEventListener('click', () => switchBank(bankId));
    bankButtons.set(bankId, button);
    return button;
  }));
}

function bindGlobalControls() {
  bankMonoInput.addEventListener('change', () => store.setForceMono(bankMonoInput.checked));
  destinationButton.addEventListener('click', () => (destinationNeedsPermission ? ensureDestination() : chooseDestination()));
  undoButton.addEventListener('click', store.undo);
  redoButton.addEventListener('click', store.redo);
  document.getElementById('write-usb').addEventListener('click', writeToDestination);
  document.getElementById('build-kit').addEventListener('click', openKitDialog);
  document.getElementById('save-preset').addEventListener('click', savePreset);
  document.getElementById('load-preset').addEventListener('click', loadPreset);
  document.getElementById('clear-bank').addEventListener('click', () => {
    stop();
    store.clearCurrentBank();
  });
  chopDialog.addEventListener('close', () => {
    if (chopDialog.returnValue === 'chop') applyChop();
    if (chopDialog.returnValue === 'unchop') revertChop();
  });
  window.addEventListener('resize', refresh);
  window.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
  });
}

async function primeOfflineCache() {
  const worker = (await navigator.serviceWorker.ready).active;
  if (!worker) return;
  const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
  const extras = OFFLINE_EXTRA_ASSETS.map((asset) => new URL(asset, window.location.href).href);
  worker.postMessage({ type: 'cache-urls', urls: [window.location.href, ...loaded, ...extras] });
}

function whenFullyLoaded(callback) {
  if (document.readyState === 'complete') callback();
  else window.addEventListener('load', callback, { once: true });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(
    () => whenFullyLoaded(() => primeOfflineCache().catch(reportFailure)),
    () => showToast('Offline mode unavailable: the service worker could not be registered', 'error'),
  );
}

function start() {
  document.documentElement.dataset.booted = 'true';
  if (!usb.isSupported()) {
    showToast('Unsupported browser: open this page in Chrome, Edge or Brave', 'error');
  }
  buildSelectors();
  buildBankNav();
  buildPads();
  kitDialog = createKitDialog({ onBuilt: applyKit });
  bindGlobalControls();
  bindTrimControl();
  store.subscribe(render);
  renderDestination();
  registerServiceWorker();
  restoreDestination().catch(reportFailure);
}

start();
