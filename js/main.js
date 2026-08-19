import { BANK_IDS, CHOP_SLICE_COUNTS, IMPORT_FOLDER_NAME, PADS_PER_BANK } from './constants.js';
import { formatBytes, formatSeconds } from './format.js';
import { chopPad } from './audio/chop.js';
import { decodeWavFile } from './audio/decode.js';
import { padMetrics, renderPad } from './audio/process.js';
import { play, playingPadIndex, progress, stop } from './audio/player.js';
import { encodeWav } from './audio/wav.js';
import * as store from './state.js';
import * as usb from './fs/usb.js';
import { loadDestinationHandle, saveDestinationHandle } from './fs/handleStore.js';
import { createPadView } from './ui/pad.js';
import { drawWaveform, positionFromPointer, waveColor } from './ui/waveform.js';

const TOAST_DURATION_MS = 4000;
const OFFLINE_EXTRA_ASSETS = ['manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
const WAV_PICKER_OPTIONS = {
  multiple: false,
  types: [{ description: 'WAV sample', accept: { 'audio/wav': ['.wav'] } }],
};

const grid = document.getElementById('pad-grid');
const bankSelect = document.getElementById('bank-select');
const bankMonoInput = document.getElementById('bank-mono');
const destinationLabel = document.getElementById('destination-path');
const destinationButton = document.getElementById('choose-destination');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const bankSizeNode = document.getElementById('bank-size');
const totalSizeNode = document.getElementById('total-size');
const warningList = document.getElementById('warnings');
const detailName = document.getElementById('detail-name');
const detailLength = document.getElementById('detail-length');
const detailCanvas = document.getElementById('detail-wave');
const chopDialog = document.getElementById('chop-dialog');
const chopTarget = document.getElementById('chop-target');
const chopCount = document.getElementById('chop-count');
const chopMode = document.getElementById('chop-mode');
const toast = document.getElementById('toast');

let destination = null;
let destinationNeedsPermission = false;
let playbackFrame = null;
let toastTimer = null;
const padViews = [];

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
  if (!destination) return 'no USB key selected';
  return `${destination.name}/${IMPORT_FOLDER_NAME}`;
}

function renderDestination() {
  destinationLabel.textContent = destinationText();
  destinationLabel.classList.toggle('path--set', destination !== null && !destinationNeedsPermission);
  destinationButton.textContent = destinationNeedsPermission ? 'Re-authorize' : 'Choose…';
}

function bankBytes(bank) {
  return bank.pads
    .filter(store.isPadLoaded)
    .reduce((total, pad) => total + padMetrics(pad, bank.forceMono).bytes, 0);
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

function renderStorage(state) {
  const bank = store.currentBank();
  bankSizeNode.textContent = formatBytes(bankBytes(bank));
  totalSizeNode.textContent = formatBytes(BANK_IDS.reduce((total, bankId) => total + bankBytes(state.banks[bankId]), 0));
  warningList.replaceChildren(...truncationWarnings(bank).map((text) => {
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

  detailName.textContent = isLoaded ? pad.name : 'No sample on this pad';
  detailLength.textContent = isLoaded
    ? `${formatSeconds(metrics.seconds)} — memory ${formatSeconds(metrics.maxSeconds)} — ${formatBytes(metrics.bytes)}`
    : '';

  drawWaveform(detailCanvas, {
    peaks: pad.peaks,
    color: waveColor(isLoaded),
    overflowStart: metrics?.isTruncated ? metrics.maxSeconds / metrics.seconds : null,
    playhead: playingPadIndex() === store.getState().selectedPadIndex ? playhead : null,
    sliceCount: pad.sliceCount,
  });
}

function render(state) {
  const bank = store.currentBank();
  const playhead = progress();
  bankSelect.value = state.currentBankId;
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

  renderStorage(state);
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

async function togglePlayback(padIndex, offsetRatio) {
  const bank = store.currentBank();
  const pad = bank.pads[padIndex];
  if (!store.isPadLoaded(pad)) return;
  if (playingPadIndex() === padIndex && offsetRatio === 0) {
    stop();
    stopPlayheadLoop();
    refresh();
    return;
  }
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
    store.editPad(padIndex, {
      name: chopped.name,
      source: chopped.source,
      peaks: chopped.peaks,
      sliceCount: chopped.sliceCount,
      pitchCents: 0,
    });
    showToast(`${chopped.sliceCount} slices on PAD ${padIndex + 1}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
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
      });
    }
  }
  return pads;
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
    showToast(`${pads.length} pads written to ${destinationText()}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

async function readFromDestination() {
  const folder = await ensureDestination();
  if (!folder) return;
  try {
    const pads = await usb.readPads(folder);
    if (pads.length === 0) {
      showToast(`No sample in ${destinationText()}`, 'error');
      return;
    }
    const loadedPadsByBank = Object.fromEntries(BANK_IDS.map((bankId) => [bankId, []]));
    for (const pad of pads) {
      loadedPadsByBank[pad.bankId].push([pad.padIndex, await decodeWavFile(await pad.handle.getFile())]);
    }
    store.replaceAllBanks(loadedPadsByBank);
    showToast(`${pads.length} pads read back from ${destinationText()}`, 'done');
  } catch (error) {
    reportFailure(error);
  }
}

async function wipeImportFolder() {
  const folder = await ensureDestination();
  if (!folder) return;
  try {
    const files = await usb.listPadFiles(folder);
    if (files.length === 0) {
      showToast(`${destinationText()} is already empty`);
      return;
    }
    if (!window.confirm(`Permanently delete ${files.length} files from ${destinationText()}?`)) return;
    await usb.removeFiles(files);
    showToast(`${files.length} files deleted`, 'done');
  } catch (error) {
    reportFailure(error);
  }
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

function buildSelectors() {
  bankSelect.replaceChildren(...BANK_IDS.map((bankId) => new Option(bankId, bankId)));
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

function bindGlobalControls() {
  bankSelect.addEventListener('change', () => {
    stop();
    store.selectBank(bankSelect.value);
  });
  bankMonoInput.addEventListener('change', () => store.setForceMono(bankMonoInput.checked));
  destinationButton.addEventListener('click', () => (destinationNeedsPermission ? ensureDestination() : chooseDestination()));
  undoButton.addEventListener('click', store.undo);
  redoButton.addEventListener('click', store.redo);
  document.getElementById('write-usb').addEventListener('click', writeToDestination);
  document.getElementById('read-usb').addEventListener('click', readFromDestination);
  document.getElementById('clear-bank').addEventListener('click', () => {
    stop();
    store.clearCurrentBank();
  });
  document.getElementById('wipe-import').addEventListener('click', wipeImportFolder);
  detailCanvas.addEventListener('click', (event) => {
    togglePlayback(store.getState().selectedPadIndex, positionFromPointer(detailCanvas, event));
  });
  chopDialog.addEventListener('close', () => {
    if (chopDialog.returnValue === 'chop') applyChop();
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
  buildPads();
  bindGlobalControls();
  store.subscribe(render);
  renderDestination();
  registerServiceWorker();
  restoreDestination().catch(reportFailure);
}

start();
