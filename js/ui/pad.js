import { SAMPLE_RATES } from '../constants.js';
import { formatPadNumber, formatSeconds } from '../format.js';
import { canNormalize } from '../audio/normalize.js';
import { padMetrics, trimWindow } from '../audio/process.js';
import { drawWaveform, positionFromPointer, waveColor } from './waveform.js';

const EMPTY_LABEL = 'No sample';

function isSourceMono(pad) {
  return pad.source !== null && pad.source.channels.length === 1;
}

function fillRateOptions(select) {
  for (const rate of SAMPLE_RATES) {
    const option = document.createElement('option');
    option.value = String(rate);
    option.textContent = `${rate} Hz`;
    select.append(option);
  }
}

export function createPadView(padIndex, handlers) {
  const template = document.getElementById('pad-template');
  const element = template.content.firstElementChild.cloneNode(true);

  const nameNode = element.querySelector('.pad__name');
  const canvas = element.querySelector('[data-wave]');
  const rateSelect = element.querySelector('[data-rate]');
  const monoInput = element.querySelector('[data-mono]');
  const playButton = element.querySelector('[data-play]');
  const clearButton = element.querySelector('[data-clear]');
  const normalizeButton = element.querySelector('[data-normalize]');
  const chopButton = element.querySelector('[data-chop]');

  element.querySelector('.pad__id').textContent = formatPadNumber(padIndex);
  fillRateOptions(rateSelect);

  element.addEventListener('pointerdown', () => handlers.onSelect(padIndex));
  element.querySelector('[data-load]').addEventListener('click', () => handlers.onLoad(padIndex));
  playButton.addEventListener('click', () => handlers.onPlay(padIndex, null));
  clearButton.addEventListener('click', () => handlers.onClear(padIndex));
  normalizeButton.addEventListener('click', () => handlers.onNormalize(padIndex));
  chopButton.addEventListener('click', () => handlers.onChop(padIndex));
  canvas.addEventListener('click', (event) => handlers.onPlay(padIndex, positionFromPointer(canvas, event)));

  rateSelect.addEventListener('change', () => handlers.onChange(padIndex, { sampleRate: Number(rateSelect.value) }));
  monoInput.addEventListener('change', () => handlers.onChange(padIndex, { mono: monoInput.checked }));

  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    element.classList.add('is-dropping');
  });
  element.addEventListener('dragleave', () => element.classList.remove('is-dropping'));
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    element.classList.remove('is-dropping');
    const [file] = event.dataTransfer.files;
    if (file) handlers.onDrop(padIndex, file);
  });

  function update({ pad, forceMono, isSelected, isPlaying, playhead }) {
    const isLoaded = pad.source !== null;
    const metrics = isLoaded ? padMetrics(pad, forceMono) : null;

    element.classList.toggle('is-selected', isSelected);
    element.classList.toggle('is-empty', !isLoaded);
    nameNode.textContent = isLoaded ? pad.name : EMPTY_LABEL;
    nameNode.title = isLoaded ? `${pad.name} — ${formatSeconds(metrics.seconds)}` : '';

    rateSelect.value = String(pad.sampleRate);
    rateSelect.disabled = !isLoaded;
    monoInput.checked = isLoaded && metrics.channelCount === 1;
    monoInput.disabled = !isLoaded || forceMono || isSourceMono(pad);

    playButton.disabled = !isLoaded;
    clearButton.disabled = !isLoaded;
    normalizeButton.disabled = !isLoaded || !canNormalize(pad.peaks);
    chopButton.disabled = !isLoaded;
    playButton.classList.toggle('is-playing', isPlaying);

    drawWaveform(canvas, {
      peaks: pad.peaks,
      color: waveColor(isLoaded),
      trim: trimWindow(pad),
      overflowStart: metrics?.isTruncated ? metrics.playedSpan : null,
      playhead: isPlaying ? playhead : null,
      sliceCount: pad.sliceCount,
    });
  }

  return { element, update };
}
