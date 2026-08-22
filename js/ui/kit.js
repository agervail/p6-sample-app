import {
  DEFAULT_SAMPLE_RATE,
  KIT_MIN_SLICE_MS,
  KIT_SLICE_STEP_MS,
  PADS_PER_BANK,
  SAMPLE_RATES,
} from '../constants.js';
import { formatBytes, formatSeconds } from '../format.js';
import {
  MAX_KIT_SOURCES,
  MIN_KIT_SOURCES,
  combineIntoKit,
  kitMetrics,
  maxSectionSeconds,
} from '../audio/combine.js';
import { decodeWavFile } from '../audio/decode.js';
import { drawWaveform, waveColor } from './waveform.js';

const MILLISECONDS_PER_SECOND = 1000;
const WAV_PICKER_OPTIONS = {
  multiple: true,
  types: [{ description: 'WAV samples', accept: { 'audio/wav': ['.wav'] } }],
};

function toKitSource(decoded) {
  return {
    name: decoded.name,
    peaks: decoded.peaks,
    seconds: decoded.source.frames / decoded.source.sampleRate,
    channels: decoded.source.channels,
    sampleRate: decoded.source.sampleRate,
  };
}

export function createKitDialog({ onBuilt }) {
  const dialog = document.getElementById('kit-dialog');
  const dropZone = document.getElementById('kit-drop');
  const list = document.getElementById('kit-list');
  const rowTemplate = document.getElementById('kit-item-template');
  const limitTemplate = document.getElementById('kit-limit-template');
  const limitList = document.getElementById('kit-limits');
  const sliceInput = document.getElementById('kit-slice');
  const rateSelect = document.getElementById('kit-rate');
  const monoInput = document.getElementById('kit-mono');
  const padSelect = document.getElementById('kit-pad');
  const sectionsNode = document.getElementById('kit-sections');
  const lengthNode = document.getElementById('kit-length');
  const sizeNode = document.getElementById('kit-size');
  const messageNode = document.getElementById('kit-message');
  const buildButton = document.getElementById('kit-build');

  const sources = [];
  let sliceIsManual = false;
  let isBusy = false;

  sliceInput.min = String(KIT_MIN_SLICE_MS);
  sliceInput.step = String(KIT_SLICE_STEP_MS);
  sliceInput.value = String(KIT_MIN_SLICE_MS);
  rateSelect.replaceChildren(...SAMPLE_RATES.map((rate) => new Option(`${rate} Hz`, String(rate))));
  rateSelect.value = String(DEFAULT_SAMPLE_RATE);

  function currentOptions() {
    return {
      sliceSeconds: Number(sliceInput.value) / MILLISECONDS_PER_SECOND,
      sampleRate: Number(rateSelect.value),
      mono: monoInput.checked,
    };
  }

  function longestSliceMs() {
    const longest = sources.reduce((peak, source) => Math.max(peak, source.seconds), 0);
    const steps = Math.ceil((longest * MILLISECONDS_PER_SECOND) / KIT_SLICE_STEP_MS);
    return Math.max(KIT_MIN_SLICE_MS, steps * KIT_SLICE_STEP_MS);
  }

  function setMessage(text, kind) {
    messageNode.textContent = text;
    messageNode.className = `kit__message kit__message--${kind}`;
  }

  function moveSource(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= sources.length) return;
    [sources[index], sources[target]] = [sources[target], sources[index]];
    renderAll();
  }

  function removeSource(index) {
    sources.splice(index, 1);
    if (!sliceIsManual) sliceInput.value = String(longestSliceMs());
    renderAll();
  }

  function buildRow(source, index) {
    const element = rowTemplate.content.firstElementChild.cloneNode(true);
    element.querySelector('[data-index]').textContent = String(index + 1);
    element.querySelector('[data-name]').textContent = source.name;
    element.querySelector('[data-length]').textContent = formatSeconds(source.seconds);
    element.querySelector('[data-up]').disabled = index === 0;
    element.querySelector('[data-down]').disabled = index === sources.length - 1;
    element.querySelector('[data-up]').addEventListener('click', () => moveSource(index, -1));
    element.querySelector('[data-down]').addEventListener('click', () => moveSource(index, 1));
    element.querySelector('[data-remove]').addEventListener('click', () => removeSource(index));
    return element;
  }

  function renderSources() {
    const rows = sources.map(buildRow);
    list.replaceChildren(...rows);
    rows.forEach((row, index) => {
      drawWaveform(row.querySelector('[data-wave]'), {
        peaks: sources[index].peaks,
        color: waveColor(true),
      });
    });
  }

  function buildLimit(sampleRate, metrics) {
    const element = limitTemplate.content.firstElementChild.cloneNode(true);
    const ceiling = metrics.sections === null
      ? null
      : maxSectionSeconds({ sections: metrics.sections, channelCount: metrics.channelCount, sampleRate });
    element.classList.toggle('kit__limit--current', sampleRate === Number(rateSelect.value));
    element.classList.toggle('kit__limit--short', ceiling !== null && metrics.sliceSeconds > ceiling);
    element.querySelector('[data-rate]').textContent = `${sampleRate} Hz`;
    element.querySelector('[data-value]').textContent = ceiling === null
      ? '—'
      : `${Math.floor(ceiling * MILLISECONDS_PER_SECOND)} ms`;
    return element;
  }

  function renderLimits(metrics) {
    limitList.replaceChildren(...SAMPLE_RATES.map((sampleRate) => buildLimit(sampleRate, metrics)));
  }

  function renderFigures(metrics) {
    renderLimits(metrics);
    const layout = metrics.channelCount === 1 ? 'mono' : 'stereo';
    sectionsNode.textContent = metrics.sections === null ? '—' : String(metrics.sections);
    lengthNode.textContent = formatSeconds(metrics.seconds);
    sizeNode.textContent = formatBytes(metrics.bytes);
    sizeNode.classList.toggle('figure__value--over', metrics.overflows);

    buildButton.disabled = isBusy || metrics.sections === null || metrics.overflows;
    if (isBusy) return;

    if (sources.length === 0) {
      setMessage('Add the samples that will make up the kit.', 'hint');
      return;
    }
    if (sources.length < MIN_KIT_SOURCES) {
      setMessage(`A kit combines at least ${MIN_KIT_SOURCES} samples — add one more.`, 'hint');
      return;
    }
    if (metrics.sections === null) {
      setMessage(`A kit holds at most ${MAX_KIT_SOURCES} samples — remove ${sources.length - MAX_KIT_SOURCES}.`, 'error');
      return;
    }
    if (metrics.overflows) {
      setMessage(`Over the 512 KB of a pad: ${metrics.sections} × ${formatSeconds(metrics.sliceSeconds)} in ${layout} needs ${formatBytes(metrics.bytes)}. Max section above gives the longest each rate allows.`, 'error');
      return;
    }
    setMessage(`${metrics.sections} sections of ${formatSeconds(metrics.sliceSeconds)} at ${rateSelect.value} Hz ${layout} — set CHOP to ${metrics.sections} on the device.`, 'hint');
  }

  function renderAll() {
    const metrics = kitMetrics(sources, currentOptions());
    renderSources();
    renderFigures(metrics);
  }

  function refreshFigures() {
    renderFigures(kitMetrics(sources, currentOptions()));
  }

  async function addFiles(files) {
    const rejected = [];
    for (const file of files) {
      try {
        sources.push(toKitSource(await decodeWavFile(file)));
      } catch {
        rejected.push(file.name);
      }
    }
    if (!sliceIsManual) sliceInput.value = String(longestSliceMs());
    renderAll();
    if (rejected.length > 0) setMessage(`Not readable as WAV: ${rejected.join(', ')}`, 'error');
  }

  async function pickFiles() {
    try {
      const handles = await window.showOpenFilePicker(WAV_PICKER_OPTIONS);
      await addFiles(await Promise.all(handles.map((handle) => handle.getFile())));
    } catch (error) {
      if (error.name !== 'AbortError') setMessage(error.message, 'error');
    }
  }

  async function build() {
    const padIndex = Number(padSelect.value);
    isBusy = true;
    buildButton.disabled = true;
    setMessage('Combining…', 'hint');
    try {
      const kit = await combineIntoKit(sources, currentOptions());
      sources.length = 0;
      dialog.close();
      onBuilt(padIndex, kit);
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      isBusy = false;
      renderAll();
    }
  }

  document.getElementById('kit-add').addEventListener('click', pickFiles);
  document.getElementById('kit-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('kit-longest').addEventListener('click', () => {
    sliceIsManual = false;
    sliceInput.value = String(longestSliceMs());
    refreshFigures();
  });
  sliceInput.addEventListener('input', () => {
    sliceIsManual = true;
    refreshFigures();
  });
  rateSelect.addEventListener('change', refreshFigures);
  monoInput.addEventListener('change', refreshFigures);
  buildButton.addEventListener('click', build);
  window.addEventListener('resize', () => {
    if (dialog.open) renderAll();
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dropping');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dropping'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dropping');
    addFiles([...event.dataTransfer.files]);
  });

  function open({ padIndex, bankId, forceMono }) {
    padSelect.replaceChildren(...Array.from({ length: PADS_PER_BANK }, (unused, index) => (
      new Option(`Bank ${bankId} — PAD ${index + 1}`, String(index))
    )));
    padSelect.value = String(padIndex);
    if (forceMono) monoInput.checked = true;
    monoInput.disabled = forceMono;
    dialog.showModal();
    renderAll();
  }

  return { open };
}
